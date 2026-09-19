import { describe, expect, it } from 'vitest';
import type { CorrectionCategory, ProviderExercisedOutput } from '@english-practice/shared';
import { verifyExercised } from './exercised.js';

const text = 'I am writing to request three days off in March. She can cover my tasks.';

function declared(partial: Partial<ProviderExercisedOutput>): ProviderExercisedOutput {
  return { category: 'grammar', evidence: 'I am writing', ...partial };
}

const noCorrections: ReadonlySet<CorrectionCategory> = new Set();

describe('verifyExercised', () => {
  it('acepta una categoría cuya cita aparece en el texto', () => {
    const result = verifyExercised(text, [declared({})], noCorrections);
    expect(result.accepted).toEqual(['grammar']);
    expect(result.discarded).toEqual([]);
  });

  it('descarta una cita que no aparece: la afirmación no se verifica sola', () => {
    const result = verifyExercised(text, [declared({ evidence: 'I have written' })], noCorrections);
    expect(result.accepted).toEqual([]);
    expect(result.discarded[0]).toEqual({ category: 'grammar', reason: 'not_found' });
  });

  it('descarta una cita de una sola palabra: aparece en cualquier texto', () => {
    const result = verifyExercised(text, [declared({ evidence: 'March' })], noCorrections);
    expect(result.accepted).toEqual([]);
    expect(result.discarded[0]!.reason).toBe('too_short');
  });

  it('descarta una categoría que además tiene una corrección', () => {
    // La evidencia en contra pesa más que la declaración a favor.
    const result = verifyExercised(text, [declared({})], new Set<CorrectionCategory>(['grammar']));
    expect(result.accepted).toEqual([]);
    expect(result.discarded[0]!.reason).toBe('also_corrected');
  });

  it('acepta pese a un espaciado distinto del modelo', () => {
    // Un salto de línea donde el texto tiene un espacio no es una cita falsa.
    const result = verifyExercised(text, [declared({ evidence: 'I am\n  writing' })], noCorrections);
    expect(result.accepted).toEqual(['grammar']);
  });

  it('acepta pese a una forma Unicode distinta, invisible a la vista', () => {
    const accented = 'Aquí I am writing to you';
    const result = verifyExercised(
      accented.normalize('NFC'),
      [declared({ evidence: 'Aquí I am'.normalize('NFD') })],
      noCorrections,
    );
    expect(result.accepted).toEqual(['grammar']);
  });

  it('descarta una cita vacía o de solo espacios', () => {
    const result = verifyExercised(
      text,
      [declared({ evidence: '' }), declared({ category: 'spelling', evidence: '   ' })],
      noCorrections,
    );
    expect(result.accepted).toEqual([]);
    expect(result.discarded.map((d) => d.reason)).toEqual(['too_short', 'too_short']);
  });

  it('no repite una categoría declarada dos veces', () => {
    const result = verifyExercised(
      text,
      [declared({ evidence: 'I am writing' }), declared({ evidence: 'She can cover' })],
      noCorrections,
    );
    expect(result.accepted).toEqual(['grammar']);
  });

  it('una cita repetida en el texto no es ambigua: no hay desplazamientos que derivar', () => {
    const repeated = 'my tasks are mine. my tasks are done.';
    const result = verifyExercised(repeated, [declared({ evidence: 'my tasks' })], noCorrections);
    expect(result.accepted).toEqual(['grammar']);
  });

  it('una lista vacía es una respuesta válida: el texto pudo no ejercitar nada', () => {
    expect(verifyExercised(text, [], noCorrections).accepted).toEqual([]);
  });
});
