import {
  severityForCategory,
  type Correction,
  type ProviderCorrectionOutput,
  type Severity,
} from '@english-practice/shared';

export type DiscardReason =
  | 'missing_explanation'
  | 'empty_fragment'
  | 'out_of_range'
  | 'not_found'
  | 'ambiguous'
  | 'no_change'
  | 'overlap';

export interface DiscardedCorrection {
  correction: ProviderCorrectionOutput;
  reason: DiscardReason;
}

export interface ReconcileResult {
  accepted: Correction[];
  discarded: DiscardedCorrection[];
}

const SEVERITY_RANK: Record<Severity, number> = { error: 2, style: 1 };

/** Posiciones (UTF-16) de todas las ocurrencias exactas de `needle` en `text`. */
export function findOccurrences(text: string, needle: string): number[] {
  const positions: number[] = [];
  if (!needle) return positions;
  let from = 0;
  while (from <= text.length) {
    const idx = text.indexOf(needle, from);
    if (idx === -1) break;
    positions.push(idx);
    from = idx + 1;
    if (positions.length > 1) break; // basta saber que es ambiguo
  }
  return positions;
}

type Anchored = Omit<Correction, 'id'>;

/**
 * Reconciliación de anclajes. La cita textual (`original`) es autoritativa;
 * los desplazamientos son una sugerencia del modelo.
 *
 * 1. `text.slice(start, end) === original` → se acepta tal cual.
 * 2. Si no, se busca `original` en el texto: una única coincidencia →
 *    se reescriben los desplazamientos; cero o varias → se descarta.
 * 3. Desplazamientos fuera de rango → se descarta.
 * 4. Sobre las supervivientes, se descartan las que se superponen con una de
 *    severidad mayor o igual ya aceptada.
 *
 * Todos los índices se expresan en unidades de código UTF-16 (semántica de
 * `String.prototype.slice`).
 */
export function reconcileCorrections(text: string, raw: ProviderCorrectionOutput[]): ReconcileResult {
  const discarded: DiscardedCorrection[] = [];
  const anchored: Anchored[] = [];

  for (const c of raw) {
    if (!c.explanation || c.explanation.trim() === '') {
      discarded.push({ correction: c, reason: 'missing_explanation' });
      continue;
    }
    if (!c.original || c.original.trim() === '') {
      discarded.push({ correction: c, reason: 'empty_fragment' });
      continue;
    }
    if (c.suggestion.trim() === c.original.trim()) {
      discarded.push({ correction: c, reason: 'no_change' });
      continue;
    }
    const severity = severityForCategory(c.category, c.severity);
    const inRange =
      Number.isInteger(c.start) &&
      Number.isInteger(c.end) &&
      c.start >= 0 &&
      c.end <= text.length &&
      c.start < c.end;

    if (!inRange) {
      discarded.push({ correction: c, reason: 'out_of_range' });
      continue;
    }

    let start = c.start;
    let end = c.end;
    if (text.slice(start, end) !== c.original) {
      const positions = findOccurrences(text, c.original);
      if (positions.length === 0) {
        discarded.push({ correction: c, reason: 'not_found' });
        continue;
      }
      if (positions.length > 1) {
        discarded.push({ correction: c, reason: 'ambiguous' });
        continue;
      }
      start = positions[0]!;
      end = start + c.original.length;
    }

    anchored.push({
      category: c.category,
      severity,
      start,
      end,
      original: c.original,
      suggestion: c.suggestion,
      explanation: c.explanation.trim(),
    });
  }

  // Mayor severidad primero; a igual severidad, la que empieza antes.
  const byPriority = [...anchored].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.start - b.start || a.end - b.end,
  );
  const kept: Anchored[] = [];
  for (const candidate of byPriority) {
    const overlaps = kept.some((k) => candidate.start < k.end && k.start < candidate.end);
    if (overlaps) {
      discarded.push({ correction: toRaw(candidate), reason: 'overlap' });
      continue;
    }
    kept.push(candidate);
  }

  kept.sort((a, b) => a.start - b.start);
  const accepted: Correction[] = kept.map((c, i) => ({ id: `c${i + 1}`, ...c }));
  return { accepted, discarded };
}

function toRaw(c: Anchored): ProviderCorrectionOutput {
  return {
    category: c.category,
    severity: c.severity,
    start: c.start,
    end: c.end,
    original: c.original,
    suggestion: c.suggestion,
    explanation: c.explanation,
  };
}
