import OpenAI from 'openai';
import {
  PROVIDER_EXAMPLE_SCHEMA_NAME,
  ProviderExampleOutputSchema,
  providerExampleJsonSchema,
  type Challenge,
  type ChallengeExample,
} from '@english-practice/shared';
import type { Logger } from '../logger.js';
import { ProviderUnavailableError } from './provider.js';

/** Incrementar a mano cuando cambie el prompt del ejemplo. */
export const EXAMPLE_VERSION = '2026-09-04.1';

const SYSTEM_PROMPT = `You are an English writing coach for Spanish-speaking learners.

Given a writing challenge, you produce a MODEL ANSWER that the learner can study before writing their own, plus a short list of reusable phrases for that kind of text.

MODEL ANSWER:
- Write it in English, fully solving the challenge and respecting its register, word range and CEFR level.
- Write it AT the challenge's level, not above it: a B1 model must read like excellent B1, not like C2. Use sentence structures and vocabulary a learner at that level can realistically reuse.
- It must be correct, natural and idiomatic. No deliberate errors.
- Cover every point the challenge asks for, in a clear structure with paragraph breaks (use \\n\\n between paragraphs).
- Keep it concrete: invent plausible specifics (names, dates, amounts) rather than leaving placeholders like [your name].

USEFUL PHRASES:
- 5 to 8 reusable expressions typical of this text type and register — not a summary of the model answer.
- Each phrase must be a fragment the learner can drop into their own text, not a full sentence copied from the model.
- "meaning" explains in SPANISH when and why to use it (max ~12 words). It is a usage note, not a literal translation.
- "stage" marks where it belongs: "opening", "body" or "closing". Include at least one of each.

Reply only with the structured object.`;

function buildUserPrompt(challenge: Challenge): string {
  return [
    `Challenge prompt: ${challenge.prompt}`,
    `Task: ${challenge.description}`,
    `Context type: ${challenge.context}`,
    `CEFR level: ${challenge.level}`,
    `Expected register: ${challenge.register}`,
    `Word range: ${challenge.minWords}-${challenge.maxWords} words`,
  ].join('\n');
}

export interface ExampleGeneratorOptions {
  apiKey: string;
  model: string;
  logger: Logger;
  timeoutMs?: number;
}

/**
 * Genera el ejemplo de referencia de un desafío.
 *
 * El resultado depende solo del desafío, no del estudiante ni de su texto, así
 * que se cachea en memoria por `challenge.id`: el mismo desafío no vuelve a
 * costar una llamada al proveedor durante la vida del proceso.
 */
export class ExampleGenerator {
  private readonly client: OpenAI;
  private readonly schema = providerExampleJsonSchema();
  private readonly cache = new Map<string, ChallengeExample>();
  /** Peticiones en vuelo, para que dos aperturas simultáneas no dupliquen la llamada. */
  private readonly inFlight = new Map<string, Promise<ChallengeExample>>();

  constructor(private readonly options: ExampleGeneratorOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      timeout: options.timeoutMs ?? 90_000,
      maxRetries: 1,
    });
  }

  async forChallenge(challenge: Challenge): Promise<ChallengeExample> {
    const cached = this.cache.get(challenge.id);
    if (cached) return cached;

    const pending = this.inFlight.get(challenge.id);
    if (pending) return pending;

    const request = this.generate(challenge).finally(() => this.inFlight.delete(challenge.id));
    this.inFlight.set(challenge.id, request);
    return request;
  }

  private async generate(challenge: Challenge): Promise<ChallengeExample> {
    const startedAt = Date.now();
    try {
      const response = await this.client.responses.create({
        model: this.options.model,
        input: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(challenge) },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: PROVIDER_EXAMPLE_SCHEMA_NAME,
            strict: true,
            schema: this.schema,
          },
        },
      });

      this.options.logger.info('openai.example.create', {
        model: this.options.model,
        challengeId: challenge.id,
        ms: Date.now() - startedAt,
        usage: response.usage
          ? { input: response.usage.input_tokens, output: response.usage.output_tokens }
          : undefined,
      });

      const raw = response.output_text;
      if (!raw) throw new ProviderUnavailableError('Respuesta vacía del proveedor');

      const parsed = ProviderExampleOutputSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        throw new ProviderUnavailableError('El proveedor devolvió un ejemplo con forma inesperada');
      }

      const text = parsed.data.text.trim();
      if (!text) throw new ProviderUnavailableError('El proveedor devolvió un ejemplo vacío');

      const example: ChallengeExample = {
        challengeId: challenge.id,
        text,
        // Se descartan las frases incompletas en lugar de rechazar todo el ejemplo:
        // el texto modelo es lo esencial y ya está validado.
        phrases: parsed.data.phrases.filter((p) => p.phrase.trim() !== '' && p.meaning.trim() !== ''),
        model: this.options.model,
      };

      this.cache.set(challenge.id, example);
      return example;
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw err;
      if (err instanceof SyntaxError) {
        throw new ProviderUnavailableError('El proveedor devolvió JSON inválido');
      }
      const status = err instanceof OpenAI.APIError ? err.status : undefined;
      this.options.logger.error('openai.example.error', {
        model: this.options.model,
        challengeId: challenge.id,
        status,
        type: err instanceof Error ? err.name : typeof err,
      });
      throw new ProviderUnavailableError('No se pudo generar el ejemplo', status);
    }
  }
}
