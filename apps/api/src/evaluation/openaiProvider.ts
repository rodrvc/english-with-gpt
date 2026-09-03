import OpenAI from 'openai';
import { PROVIDER_SCHEMA_NAME, providerEvaluationJsonSchema } from '@english-practice/shared';
import type { Logger } from '../logger.js';
import type { EvaluationPrompt } from './prompt.js';
import { ProviderUnavailableError, type EvaluationProvider } from './provider.js';

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  logger: Logger;
  timeoutMs?: number;
}

/**
 * Proveedor sobre la Responses API de OpenAI con salida estructurada estricta.
 * La credencial solo vive dentro del cliente; nunca se registra ni se propaga
 * en errores.
 */
export class OpenAIEvaluationProvider implements EvaluationProvider {
  private readonly client: OpenAI;
  private readonly schema = providerEvaluationJsonSchema();
  readonly model: string;

  constructor(private readonly options: OpenAIProviderOptions) {
    this.model = options.model;
    this.client = new OpenAI({
      apiKey: options.apiKey,
      timeout: options.timeoutMs ?? 90_000,
      maxRetries: 1,
    });
  }

  async complete(prompt: EvaluationPrompt): Promise<unknown> {
    const startedAt = Date.now();
    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: PROVIDER_SCHEMA_NAME,
            strict: true,
            schema: this.schema,
          },
        },
      });
      const usage = response.usage
        ? { input: response.usage.input_tokens, output: response.usage.output_tokens }
        : undefined;
      this.options.logger.info('openai.responses.create', {
        model: this.model,
        ms: Date.now() - startedAt,
        usage,
      });
      const text = response.output_text;
      if (!text) throw new ProviderUnavailableError('Respuesta vacía del proveedor');
      return JSON.parse(text);
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw err;
      if (err instanceof SyntaxError) throw new ProviderUnavailableError('El proveedor devolvió JSON inválido');
      const status = err instanceof OpenAI.APIError ? err.status : undefined;
      this.options.logger.error('openai.responses.error', {
        model: this.model,
        status,
        type: err instanceof Error ? err.name : typeof err,
      });
      throw new ProviderUnavailableError(describeProviderFailure(status), status);
    }
  }
}

/** Mensaje genérico para el cliente. Nunca incluye el error original del proveedor. */
function describeProviderFailure(status: number | undefined): string {
  if (status === 401 || status === 403) return 'El servidor no pudo autenticarse con el proveedor de IA';
  if (status === 429) return 'El proveedor de IA está saturado; inténtalo de nuevo en unos segundos';
  if (status !== undefined && status >= 500) return 'El proveedor de IA devolvió un error de servicio';
  return 'No se pudo contactar al proveedor de IA';
}
