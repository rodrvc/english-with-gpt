import { beforeEach, describe, expect, it } from 'vitest';
import type { Evaluation } from '@english-practice/shared';
import { openDatabase } from './database.js';
import { ChallengeRepository } from './challengeRepository.js';
import { SessionRepository } from './sessionRepository.js';
import { CHALLENGE_SEED } from './seed.js';

function evaluation(score: number, passed = false): Evaluation {
  return {
    score,
    breakdown: { grammar: score, vocabulary: score, coherence: score, register: score },
    corrections: [],
    tips: [],
    summary: '',
    passed,
    model: 'test',
    rubricVersion: 'test',
    discardedCorrections: 0,
  };
}

describe('repositorios', () => {
  let challenges: ChallengeRepository;
  let sessions: SessionRepository;

  beforeEach(() => {
    const db = openDatabase(':memory:');
    challenges = new ChallengeRepository(db);
    challenges.upsertMany(CHALLENGE_SEED);
    sessions = new SessionRepository(db, challenges);
  });

  it('la semilla tiene al menos 8 desafíos y cubre los contextos requeridos', () => {
    expect(CHALLENGE_SEED.length).toBeGreaterThanOrEqual(8);
    const contexts = new Set(CHALLENGE_SEED.map((c) => c.context));
    for (const ctx of ['work_email', 'friend_letter', 'instructions', 'complaint', 'other']) {
      expect(contexts.has(ctx as never)).toBe(true);
    }
    expect(new Set(CHALLENGE_SEED.map((c) => c.level)).size).toBeGreaterThan(2);
  });

  it('el filtrado devuelve solo coincidencias', () => {
    const all = challenges.list();
    expect(all).toHaveLength(CHALLENGE_SEED.length);
    const b1 = challenges.list({ level: 'B1' });
    expect(b1.length).toBeGreaterThan(0);
    expect(b1.every((c) => c.level === 'B1')).toBe(true);
    const complaints = challenges.list({ context: 'complaint' });
    expect(complaints.every((c) => c.context === 'complaint')).toBe(true);
    const both = challenges.list({ level: 'B1', context: 'complaint' });
    expect(both.every((c) => c.level === 'B1' && c.context === 'complaint')).toBe(true);
    expect(challenges.list({ level: 'C2' })).toHaveLength(0);
  });

  it('la semilla es idempotente', () => {
    challenges.upsertMany(CHALLENGE_SEED);
    expect(challenges.list()).toHaveLength(CHALLENGE_SEED.length);
  });

  it('numera intentos consecutivamente y calcula el delta', () => {
    const session = sessions.create(CHALLENGE_SEED[0]!);
    expect(session.attempts).toHaveLength(0);
    const a1 = sessions.addAttempt(session.id, 'one', evaluation(60));
    const a2 = sessions.addAttempt(session.id, 'two', evaluation(74));
    const a3 = sessions.addAttempt(session.id, 'three', evaluation(70));
    expect([a1.number, a2.number, a3.number]).toEqual([1, 2, 3]);
    expect(a1.scoreDelta).toBeNull();
    expect(a2.scoreDelta).toBe(14);
    expect(a3.scoreDelta).toBe(-4);

    const loaded = sessions.findById(session.id)!;
    expect(loaded.attempts.map((a) => a.number)).toEqual([1, 2, 3]);
    expect(loaded.attempts[1]!.text).toBe('two');
    expect(loaded.status).toBe('active');
  });

  it('la numeración es independiente por sesión', () => {
    const s1 = sessions.create(CHALLENGE_SEED[0]!);
    const s2 = sessions.create(CHALLENGE_SEED[1]!);
    sessions.addAttempt(s1.id, 'a', evaluation(50));
    sessions.addAttempt(s1.id, 'b', evaluation(50));
    const first = sessions.addAttempt(s2.id, 'c', evaluation(50));
    expect(first.number).toBe(1);
  });

  it('marca la sesión como aprobada cuando el intento aprueba', () => {
    const session = sessions.create(CHALLENGE_SEED[0]!);
    sessions.addAttempt(session.id, 'x', evaluation(90, true));
    expect(sessions.findById(session.id)!.status).toBe('passed');
  });

  it('exporta intentos filtrando por fecha', () => {
    const session = sessions.create(CHALLENGE_SEED[0]!);
    sessions.addAttempt(session.id, 'x', evaluation(50), new Date('2026-01-01T00:00:00Z'));
    sessions.addAttempt(session.id, 'y', evaluation(60), new Date('2026-02-01T00:00:00Z'));
    expect(sessions.exportAttempts()).toHaveLength(2);
    const filtered = sessions.exportAttempts('2026-01-15T00:00:00Z');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.attemptNumber).toBe(2);
    expect(filtered[0]!.challengeContext).toBe('work_email');
  });
});
