import { Router, type Request } from 'express';
import rateLimit, { type RateLimitInfo } from 'express-rate-limit';
import {
  API_VERSION,
  CreateSessionRequestSchema,
  ExportQuerySchema,
  ListChallengesQuerySchema,
  SubmitAttemptRequestSchema,
  describeContract,
  type ChallengeExampleResponse,
  type ExportResponse,
  type GetChallengeResponse,
  type HealthResponse,
  type ListChallengesResponse,
  type SessionResponse,
  type SubmitAttemptResponse,
} from '@english-practice/shared';
import type { ChallengeRepository } from '../db/challengeRepository.js';
import type { SessionRepository } from '../db/sessionRepository.js';
import { AppError, evaluationUnavailable, notFound, sessionClosed, validation } from '../errors.js';
import type { Evaluator } from '../evaluation/evaluator.js';
import type { ExampleGenerator } from '../evaluation/example.js';
import { parseOrThrow } from './validate.js';

export interface RouteDeps {
  challenges: ChallengeRepository;
  sessions: SessionRepository;
  evaluator: Evaluator;
  /** Ausente cuando no hay credencial: el ejemplo queda no disponible. */
  examples?: ExampleGenerator;
  maxTextLength: number;
  evaluationAvailable: boolean;
  rateLimit: { max: number; windowSeconds: number };
}

function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export function createRouter(deps: RouteDeps): Router {
  const router = Router();
  const contract = describeContract();

  const evaluationLimiter = rateLimit({
    windowMs: deps.rateLimit.windowSeconds * 1000,
    limit: deps.rateLimit.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, _res, next) => {
      const info = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit;
      const resetTime = info?.resetTime;
      const retryAfterSeconds = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : deps.rateLimit.windowSeconds;
      next(
        new AppError(
          429,
          'RATE_LIMITED',
          'Has superado el límite de evaluaciones; espera antes de reintentar',
          undefined,
          retryAfterSeconds,
        ),
      );
    },
  });

  router.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok', evaluationAvailable: deps.evaluationAvailable, version: API_VERSION };
    res.json(body);
  });

  router.get('/contract', (_req, res) => {
    res.json(contract);
  });

  router.get('/challenges', (req, res) => {
    const query = parseOrThrow(ListChallengesQuerySchema, req.query, 'Filtro');
    const body: ListChallengesResponse = { challenges: deps.challenges.list(query) };
    res.json(body);
  });

  router.get('/challenges/:id', (req, res) => {
    const challenge = deps.challenges.findById(param(req, 'id'));
    if (!challenge) throw notFound('El desafío');
    const body: GetChallengeResponse = { challenge };
    res.json(body);
  });

  router.get('/challenges/:id/example', evaluationLimiter, async (req, res) => {
    const challenge = deps.challenges.findById(param(req, 'id'));
    if (!challenge) throw notFound('El desafío');
    if (!deps.examples) throw evaluationUnavailable('El ejemplo no está disponible: falta configurar el proveedor de IA');
    const body: ChallengeExampleResponse = { example: await deps.examples.forChallenge(challenge) };
    res.json(body);
  });

  router.post('/sessions', (req, res) => {
    const input = parseOrThrow(CreateSessionRequestSchema, req.body ?? {}, 'Cuerpo');
    let challenge;
    if (input.challengeId) {
      challenge = deps.challenges.findById(input.challengeId);
      if (!challenge) throw notFound('El desafío');
    } else {
      const filters: { level?: typeof input.level; context?: typeof input.context } = {};
      if (input.level) filters.level = input.level;
      if (input.context) filters.context = input.context;
      const candidates = deps.challenges.list(filters);
      if (candidates.length === 0) throw notFound('Un desafío con esos filtros');
      challenge = candidates[Math.floor(Math.random() * candidates.length)]!;
    }
    const session = deps.sessions.create(challenge);
    const body: SessionResponse = { session };
    res.status(201).json(body);
  });

  router.get('/sessions/:id', (req, res) => {
    const session = deps.sessions.findById(param(req, 'id'));
    if (!session) throw notFound('La sesión');
    const body: SessionResponse = { session };
    res.json(body);
  });

  router.post('/sessions/:id/restart-timer', (req, res) => {
    const id = param(req, 'id');
    const session = deps.sessions.findById(id);
    if (!session) throw notFound('La sesión');
    if (session.status !== 'active') throw sessionClosed();
    const body: SessionResponse = { session: deps.sessions.restartTimer(id)! };
    res.json(body);
  });

  router.post('/sessions/:id/attempts', evaluationLimiter, async (req, res) => {
    const session = deps.sessions.findById(param(req, 'id'));
    if (!session) throw notFound('La sesión');
    if (session.status !== 'active') throw sessionClosed();

    const input = parseOrThrow(SubmitAttemptRequestSchema, req.body ?? {}, 'Cuerpo');
    if (input.text.length > deps.maxTextLength) {
      throw validation(`El texto supera la longitud máxima de ${deps.maxTextLength} caracteres`, [
        { path: 'text', message: `Máximo ${deps.maxTextLength} caracteres` },
      ]);
    }

    const evaluation = await deps.evaluator.evaluate({
      challenge: session.challenge,
      text: input.text,
      previousAttempts: session.attempts,
    });
    const attempt = deps.sessions.addAttempt(session.id, input.text, evaluation);
    const updated = deps.sessions.findById(session.id)!;
    const body: SubmitAttemptResponse = { attempt, session: updated };
    res.status(201).json(body);
  });

  router.get('/export/attempts', (req, res) => {
    const query = parseOrThrow(ExportQuerySchema, req.query, 'Filtro');
    const body: ExportResponse = {
      format: 'english-practice.attempts.v1',
      attempts: deps.sessions.exportAttempts(query.from, query.to),
    };
    res.json(body);
  });

  return router;
}
