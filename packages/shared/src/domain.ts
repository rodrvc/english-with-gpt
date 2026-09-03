import { z } from 'zod';
import {
  CefrLevelSchema,
  ChallengeContextSchema,
  CorrectionCategorySchema,
  RegisterSchema,
  SeveritySchema,
} from './taxonomy.js';

export const ChallengeSchema = z.object({
  id: z.string().min(1),
  context: ChallengeContextSchema,
  /** Consigna en inglés. */
  prompt: z.string().min(1),
  /** Descripción de la tarea para el estudiante (español). */
  description: z.string().min(1),
  level: CefrLevelSchema,
  minWords: z.number().int().min(1),
  maxWords: z.number().int().min(1),
  register: RegisterSchema,
  timeLimitSeconds: z.number().int().min(1),
});
export type Challenge = z.infer<typeof ChallengeSchema>;

const Score = z.number().int().min(0).max(100);

export const ScoreBreakdownSchema = z.object({
  grammar: Score,
  vocabulary: Score,
  coherence: Score,
  register: Score,
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

/**
 * Corrección anclada al texto. `start`/`end` son desplazamientos en unidades
 * de código UTF-16 sobre el texto enviado (semántica de String.prototype.slice).
 */
export const CorrectionSchema = z.object({
  id: z.string().min(1),
  category: CorrectionCategorySchema,
  severity: SeveritySchema,
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  original: z.string().min(1),
  suggestion: z.string().min(1),
  /** Explicación breve en español que justifica la propuesta. */
  explanation: z.string().min(1),
});
export type Correction = z.infer<typeof CorrectionSchema>;

export const TipSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});
export type Tip = z.infer<typeof TipSchema>;

export const EvaluationSchema = z.object({
  score: Score,
  breakdown: ScoreBreakdownSchema,
  corrections: z.array(CorrectionSchema),
  tips: z.array(TipSchema),
  /** Resumen breve en español. */
  summary: z.string(),
  passed: z.boolean(),
  /** Identificador del modelo que evaluó. */
  model: z.string().min(1),
  /** Versión del criterio de evaluación (prompt + reglas). */
  rubricVersion: z.string().min(1),
  /** Correcciones que el servidor descartó por anclaje inválido u otras causas. */
  discardedCorrections: z.number().int().min(0),
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

export const AttemptSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  number: z.number().int().min(1),
  text: z.string(),
  evaluation: EvaluationSchema,
  /** Variación respecto al intento anterior; null en el primero. */
  scoreDelta: z.number().int().nullable(),
  createdAt: z.string().datetime(),
});
export type Attempt = z.infer<typeof AttemptSchema>;

export const SessionStatusSchema = z.enum(['active', 'passed']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSchema = z.object({
  id: z.string().min(1),
  challengeId: z.string().min(1),
  challenge: ChallengeSchema,
  status: SessionStatusSchema,
  startedAt: z.string().datetime(),
  attempts: z.array(AttemptSchema),
});
export type Session = z.infer<typeof SessionSchema>;
