import type { CorrectionCategory } from '@english-practice/shared';

/**
 * Un hecho que el motor de seguimiento cuenta: en esta fecha, sobre este
 * objetivo, la respuesta fue correcta o incorrecta. Inmutable por contrato.
 */
export interface ProgressAttempt {
  /** Identificador estable del intento. Repetirlo es un no-op en el motor. */
  attemptId: string;
  objectiveId: string;
  correct: boolean;
  at: string;
  note?: string;
}

/**
 * Frontera con el motor de seguimiento. Writing decide si una respuesta fue
 * correcta; el motor solo lleva la cuenta. Que sea un puerto permite que el
 * motor esté caído sin que la evaluación deje de funcionar.
 */
export interface ProgressTracker {
  record(attempts: ProgressAttempt[]): Promise<void>;
}

/** Implementación inerte: el motor no está configurado. */
export const noopTracker: ProgressTracker = {
  async record(): Promise<void> {},
};

/**
 * El objetivo es la categoría de corrección. Es un identificador estable: si
 * cambia, el motor pierde el hilo del historial, porque `objective_id` es la
 * clave de los intentos.
 */
export function objectiveFor(category: CorrectionCategory): string {
  return `writing-${category}`;
}

/** Las categorías que el motor sigue como objetivos. */
export const TRACKED_CATEGORIES = [
  'spelling',
  'grammar',
  'agreement',
  'punctuation',
  'vocabulary',
  'register',
  'coherence',
] as const satisfies readonly CorrectionCategory[];
