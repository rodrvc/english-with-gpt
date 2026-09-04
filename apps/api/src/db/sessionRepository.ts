import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import {
  EvaluationSchema,
  type Attempt,
  type Challenge,
  type Evaluation,
  type ExportedAttempt,
  type Session,
  type SessionStatus,
} from '@english-practice/shared';
import { ChallengeRepository } from './challengeRepository.js';

interface SessionRow {
  id: string;
  challenge_id: string;
  status: string;
  started_at: string;
}

interface AttemptRow {
  id: string;
  session_id: string;
  number: number;
  text: string;
  evaluation_json: string;
  score: number;
  score_delta: number | null;
  created_at: string;
}

function toAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    sessionId: row.session_id,
    number: row.number,
    text: row.text,
    evaluation: EvaluationSchema.parse(JSON.parse(row.evaluation_json)),
    scoreDelta: row.score_delta,
    createdAt: row.created_at,
  };
}

export class SessionRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly challenges: ChallengeRepository,
  ) {}

  create(challenge: Challenge, now = new Date()): Session {
    const id = randomUUID();
    const startedAt = now.toISOString();
    this.db
      .prepare('INSERT INTO sessions (id, challenge_id, status, started_at) VALUES (?, ?, ?, ?)')
      .run(id, challenge.id, 'active', startedAt);
    return { id, challengeId: challenge.id, challenge, status: 'active', startedAt, attempts: [] };
  }

  /**
   * Reinicia el cronómetro de una sesión activa sin tocar sus intentos.
   *
   * El tiempo del desafío corre en calendario desde `started_at`, así que una
   * sesión retomada al día siguiente aparece agotada aunque el estudiante no
   * haya trabajado en ella. Reiniciar mueve el punto de partida a ahora y
   * conserva el historial, que es lo que alimenta las métricas.
   */
  restartTimer(id: string, now = new Date()): Session | undefined {
    const session = this.findById(id);
    if (!session || session.status !== 'active') return undefined;
    const startedAt = now.toISOString();
    this.db.prepare('UPDATE sessions SET started_at = ? WHERE id = ?').run(startedAt, id);
    return { ...session, startedAt };
  }

  findById(id: string): Session | undefined {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as unknown as SessionRow | undefined;
    if (!row) return undefined;
    const challenge = this.challenges.findById(row.challenge_id);
    if (!challenge) return undefined;
    return {
      id: row.id,
      challengeId: row.challenge_id,
      challenge,
      status: row.status as SessionStatus,
      startedAt: row.started_at,
      attempts: this.listAttempts(id),
    };
  }

  listAttempts(sessionId: string): Attempt[] {
    const rows = this.db
      .prepare('SELECT * FROM attempts WHERE session_id = ? ORDER BY number ASC')
      .all(sessionId) as unknown as AttemptRow[];
    return rows.map(toAttempt);
  }

  /**
   * Persiste un intento con el número siguiente de la sesión y su delta
   * respecto al intento anterior, en una transacción.
   */
  addAttempt(sessionId: string, text: string, evaluation: Evaluation, now = new Date()): Attempt {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const last = this.db
        .prepare('SELECT number, score FROM attempts WHERE session_id = ? ORDER BY number DESC LIMIT 1')
        .get(sessionId) as unknown as { number: number; score: number } | undefined;
      const number = (last?.number ?? 0) + 1;
      const scoreDelta = last ? evaluation.score - last.score : null;
      const attempt: Attempt = {
        id: randomUUID(),
        sessionId,
        number,
        text,
        evaluation,
        scoreDelta,
        createdAt: now.toISOString(),
      };
      this.db
        .prepare(
          `INSERT INTO attempts (id, session_id, number, text, evaluation_json, score, score_delta, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(attempt.id, sessionId, number, text, JSON.stringify(evaluation), evaluation.score, scoreDelta, attempt.createdAt);
      if (evaluation.passed) {
        this.db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run('passed', sessionId);
      }
      this.db.exec('COMMIT');
      return attempt;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  exportAttempts(from?: string, to?: string): ExportedAttempt[] {
    const clauses: string[] = [];
    const params: string[] = [];
    if (from) {
      clauses.push('a.created_at >= ?');
      params.push(from);
    }
    if (to) {
      clauses.push('a.created_at <= ?');
      params.push(to);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db
      .prepare(
        `SELECT a.*, c.id AS challenge_id, c.context AS challenge_context, c.level AS challenge_level
         FROM attempts a
         JOIN sessions s ON s.id = a.session_id
         JOIN challenges c ON c.id = s.challenge_id
         ${where}
         ORDER BY a.created_at ASC, a.number ASC`,
      )
      .all(...params) as unknown as (AttemptRow & {
      challenge_id: string;
      challenge_context: ExportedAttempt['challengeContext'];
      challenge_level: ExportedAttempt['challengeLevel'];
    })[];
    return rows.map((row) => {
      const evaluation = EvaluationSchema.parse(JSON.parse(row.evaluation_json));
      const correctionsByCategory: Record<string, number> = {};
      for (const c of evaluation.corrections) {
        correctionsByCategory[c.category] = (correctionsByCategory[c.category] ?? 0) + 1;
      }
      return {
        sessionId: row.session_id,
        challengeId: row.challenge_id,
        challengeContext: row.challenge_context,
        challengeLevel: row.challenge_level,
        attemptNumber: row.number,
        timestamp: row.created_at,
        score: evaluation.score,
        breakdown: evaluation.breakdown,
        passed: evaluation.passed,
        correctionsByCategory: correctionsByCategory as ExportedAttempt['correctionsByCategory'],
        model: evaluation.model,
        rubricVersion: evaluation.rubricVersion,
      };
    });
  }
}
