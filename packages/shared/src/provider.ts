import { z } from 'zod';
import { CorrectionCategorySchema, SeveritySchema } from './taxonomy.js';

/**
 * Forma exacta que se le exige al proveedor de IA mediante salida estructurada
 * estricta. Deliberadamente sin restricciones numéricas (min/max) para que el
 * JSON Schema derivado sea aceptado por el proveedor; los rangos se validan
 * después con `ProviderEvaluationSchema`.
 */
export const ProviderCorrectionOutputSchema = z.object({
  category: CorrectionCategorySchema,
  severity: SeveritySchema,
  start: z.number().int(),
  end: z.number().int(),
  original: z.string(),
  suggestion: z.string(),
  explanation: z.string(),
});
export type ProviderCorrectionOutput = z.infer<typeof ProviderCorrectionOutputSchema>;

export const ProviderEvaluationOutputSchema = z.object({
  score: z.number().int(),
  breakdown: z.object({
    grammar: z.number().int(),
    vocabulary: z.number().int(),
    coherence: z.number().int(),
    register: z.number().int(),
  }),
  corrections: z.array(ProviderCorrectionOutputSchema),
  tips: z.array(z.object({ title: z.string(), body: z.string() })),
  summary: z.string(),
});
export type ProviderEvaluationOutput = z.infer<typeof ProviderEvaluationOutputSchema>;

const Score = z.number().int().min(0).max(100);

/** Validación semántica de la respuesta del proveedor (rangos 0..100). */
export const ProviderEvaluationSchema = ProviderEvaluationOutputSchema.extend({
  score: Score,
  breakdown: z.object({
    grammar: Score,
    vocabulary: Score,
    coherence: Score,
    register: Score,
  }),
});
export type ProviderEvaluation = z.infer<typeof ProviderEvaluationSchema>;

type JsonObject = Record<string, unknown>;

function stripForStrictMode(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripForStrictMode);
  if (node && typeof node === 'object') {
    const out: JsonObject = {};
    for (const [key, value] of Object.entries(node as JsonObject)) {
      if (key === '$schema' || key === 'minimum' || key === 'maximum') continue;
      out[key] = stripForStrictMode(value);
    }
    if (out['type'] === 'object' && out['properties']) {
      out['additionalProperties'] = false;
      out['required'] = Object.keys(out['properties'] as JsonObject);
    }
    return out;
  }
  return node;
}

/**
 * JSON Schema derivado del esquema Zod compartido, apto para `strict: true`
 * en la salida estructurada del proveedor: todos los campos requeridos y sin
 * propiedades adicionales.
 */
export function providerEvaluationJsonSchema(): JsonObject {
  return stripForStrictMode(z.toJSONSchema(ProviderEvaluationOutputSchema)) as JsonObject;
}

export const PROVIDER_SCHEMA_NAME = 'writing_evaluation';

/**
 * Salida que se le exige al proveedor para el ejemplo de referencia de un
 * desafío: un texto modelo y las frases reutilizables de ese contexto.
 */
export const ProviderExampleOutputSchema = z.object({
  text: z.string(),
  phrases: z.array(
    z.object({
      phrase: z.string(),
      meaning: z.string(),
      stage: z.enum(['opening', 'body', 'closing']),
    }),
  ),
});
export type ProviderExampleOutput = z.infer<typeof ProviderExampleOutputSchema>;

export function providerExampleJsonSchema(): JsonObject {
  return stripForStrictMode(z.toJSONSchema(ProviderExampleOutputSchema)) as JsonObject;
}

export const PROVIDER_EXAMPLE_SCHEMA_NAME = 'writing_example';
