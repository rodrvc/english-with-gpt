import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { ProviderEvaluationOutput } from '@english-practice/shared';
import { createApp } from './app.js';
import { ChallengeRepository } from './db/challengeRepository.js';
import { openDatabase } from './db/database.js';
import { CHALLENGE_SEED } from './db/seed.js';
import { SessionRepository } from './db/sessionRepository.js';
import { Evaluator } from './evaluation/evaluator.js';
import { ProviderUnavailableError, type EvaluationProvider } from './evaluation/provider.js';
import { silentLogger } from './logger.js';
import { loadConfig } from './config.js';

const ORIGIN = 'http://localhost:5173';

class ScriptedProvider implements EvaluationProvider {
  readonly model = 'scripted-model';
  calls = 0;
  queue: Array<ProviderEvaluationOutput | Error> = [];
  async complete(): Promise<unknown> {
    this.calls++;
    const next = this.queue.shift();
    if (!next) throw new Error('sin respuesta programada');
    if (next instanceof Error) throw next;
    return next;
  }
}

function evaluationFor(text: string, opts: { score?: number; withError?: boolean } = {}): ProviderEvaluationOutput {
  const corrections: ProviderEvaluationOutput['corrections'] = [];
  if (opts.withError) {
    const s = text.indexOf('writting');
    corrections.push({
      category: 'spelling',
      severity: 'error',
      start: s,
      end: s + 8,
      original: 'writting',
      suggestion: 'writing',
      explanation: 'Una sola t.',
    });
  }
  return {
    score: opts.score ?? 70,
    breakdown: { grammar: opts.score ?? 70, vocabulary: opts.score ?? 70, coherence: opts.score ?? 70, register: opts.score ?? 70 },
    corrections,
    tips: [{ title: 'Siguiente paso', body: 'Corrige y reenvía.' }],
    summary: 'Resumen.',
  };
}

