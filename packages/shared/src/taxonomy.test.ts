import { describe, expect, it } from 'vitest';
import {
  CorrectionCategorySchema,
  EvaluationSchema,
  ScoreBreakdownSchema,
  providerEvaluationJsonSchema,
  severityForCategory,
} from './index.js';

describe('severityForCategory', () => {
  it('cubre todas las categorías con una severidad determinista o delegada', () => {
    const expected: Record<string, 'error' | 'style' | 'declared'> = {
      spelling: 'error',
      grammar: 'error',
      agreement: 'error',
      punctuation: 'error',
      vocabulary: 'declared',
      register: 'style',
      coherence: 'style',
    };
    for (const category of CorrectionCategorySchema.options) {
      const rule = expected[category];
      expect(rule, `falta regla para ${category}`).toBeDefined();
      if (rule === 'declared') {
        expect(severityForCategory(category, 'error')).toBe('error');
        expect(severityForCategory(category, 'style')).toBe('style');
      } else {
        expect(severityForCategory(category, 'error')).toBe(rule);
        expect(severityForCategory(category, 'style')).toBe(rule);
      }
    }
  });
});

describe('esquemas de puntaje', () => {
  it('rechaza puntajes fuera de 0..100', () => {
    expect(ScoreBreakdownSchema.safeParse({ grammar: 101, vocabulary: 0, coherence: 0, register: 0 }).success).toBe(false);
    expect(ScoreBreakdownSchema.safeParse({ grammar: -1, vocabulary: 0, coherence: 0, register: 0 }).success).toBe(false);
    expect(ScoreBreakdownSchema.safeParse({ grammar: 50.5, vocabulary: 0, coherence: 0, register: 0 }).success).toBe(false);
    expect(ScoreBreakdownSchema.safeParse({ grammar: 100, vocabulary: 0, coherence: 0, register: 0 }).success).toBe(true);
  });

  it('rechaza una evaluación con puntaje global fuera de rango', () => {
    const base = {
      score: 120,
      breakdown: { grammar: 80, vocabulary: 80, coherence: 80, register: 80 },
      corrections: [],
      tips: [],
      summary: '',
      passed: false,
      model: 'm',
      rubricVersion: '1',
      discardedCorrections: 0,
    };
    expect(EvaluationSchema.safeParse(base).success).toBe(false);
    expect(EvaluationSchema.safeParse({ ...base, score: 90 }).success).toBe(true);
  });
});

describe('providerEvaluationJsonSchema', () => {
  it('produce un esquema estricto: todo requerido y sin propiedades adicionales', () => {
    const schema = providerEvaluationJsonSchema() as Record<string, unknown>;
    expect(schema['additionalProperties']).toBe(false);
    expect(schema['required']).toEqual(['score', 'breakdown', 'corrections', 'tips', 'summary']);
    expect(schema['$schema']).toBeUndefined();
    const json = JSON.stringify(schema);
    expect(json).not.toContain('"minimum"');
    expect(json).not.toContain('"maximum"');
  });
});
