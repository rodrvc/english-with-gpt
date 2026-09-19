import type { CorrectionCategory, ProviderExercisedOutput } from '@english-practice/shared';

/** Mínimo de palabras de una cita. Una sola palabra aparece en cualquier texto. */
const MIN_EVIDENCE_WORDS = 2;

export type ExercisedDiscardReason = 'also_corrected' | 'too_short' | 'not_found';

export interface ExercisedResult {
  accepted: CorrectionCategory[];
  discarded: { category: CorrectionCategory; reason: ExercisedDiscardReason }[];
}

/**
 * Normaliza para comparar: unifica la forma Unicode y colapsa los espacios.
 *
 * Sin esto, una comilla curva contra una recta, o un espacio donde el modelo
 * puso un salto de línea, no coinciden pese a verse idénticos, y la categoría
 * se pierde en silencio. Los estudiantes son hispanohablantes: los acentos
 * aparecen, y NFC contra NFD es invisible a la vista.
 */
function normalize(value: string): string {
  return value.normalize('NFC').replace(/\s+/g, ' ').trim();
}

function wordCount(value: string): number {
  return value.split(' ').filter(Boolean).length;
}

/**
 * Descarta las categorías que el modelo declara resueltas y no puede
 * respaldar.
 *
 * Lo que esto establece —y lo que no— importa: verifica que el modelo citó al
 * estudiante, no que la cita instancie la categoría. Un fragmento sin
 * puntuación puede respaldar `punctuation` y pasa. Es un filtro contra la
 * invención, no una prueba de la afirmación.
 *
 * Aun así vale: obliga a que la declaración esté atada al texto, y descarta
 * lo que no lo está. El costo de descartar un acierto real es que el nivel
 * sube más lento; el de aceptar uno falso es que el historial miente.
 *
 * A diferencia de los anclajes, una cita repetida no es ambigua aquí: no hay
 * desplazamientos que derivar, así que dos apariciones no impiden nada.
 */
export function verifyExercised(
  text: string,
  declared: ProviderExercisedOutput[],
  correctedCategories: ReadonlySet<CorrectionCategory>,
): ExercisedResult {
  const haystack = normalize(text);
  const accepted = new Set<CorrectionCategory>();
  const discarded: ExercisedResult['discarded'] = [];

  for (const item of declared) {
    if (correctedCategories.has(item.category)) {
      discarded.push({ category: item.category, reason: 'also_corrected' });
      continue;
    }
    const evidence = normalize(item.evidence);
    if (wordCount(evidence) < MIN_EVIDENCE_WORDS) {
      discarded.push({ category: item.category, reason: 'too_short' });
      continue;
    }
    if (!haystack.includes(evidence)) {
      discarded.push({ category: item.category, reason: 'not_found' });
      continue;
    }
    accepted.add(item.category);
  }
  return { accepted: [...accepted], discarded };
}
