import { z } from 'zod';

/** Niveles del Marco Común Europeo de Referencia. */
export const CefrLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export type CefrLevel = z.infer<typeof CefrLevelSchema>;

/** Contexto comunicativo del desafío. */
export const ChallengeContextSchema = z.enum([
  'work_email',
  'friend_letter',
  'instructions',
  'complaint',
  'other',
]);
export type ChallengeContext = z.infer<typeof ChallengeContextSchema>;

export const RegisterSchema = z.enum(['formal', 'informal']);
export type Register = z.infer<typeof RegisterSchema>;

/** Categorías de corrección fijadas por la spec writing-evaluation. */
export const CorrectionCategorySchema = z.enum([
  'spelling',
  'grammar',
  'agreement',
  'punctuation',
  'vocabulary',
  'register',
  'coherence',
]);
export type CorrectionCategory = z.infer<typeof CorrectionCategorySchema>;

export const SeveritySchema = z.enum(['error', 'style']);
export type Severity = z.infer<typeof SeveritySchema>;

/**
 * Severidad fijada por categoría. `vocabulary` no está fijada por la spec:
 * una palabra incorrecta es un error, una elección poco natural es estilo,
 * así que en ese caso se respeta la severidad que declare el evaluador.
 */
const FIXED_SEVERITY: Partial<Record<CorrectionCategory, Severity>> = {
  spelling: 'error',
  grammar: 'error',
  agreement: 'error',
  punctuation: 'error',
  register: 'style',
  coherence: 'style',
};

/**
 * Deriva la severidad autoritativa de una corrección a partir de su categoría.
 * Nunca se confía en la severidad que devuelve el modelo para las categorías fijadas.
 */
export function severityForCategory(category: CorrectionCategory, declared: Severity): Severity {
  return FIXED_SEVERITY[category] ?? declared;
}

/** Umbral de aprobación (puntaje global ≥ umbral y cero correcciones `error`). */
export const PASS_THRESHOLD = 85;

/** Etiquetas en español para la UI. */
export const CATEGORY_LABELS: Record<CorrectionCategory, string> = {
  spelling: 'Ortografía',
  grammar: 'Gramática',
  agreement: 'Concordancia',
  punctuation: 'Puntuación',
  vocabulary: 'Vocabulario',
  register: 'Registro',
  coherence: 'Coherencia',
};

export const CONTEXT_LABELS: Record<ChallengeContext, string> = {
  work_email: 'Email laboral',
  friend_letter: 'Carta a un amigo',
  instructions: 'Instrucciones',
  complaint: 'Reclamo',
  other: 'Otro',
};

export const REGISTER_LABELS: Record<Register, string> = {
  formal: 'Formal',
  informal: 'Informal',
};