describe('API HTTP', () => {
  let app: Express;
  let provider: ScriptedProvider;

  beforeEach(() => {
    const db = openDatabase(':memory:');
    const challenges = new ChallengeRepository(db);
    challenges.upsertMany(CHALLENGE_SEED);
    const sessions = new SessionRepository(db, challenges);
    provider = new ScriptedProvider();
    app = createApp({
      challenges,
      sessions,
      evaluator: new Evaluator(provider, silentLogger, { maxAttempts: 2 }),
      maxTextLength: 200,
      evaluationAvailable: true,
      rateLimit: { max: 3, windowSeconds: 60 },
      allowedOrigins: [ORIGIN],
      logger: silentLogger,
    });
  });

  async function startSession(challengeId = 'work-email-time-off-b1') {
    const res = await request(app).post('/api/v1/sessions').send({ challengeId });
    expect(res.status).toBe(201);
    return res.body.session as { id: string };
  }

  it('GET /health informa disponibilidad sin revelar configuración', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', evaluationAvailable: true, version: 'v1' });
    expect(JSON.stringify(res.body)).not.toMatch(/sk-/);
  });

  it('rutas sin prefijo de versión responden 404 con formato uniforme', async () => {
    const res = await request(app).get('/challenges');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /challenges lista y filtra', async () => {
    const all = await request(app).get('/api/v1/challenges');
    expect(all.body.challenges).toHaveLength(CHALLENGE_SEED.length);
    const b1 = await request(app).get('/api/v1/challenges?level=B1&context=complaint');
    expect(b1.body.challenges.length).toBeGreaterThan(0);
    for (const c of b1.body.challenges) {
      expect(c.level).toBe('B1');
      expect(c.context).toBe('complaint');
    }
    const bad = await request(app).get('/api/v1/challenges?level=Z9');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    expect(bad.body.error.details[0].path).toBe('level');
  });

  it('GET /challenges/:id devuelve el desafío o 404', async () => {
    const ok = await request(app).get('/api/v1/challenges/work-email-time-off-b1');
    expect(ok.status).toBe(200);
    expect(ok.body.challenge.id).toBe('work-email-time-off-b1');
    const missing = await request(app).get('/api/v1/challenges/nope');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /sessions/:id/restart-timer mueve el inicio a ahora y conserva los intentos', async () => {
    const created = await request(app).post('/api/v1/sessions').send({ challengeId: 'work-email-time-off-b1' });
    const id = created.body.session.id;
    const before = created.body.session.startedAt;

    const text = 'I am writting to you about the meeting.';
    provider.queue.push(evaluationFor(text, { score: 70, withError: true }));
    await request(app).post(`/api/v1/sessions/${id}/attempts`).send({ text });

    const restarted = await request(app).post(`/api/v1/sessions/${id}/restart-timer`);
    expect(restarted.status).toBe(200);
    expect(new Date(restarted.body.session.startedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    expect(restarted.body.session.attempts).toHaveLength(1);

    const missing = await request(app).post('/api/v1/sessions/nope/restart-timer');
    expect(missing.status).toBe(404);
  });

  it('GET /challenges/:id/example valida el desafío antes de necesitar el generador', async () => {
    // Sin generador configurado la ruta no puede servir el ejemplo, pero un
    // desafío inexistente sigue siendo un 404 del cliente, no un 503.
    const missing = await request(app).get('/api/v1/challenges/nope/example');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');

    const unavailable = await request(app).get('/api/v1/challenges/work-email-time-off-b1/example');
    expect(unavailable.status).toBe(503);
    expect(unavailable.body.error.code).toBe('EVALUATION_UNAVAILABLE');
  });

  it('POST /sessions crea con desafío explícito, al azar con filtros, y rechaza inexistentes', async () => {
    const explicit = await request(app).post('/api/v1/sessions').send({ challengeId: 'complaint-product-b1' });
    expect(explicit.status).toBe(201);
    expect(explicit.body.session.status).toBe('active');
    expect(explicit.body.session.challenge.id).toBe('complaint-product-b1');
    expect(explicit.body.session.attempts).toEqual([]);

    const random = await request(app).post('/api/v1/sessions').send({ level: 'A2' });
    expect(random.status).toBe(201);
    expect(random.body.session.challenge.level).toBe('A2');

    const missing = await request(app).post('/api/v1/sessions').send({ challengeId: 'nope' });
    expect(missing.status).toBe(404);

    const noMatch = await request(app).post('/api/v1/sessions').send({ level: 'C2' });
    expect(noMatch.status).toBe(404);

    const invalid = await request(app).post('/api/v1/sessions').send({ level: 'X' });
    expect(invalid.status).toBe(400);
  });

  it('GET /sessions/:id devuelve 404 si no existe', async () => {
    const res = await request(app).get('/api/v1/sessions/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /sessions/:id/attempts evalúa, numera, calcula delta y aprueba', async () => {
    const session = await startSession();
    const text1 = 'I am writting to you to request some days off.';
    provider.queue.push(evaluationFor(text1, { score: 70, withError: true }));
    const first = await request(app).post(`/api/v1/sessions/${session.id}/attempts`).send({ text: text1 });
    expect(first.status).toBe(201);
    expect(first.body.attempt.number).toBe(1);
    expect(first.body.attempt.scoreDelta).toBeNull();
    expect(first.body.attempt.text).toBe(text1);
    expect(first.body.attempt.evaluation.passed).toBe(false);
    expect(first.body.attempt.evaluation.corrections).toHaveLength(1);
    const c = first.body.attempt.evaluation.corrections[0];
    expect(text1.slice(c.start, c.end)).toBe('writting');
    expect(first.body.attempt.evaluation.model).toBe('scripted-model');
    expect(first.body.attempt.evaluation.rubricVersion).toBeTruthy();
    expect(first.body.session.status).toBe('active');

    const text2 = 'I am writing to you to request some days off.';
    provider.queue.push(evaluationFor(text2, { score: 90 }));
    const second = await request(app).post(`/api/v1/sessions/${session.id}/attempts`).send({ text: text2 });
    expect(second.status).toBe(201);
    expect(second.body.attempt.number).toBe(2);
    expect(second.body.attempt.scoreDelta).toBe(20);
    expect(second.body.attempt.evaluation.passed).toBe(true);
    expect(second.body.session.status).toBe('passed');

    const loaded = await request(app).get(`/api/v1/sessions/${session.id}`);
    expect(loaded.body.session.attempts.map((a: { number: number }) => a.number)).toEqual([1, 2]);
    expect(loaded.body.session.attempts[0].text).toBe(text1);

    const closed = await request(app).post(`/api/v1/sessions/${session.id}/attempts`).send({ text: text2 });
    expect(closed.status).toBe(409);
    expect(closed.body.error.code).toBe('SESSION_CLOSED');
    expect(provider.calls).toBe(2);
  });

  it('rechaza texto vacío sin invocar al proveedor', async () => {
    const session = await startSession();
    const res = await request(app).post(`/api/v1/sessions/${session.id}/attempts`).send({ text: '   \n ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe('text');
    expect(provider.calls).toBe(0);
  });

  it('rechaza campo requerido ausente nombrándolo', async () => {
    const session = await startSession();
    const res = await request(app).post(`/api/v1/sessions/${session.id}/attempts`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('text');
    expect(provider.calls).toBe(0);
  });

  it('rechaza texto sobredimensionado sin invocar al proveedor', async () => {
    const session = await startSession();
    const res = await request(app)
      .post(`/api/v1/sessions/${session.id}/attempts`)
      .send({ text: 'x'.repeat(201) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(provider.calls).toBe(0);
  });

  it('rechaza intentos sobre sesión inexistente', async () => {
    const res = await request(app).post('/api/v1/sessions/nope/attempts').send({ text: 'hello' });
    expect(res.status).toBe(404);
    expect(provider.calls).toBe(0);
  });

  it('aplica límite de tasa informando el tiempo de reintento sin invocar al proveedor', async () => {
    const session = await startSession();
    for (let i = 0; i < 3; i++) {
      provider.queue.push(evaluationFor('hello', { score: 50 }));
      const ok = await request(app).post(`/api/v1/sessions/${session.id}/attempts`).send({ text: 'hello' });
      expect(ok.status).toBe(201);
    }
    const limited = await request(app).post(`/api/v1/sessions/${session.id}/attempts`).send({ text: 'hello' });
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect(limited.body.error.retryAfterSeconds).toBeGreaterThan(0);
    expect(limited.headers['retry-after']).toBeDefined();
    expect(provider.calls).toBe(3);
  });

  it('distingue fallo del proveedor y evaluación no disponible', async () => {
    const session = await startSession();
    provider.queue.push(new ProviderUnavailableError('El proveedor de IA devolvió un error de servicio', 500));
    const down = await request(app).post(`/api/v1/sessions/${session.id}/attempts`).send({ text: 'hello' });
    expect(down.status).toBe(502);
    expect(down.body.error.code).toBe('PROVIDER_ERROR');

    provider.queue.push({ ...evaluationFor('hello'), score: 999 });
    provider.queue.push({ ...evaluationFor('hello'), score: -1 });
    const invalid = await request(app).post(`/api/v1/sessions/${session.id}/attempts`).send({ text: 'hello' });
    expect(invalid.status).toBe(503);
    expect(invalid.body.error.code).toBe('EVALUATION_UNAVAILABLE');

    const loaded = await request(app).get(`/api/v1/sessions/${session.id}`);
    expect(loaded.body.session.attempts).toHaveLength(0);
  });

  it('no filtra la credencial en errores del proveedor', async () => {
    const session = await startSession();
    provider.queue.push(new ProviderUnavailableError('El servidor no pudo autenticarse con el proveedor de IA', 401));
    const res = await request(app).post(`/api/v1/sessions/${session.id}/attempts`).send({ text: 'hello' });
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('test-key-not-real');
    expect(JSON.stringify(res.body)).not.toMatch(/sk-/);
  });

  it('GET /export/attempts devuelve el formato estable con filtro por fechas', async () => {
    const session = await startSession();
    provider.queue.push(evaluationFor('I am writting', { withError: true }));
    await request(app).post(`/api/v1/sessions/${session.id}/attempts`).send({ text: 'I am writting' });
    const res = await request(app).get('/api/v1/export/attempts');
    expect(res.status).toBe(200);
    expect(res.body.format).toBe('english-practice.attempts.v1');
    expect(res.body.attempts).toHaveLength(1);
    expect(res.body.attempts[0]).toMatchObject({
      sessionId: session.id,
      challengeId: 'work-email-time-off-b1',
      attemptNumber: 1,
      score: 70,
      correctionsByCategory: { spelling: 1 },
      model: 'scripted-model',
    });
    const future = await request(app).get('/api/v1/export/attempts?from=2999-01-01T00:00:00Z');
    expect(future.body.attempts).toHaveLength(0);
    const bad = await request(app).get('/api/v1/export/attempts?from=ayer');
    expect(bad.status).toBe(400);
  });

  it('CORS autoriza solo los orígenes configurados', async () => {
    const allowed = await request(app).get('/api/v1/health').set('Origin', ORIGIN);
    expect(allowed.headers['access-control-allow-origin']).toBe(ORIGIN);
    const denied = await request(app).get('/api/v1/health').set('Origin', 'http://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('GET /contract describe cada operación con sus esquemas', async () => {
    const res = await request(app).get('/api/v1/contract');
    expect(res.status).toBe(200);
    const ids = res.body.operations.map((o: { id: string }) => o.id);
    expect(ids).toEqual(expect.arrayContaining(['health', 'listChallenges', 'getChallenge', 'createSession', 'getSession', 'submitAttempt', 'exportAttempts']));
    const submit = res.body.operations.find((o: { id: string }) => o.id === 'submitAttempt');
    expect(submit.body.properties.text).toBeDefined();
    expect(submit.response.properties.attempt).toBeDefined();
    expect(res.body.errorResponse.properties.error).toBeDefined();
  });

  it('cuerpo JSON malformado responde 400 uniforme', async () => {
    const res = await request(app).post('/api/v1/sessions').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('loadConfig', () => {
  it('falla sin credencial nombrando la variable y sin valores', () => {
    expect(() => loadConfig({})).toThrow(/OPENAI_API_KEY/);
    expect(() => loadConfig({ OPENAI_API_KEY: '' })).toThrow(/OPENAI_API_KEY/);
  });

  it('carga valores por defecto y separa orígenes', () => {
    const cfg = loadConfig({ OPENAI_API_KEY: 'k', WEB_ORIGIN: 'http://a, http://b' });
    expect(cfg.webOrigins).toEqual(['http://a', 'http://b']);
    expect(cfg.maxTextLength).toBe(4000);
  });
});
