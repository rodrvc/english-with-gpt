import { describe, expect, it } from 'vitest';
import type { ProviderCorrectionOutput } from '@english-practice/shared';
import { findOccurrences, reconcileCorrections } from './anchors.js';

const text = 'I am writting to you because the dates are be from March. She can covers my tasks. Please tell me if is ok.';

function raw(partial: Partial<ProviderCorrectionOutput>): ProviderCorrectionOutput {
  return {
    category: 'grammar',
    severity: 'error',
    start: 0,
    end: 1,
    original: 'x',
    suggestion: 'y',
    explanation: 'porque sí',
    ...partial,
  };
}

describe('reconcileCorrections', () => {
  it('acepta un anclaje cuyos índices coinciden con la cita', () => {
    const start = text.indexOf('writting');
    const r = reconcileCorrections(text, [raw({ category: 'spelling', original: 'writting', start, end: start + 8 })]);
    expect(r.discarded).toHaveLength(0);
    expect(r.accepted).toHaveLength(1);
    expect(r.accepted[0]).toMatchObject({ id: 'c1', start, end: start + 8, severity: 'error' });
  });

  it('relocaliza un anclaje desplazado cuando la cita aparece una sola vez', () => {
    const real = text.indexOf('are be');
    const r = reconcileCorrections(text, [raw({ original: 'are be', start: real - 3, end: real + 3 })]);
    expect(r.accepted).toHaveLength(1);
    expect(r.accepted[0]!.start).toBe(real);
    expect(r.accepted[0]!.end).toBe(real + 'are be'.length);
    expect(text.slice(r.accepted[0]!.start, r.accepted[0]!.end)).toBe('are be');
  });

  it('descarta un fragmento ambiguo (varias coincidencias)', () => {
    const r = reconcileCorrections(text, [raw({ original: 'a', start: 0, end: 1 })]);
    expect(r.accepted).toHaveLength(0);
    expect(r.discarded[0]!.reason).toBe('ambiguous');
  });

  it('descarta un fragmento que no aparece en el texto', () => {
    const r = reconcileCorrections(text, [raw({ original: 'am writing', start: 2, end: 12 })]);
    expect(r.accepted).toHaveLength(0);
    expect(r.discarded[0]!.reason).toBe('not_found');
  });

  it('descarta desplazamientos fuera de rango o negativos', () => {
    const cases = [
      raw({ original: 'writting', start: -1, end: 7 }),
      raw({ original: 'writting', start: 5, end: text.length + 10 }),
      raw({ original: 'writting', start: 10, end: 10 }),
      raw({ original: 'writting', start: 12, end: 5 }),
    ];
    const r = reconcileCorrections(text, cases);
    expect(r.accepted).toHaveLength(0);
    expect(r.discarded.map((d) => d.reason)).toEqual(['out_of_range', 'out_of_range', 'out_of_range', 'out_of_range']);
  });

  it('ante superposición conserva la de mayor severidad', () => {
    const s = text.indexOf('tell me if is ok');
    const r = reconcileCorrections(text, [
      raw({ category: 'register', severity: 'style', original: 'tell me if is ok', start: s, end: s + 16 }),
      raw({ category: 'grammar', severity: 'error', original: 'if is ok', start: s + 8, end: s + 16 }),
    ]);
    expect(r.accepted).toHaveLength(1);
    expect(r.accepted[0]!.category).toBe('grammar');
    expect(r.discarded[0]!.reason).toBe('overlap');
  });

  it('ante superposición de igual severidad conserva una sola y no deja tramos superpuestos', () => {
    const s = text.indexOf('can covers');
    const r = reconcileCorrections(text, [
      raw({ category: 'agreement', original: 'can covers', start: s, end: s + 10 }),
      raw({ category: 'grammar', original: 'covers my', start: s + 4, end: s + 13 }),
    ]);
    expect(r.accepted).toHaveLength(1);
    expect(r.accepted[0]!.original).toBe('can covers');
  });

  it('normaliza la severidad a partir de la categoría', () => {
    const s = text.indexOf('writting');
    const r = reconcileCorrections(text, [
      raw({ category: 'spelling', severity: 'style', original: 'writting', start: s, end: s + 8 }),
      raw({ category: 'register', severity: 'error', original: 'Please', start: text.indexOf('Please'), end: text.indexOf('Please') + 6 }),
    ]);
    expect(r.accepted.map((c) => c.severity)).toEqual(['error', 'style']);
  });

  it('respeta la severidad declarada para vocabulario', () => {
    const s = text.indexOf('tasks');
    const r = reconcileCorrections(text, [raw({ category: 'vocabulary', severity: 'style', original: 'tasks', start: s, end: s + 5 })]);
    expect(r.accepted[0]!.severity).toBe('style');
  });

  it('descarta correcciones sin explicación', () => {
    const s = text.indexOf('writting');
    const r = reconcileCorrections(text, [raw({ original: 'writting', start: s, end: s + 8, explanation: '   ' })]);
    expect(r.accepted).toHaveLength(0);
    expect(r.discarded[0]!.reason).toBe('missing_explanation');
  });

  it('descarta correcciones sin sugerencia', () => {
    const s = text.indexOf('writting');
    const r = reconcileCorrections(text, [raw({ original: 'writting', start: s, end: s + 8, suggestion: '' })]);
    expect(r.accepted).toHaveLength(0);
    expect(r.discarded[0]!.reason).toBe('missing_suggestion');
  });

  it('devuelve las aceptadas ordenadas por posición con ids secuenciales', () => {
    const a = text.indexOf('can covers');
    const b = text.indexOf('writting');
    const r = reconcileCorrections(text, [
      raw({ category: 'agreement', original: 'can covers', start: a, end: a + 10 }),
      raw({ category: 'spelling', original: 'writting', start: b, end: b + 8 }),
    ]);
    expect(r.accepted.map((c) => [c.id, c.original])).toEqual([
      ['c1', 'writting'],
      ['c2', 'can covers'],
    ]);
  });

  it('usa unidades UTF-16 (emojis y acentos compuestos)', () => {
    const t = 'Hola 😀 amigo, I am writting to you.';
    const s = t.indexOf('writting');
    const r = reconcileCorrections(t, [raw({ original: 'writting', start: s - 1, end: s + 7 })]);
    expect(r.accepted[0]!.start).toBe(s);
    expect(t.slice(r.accepted[0]!.start, r.accepted[0]!.end)).toBe('writting');
  });
});

describe('findOccurrences', () => {
  it('cuenta coincidencias solapadas y vacías', () => {
    expect(findOccurrences('aaa', 'aa').length).toBe(2);
    expect(findOccurrences('abc', '')).toEqual([]);
    expect(findOccurrences('abc', 'b')).toEqual([1]);
  });
});

describe('reconcileCorrections (sin cambio)', () => {
  it('descarta correcciones cuya propuesta es idéntica al original', () => {
    const t = 'Dear Mr. Johnson, hello.';
    const r = reconcileCorrections(t, [
      { category: 'coherence', severity: 'style', start: 0, end: 17, original: 'Dear Mr. Johnson,', suggestion: 'Dear Mr. Johnson,', explanation: 'x' },
    ]);
    expect(r.accepted).toHaveLength(0);
    expect(r.discarded[0]!.reason).toBe('no_change');
  });
});
