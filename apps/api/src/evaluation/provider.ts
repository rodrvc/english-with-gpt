import type { EvaluationPrompt } from './prompt.js';

export class ProviderUnavailableError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}

/** Frontera con el proveedor de IA. Devuelve el JSON crudo (sin validar). */
export interface EvaluationProvider {
  readonly model: string;
  complete(prompt: EvaluationPrompt): Promise<unknown>;
}
