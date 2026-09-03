import type { ScoreBreakdown } from '@english-practice/shared';

/**
 * Pesos del puntaje global por dimensión. Se aplican en código para que el
 * puntaje sea determinista y coherente con el desglose que ve el estudiante;
 * el puntaje holístico del modelo se valida pero no se usa como global.
 */
export const DIMENSION_WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  grammar: 0.35,
  vocabulary: 0.2,
  coherence: 0.25,
  register: 0.2,
};

export function overallScore(breakdown: ScoreBreakdown): number {
  const total = (Object.keys(DIMENSION_WEIGHTS) as (keyof ScoreBreakdown)[]).reduce(
    (sum, key) => sum + breakdown[key] * DIMENSION_WEIGHTS[key],
    0,
  );
  return Math.min(100, Math.max(0, Math.round(total)));
}
