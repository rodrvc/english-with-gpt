import type { CorrectionCategory } from '@english-practice/shared';
import type { ProviderExercisedOutput } from '@english-practice/shared';

/**
 * Filtra las categorías que el modelo declara resueltas, quedándose solo con
 * las que puede respaldar.
 *
 * Tres reglas, por el mismo motivo que la reconciliación de anclajes: lo que
 * el modelo cita es verificable, lo que afirma no lo es.
 *
 * 1. La cita debe aparecer literalmente en el texto del estudiante.
 * 2. Una categoría con alguna corrección no puede declararse resuelta: la
 *    evidencia en contra pesa más que la declaración a favor.
 * 3. Sin cita utilizable, la categoría se descarta. El costo de descartar un
 *    acierto real es que el nivel sube más lento; el de aceptar uno falso es
 *    que el historial miente.
 */
export function verifyExercised(
  text: string,
  declared: ProviderExercisedOutput[],
  correctedCategories: ReadonlySet<CorrectionCategory>,
): CorrectionCategory[] {
  const verified = new Set<CorrectionCategory>();
  for (const item of declared) {
    if (correctedCategories.has(item.category)) continue;
    const evidence = item.evidence.trim();
    if (evidence.length === 0 || !text.includes(evidence)) continue;
    verified.add(item.category);
  }
  return [...verified];
}
