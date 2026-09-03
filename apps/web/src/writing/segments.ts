import type { Correction } from '@english-practice/shared';

export interface Segment {
  text: string;
  correction?: Correction;
}

/**
 * Divide el texto plano en segmentos a partir de los rangos de corrección.
 * Asume rangos no superpuestos y ordenados (garantizado por el servidor).
 */
export function buildSegments(text: string, corrections: Correction[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  const sorted = [...corrections].sort((a, b) => a.start - b.start);
  for (const c of sorted) {
    if (c.start < cursor || c.end > text.length || c.start >= c.end) continue;
    if (c.start > cursor) segments.push({ text: text.slice(cursor, c.start) });
    segments.push({ text: text.slice(c.start, c.end), correction: c });
    cursor = c.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

/**
 * Marcas vigentes tras editar. No transforma posiciones dentro de la zona
 * editada: conserva las marcas íntegramente anteriores al prefijo común y
 * desplaza las íntegramente posteriores al sufijo común; el resto se invalida.
 */
export function surviveEdit(evaluatedText: string, currentText: string, corrections: Correction[]): Correction[] {
  if (evaluatedText === currentText) return corrections;
  let prefix = 0;
  const maxPrefix = Math.min(evaluatedText.length, currentText.length);
  while (prefix < maxPrefix && evaluatedText[prefix] === currentText[prefix]) prefix++;
  let suffix = 0;
  const maxSuffix = Math.min(evaluatedText.length - prefix, currentText.length - prefix);
  while (
    suffix < maxSuffix &&
    evaluatedText[evaluatedText.length - 1 - suffix] === currentText[currentText.length - 1 - suffix]
  ) {
    suffix++;
  }
  const shift = currentText.length - evaluatedText.length;
  const suffixStart = evaluatedText.length - suffix;
  const kept: Correction[] = [];
  for (const c of corrections) {
    if (c.end <= prefix) kept.push(c);
    else if (c.start >= suffixStart) kept.push({ ...c, start: c.start + shift, end: c.end + shift });
  }
  return kept;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
