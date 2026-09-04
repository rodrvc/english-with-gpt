import { z } from 'zod';
import {
  AttemptSchema,
  ChallengeSchema,
  ScoreBreakdownSchema,
  SessionSchema,
} from './domain.js';
import { CefrLevelSchema, ChallengeContextSchema, CorrectionCategorySchema } from './taxonomy.js';

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// ---------- Errores ----------

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'SESSION_CLOSED',
  'RATE_LIMITED',
  'EVALUATION_UNAVAILABLE',
  'PROVIDER_ERROR',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.array(ErrorDetailSchema).optional(),
    retryAfterSeconds: z.number().int().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ---------- Health ----------

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  evaluationAvailable: z.boolean(),
  version: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ---------- Challenges ----------

export const ListChallengesQuerySchema = z.object({
  level: CefrLevelSchema.optional(),
  context: ChallengeContextSchema.optional(),
});
export type ListChallengesQuery = z.infer<typeof ListChallengesQuerySchema>;

export const ListChallengesResponseSchema = z.object({
  challenges: z.array(ChallengeSchema),
});
export type ListChallengesResponse = z.infer<typeof ListChallengesResponseSchema>;

export const GetChallengeResponseSchema = z.object({ challenge: ChallengeSchema });
export type GetChallengeResponse = z.infer<typeof GetChallengeResponseSchema>;

// ---------- Sessions ----------

export const CreateSessionRequestSchema = z.object({
  challengeId: z.string().min(1).optional(),
  level: CefrLevelSchema.optional(),
  context: ChallengeContextSchema.optional(),
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const SessionResponseSchema = z.object({ session: SessionSchema });
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const SubmitAttemptRequestSchema = z.object({
  text: z.string().refine((t) => t.trim().length > 0, {
    message: 'El texto no puede estar vacío',
  }),
});
export type SubmitAttemptRequest = z.infer<typeof SubmitAttemptRequestSchema>;

export const SubmitAttemptResponseSchema = z.object({
  attempt: AttemptSchema,
  session: SessionSchema,
});
export type SubmitAttemptResponse = z.infer<typeof SubmitAttemptResponseSchema>;

// ---------- Ejemplo de referencia ----------

/**
 * Una frase útil del contexto comunicativo del desafío, con su traducción.
 * El estudiante las reutiliza al redactar; no pertenecen a un texto concreto.
 */
export const UsefulPhraseSchema = z.object({
  phrase: z.string().min(1),
  meaning: z.string().min(1),
  /** Dónde encaja: apertura, desarrollo o cierre. */
  stage: z.enum(['opening', 'body', 'closing']),
});
export type UsefulPhrase = z.infer<typeof UsefulPhraseSchema>;

export const ChallengeExampleSchema = z.object({
  challengeId: z.string(),
  /** Texto modelo completo que resuelve el desafío, en inglés. */
  text: z.string().min(1),
  phrases: z.array(UsefulPhraseSchema),
  model: z.string(),
});
export type ChallengeExample = z.infer<typeof ChallengeExampleSchema>;

export const ChallengeExampleResponseSchema = z.object({ example: ChallengeExampleSchema });
export type ChallengeExampleResponse = z.infer<typeof ChallengeExampleResponseSchema>;

// ---------- Export ----------

export const ExportQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type ExportQuery = z.infer<typeof ExportQuerySchema>;

export const ExportedAttemptSchema = z.object({
  sessionId: z.string(),
  challengeId: z.string(),
  challengeContext: ChallengeContextSchema,
  challengeLevel: CefrLevelSchema,
  attemptNumber: z.number().int().min(1),
  timestamp: z.string().datetime(),
  score: z.number().int().min(0).max(100),
  breakdown: ScoreBreakdownSchema,
  passed: z.boolean(),
  correctionsByCategory: z.record(CorrectionCategorySchema, z.number().int().min(0)),
  model: z.string(),
  rubricVersion: z.string(),
});
export type ExportedAttempt = z.infer<typeof ExportedAttemptSchema>;

export const ExportResponseSchema = z.object({
  format: z.literal('english-practice.attempts.v1'),
  attempts: z.array(ExportedAttemptSchema),
});
export type ExportResponse = z.infer<typeof ExportResponseSchema>;

// ---------- Contrato ----------

export interface OperationDescriptor {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
  query?: z.ZodType;
  body?: z.ZodType;
  response: z.ZodType;
}

export const OPERATIONS: OperationDescriptor[] = [
  {
    id: 'health',
    method: 'GET',
    path: '/health',
    description: 'Estado del servicio y disponibilidad de la evaluación.',
    response: HealthResponseSchema,
  },
  {
    id: 'listChallenges',
    method: 'GET',
    path: '/challenges',
    description: 'Catálogo de desafíos, filtrable por nivel CEFR y contexto.',
    query: ListChallengesQuerySchema,
    response: ListChallengesResponseSchema,
  },
  {
    id: 'getChallenge',
    method: 'GET',
    path: '/challenges/{id}',
    description: 'Un desafío por identificador.',
    response: GetChallengeResponseSchema,
  },
  {
    id: 'createSession',
    method: 'POST',
    path: '/sessions',
    description: 'Inicia una sesión de práctica con un desafío explícito o al azar dentro de filtros.',
    body: CreateSessionRequestSchema,
    response: SessionResponseSchema,
  },
  {
    id: 'getSession',
    method: 'GET',
    path: '/sessions/{id}',
    description: 'Sesión con sus intentos en orden cronológico.',
    response: SessionResponseSchema,
  },
  {
    id: 'submitAttempt',
    method: 'POST',
    path: '/sessions/{id}/attempts',
    description: 'Envía una redacción para evaluación; crea un intento numerado y resuelve la aprobación.',
    body: SubmitAttemptRequestSchema,
    response: SubmitAttemptResponseSchema,
  },
  {
    id: 'exportAttempts',
    method: 'GET',
    path: '/export/attempts',
    description: 'Exportación estable de intentos para el motor de métricas, filtrable por rango de fechas.',
    query: ExportQuerySchema,
    response: ExportResponseSchema,
  },
];

/** Documento de contrato legible por máquina, derivado de los mismos esquemas. */
export function describeContract(): Record<string, unknown> {
  return {
    name: 'english-practice-api',
    version: API_VERSION,
    basePath: API_PREFIX,
    errorResponse: z.toJSONSchema(ErrorResponseSchema),
    operations: OPERATIONS.map((op) => ({
      id: op.id,
      method: op.method,
      path: `${API_PREFIX}${op.path}`,
      description: op.description,
      ...(op.query ? { query: z.toJSONSchema(op.query) } : {}),
      ...(op.body ? { body: z.toJSONSchema(op.body) } : {}),
      response: z.toJSONSchema(op.response),
    })),
  };
}
