import type { Attempt, Evaluation } from '@english-practice/shared';
import { objectiveFor, TRACKED_CATEGORIES, type ProgressAttempt } from './tracker.js';

/**
 * Traduce una evaluación a hechos para el motor: una categoría con al menos
 * una corrección de severidad `error` es un fallo en ese objetivo.
 *
 * Solo se reportan fallos. La ausencia de corrección no es evidencia de
 * acierto: un texto que nunca usó artículos no demuestra dominarlos. Reportar
 * el acierto exige que el evaluador declare qué ejercitó el texto, y eso llega
 * en otro cambio.
 */
export function attemptsFrom(attempt: Attempt, evaluation: Evaluation): ProgressAttempt[] {
  const failed = new Set(
    evaluation.corrections.filter((c) => c.severity === 'error').map((c) => c.category),
  );
  return TRACKED_CATEGORIES.filter((category) => failed.has(category)).map((category) => {
    const count = evaluation.corrections.filter(
      (c) => c.category === category && c.severity === 'error',
    ).length;
    return {
      // Determinista y único por intento, objetivo y signo: reintentar el
      // reporte no duplica el hecho, porque el motor rechaza un `attempt_id`
      // repetido. El signo va en la clave porque un texto puede usar bien una
      // categoría y equivocarla en otra frase: cuando se reporten también los
      // aciertos, ambos hechos coexisten sobre el mismo intento.
      attemptId: `${attempt.id}:${category}:miss`,
      objectiveId: objectiveFor(category),
      correct: false,
      at: attempt.createdAt,
      // `note` es el único campo que el motor no interpreta: se gasta en algo
      // que una persona leyendo el historial querría saber, no en repetir la
      // categoría que ya va en el objetivo.
      note: `${count} ${count === 1 ? 'error' : 'errores'}`,
    };
  });
}
