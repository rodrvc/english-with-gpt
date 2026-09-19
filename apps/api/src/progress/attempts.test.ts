import { describe, expect, it } from 'vitest';
import type { Attempt, Correction, Evaluation } from '@english-practice/shared';
import { attemptsFrom } from './attempts.js';

function correction(partial: Partial<Correction>): Correction {
  return {
    id: 'c1',
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

function evaluation(corrections: Correction[], exercised: Evaluation['exercised'] = []): Evaluation {
  return {
    score: 70,
    breakdown: { grammar: 70, vocabulary: 70, coherence: 70, register: 70 },
    breakdownReasons: { grammar: '', vocabulary: '', coherence: '', register: '' },
    corrections,
    exercised,
    tips: [],
    summary: '',
    passed: false,
    model: 'test',
    rubricVersion: 1,
    discardedCorrections: 0,
  };
}

const attempt: Attempt = {
  id: 'a1',
  number: 1,
  text: 'texto',
  evaluation: evaluation([]),
  createdAt: '2026-09-19T10:00:00.000Z',
  scoreDelta: null,
};

describe('attemptsFrom', () => {
  it('reporta un fallo por cada categoría con una corrección de error', () => {
    const result = attemptsFrom(
      attempt,
      evaluation([correction({ category: 'grammar' }), correction({ id: 'c2', category: 'spelling' })]),
    );
    expect(result.map((a) => a.objectiveId).sort()).toEqual(['writing-grammar', 'writing-spelling']);
    expect(result.every((a) => a.correct === false)).toBe(true);
  });

  it('agrupa varias correcciones de una misma categoría en un solo hecho', () => {
    const result = attemptsFrom(
      attempt,
      evaluation([
        correction({ category: 'grammar' }),
        correction({ id: 'c2', category: 'grammar' }),
        correction({ id: 'c3', category: 'grammar' }),
      ]),
    );
    expect(result).toHaveLength(1);
  });

  it('ignora las sugerencias de estilo: no bloquean la aprobación ni son fallos', () => {
    const result = attemptsFrom(
      attempt,
      evaluation([correction({ category: 'register', severity: 'style' })]),
    );
    expect(result).toEqual([]);
  });

  it('no reporta acierto por ausencia de corrección', () => {
    // Un texto sin errores no demuestra dominar nada: pudo no ejercitarlo.
    expect(attemptsFrom(attempt, evaluation([]))).toEqual([]);
  });

  it('reporta un acierto por cada categoría que el servidor verificó', () => {
    const result = attemptsFrom(attempt, evaluation([], ['grammar', 'register']));
    expect(result.map((a) => a.objectiveId)).toEqual(['writing-grammar', 'writing-register']);
    expect(result.every((a) => a.correct)).toBe(true);
  });

  it('un fallo y un acierto de la misma categoría conviven sobre un intento', () => {
    // Un texto puede resolver bien una frase y equivocar otra; sin el signo en
    // la clave, el segundo hecho chocaría con el primero.
    const result = attemptsFrom(attempt, evaluation([correction({ category: 'grammar' })], ['grammar']));
    expect(result.map((a) => a.attemptId)).toEqual(['a1:grammar:miss', 'a1:grammar:hit']);
    expect(result.map((a) => a.correct)).toEqual([false, true]);
  });

  it('cuenta los errores de la categoría en la nota, que el motor no interpreta', () => {
    const result = attemptsFrom(
      attempt,
      evaluation([correction({ category: 'grammar' }), correction({ id: 'c2', category: 'grammar' })]),
    );
    expect(result[0]!.note).toBe('2 errores');
  });

  it('usa un identificador determinista por intento, objetivo y signo, para poder reintentar', () => {
    const once = attemptsFrom(attempt, evaluation([correction({ category: 'grammar' })]));
    const twice = attemptsFrom(attempt, evaluation([correction({ category: 'grammar' })]));
    expect(once[0]!.attemptId).toBe('a1:grammar:miss');
    expect(twice[0]!.attemptId).toBe(once[0]!.attemptId);
  });

  it('fecha el hecho cuando ocurrió el intento, no cuando se reporta', () => {
    const result = attemptsFrom(attempt, evaluation([correction({ category: 'grammar' })]));
    expect(result[0]!.at).toBe('2026-09-19T10:00:00.000Z');
  });
});
