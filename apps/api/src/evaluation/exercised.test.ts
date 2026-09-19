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
    expect(verifyExercised(text, [declared({})], noCorrections)).toEqual(['grammar']);
  });

  it('descarta una cita que no aparece: la afirmación no se verifica sola', () => {
    const result = verifyExercised(text, [declared({ evidence: 'I have written' })], noCorrections);
    expect(result).toEqual([]);
  });

  it('descarta una categoría que además tiene una corrección', () => {
    // La evidencia en contra pesa más que la declaración a favor.
    const result = verifyExercised(text, [declared({})], new Set<CorrectionCategory>(['grammar']));
    expect(result).toEqual([]);
  });

  it('descarta una cita vacía o de solo espacios', () => {
    const result = verifyExercised(
      text,
      [declared({ evidence: '' }), declared({ category: 'spelling', evidence: '   ' })],
      noCorrections,
    );
    expect(result).toEqual([]);
  });

  it('no repite una categoría declarada dos veces', () => {
    const result = verifyExercised(
      text,
      [declared({ evidence: 'I am writing' }), declared({ evidence: 'She can cover' })],
      noCorrections,
    );
    expect(result).toEqual(['grammar']);
  });

  it('una lista vacía es una respuesta válida: el texto pudo no ejercitar nada', () => {
    expect(verifyExercised(text, [], noCorrections)).toEqual([]);
  });
});
