import {
  PASS_THRESHOLD,
  ProviderEvaluationSchema,
  type Attempt,
  type Challenge,
  type Evaluation,
} from '@english-practice/shared';
import { evaluationUnavailable, providerError } from '../errors.js';
import type { Logger } from '../logger.js';
import { reconcileCorrections } from './anchors.js';
import { buildEvaluationPrompt, RUBRIC_VERSION } from './prompt.js';
import { ProviderUnavailableError, type EvaluationProvider } from './provider.js';

export interface EvaluateInput {
  challenge: Challenge;
  text: string;
  previousAttempts: Attempt[];
}

export interface EvaluatorOptions {
  /** Intentos totales ante respuestas estructuralmente inválidas. */
  maxAttempts?: number;
}

export class Evaluator {
  private readonly maxAttempts: number;

  constructor(
    private readonly provider: EvaluationProvider,
    private readonly logger: Logger,
    options: EvaluatorOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 3;
  }

  async evaluate(input: EvaluateInput): Promise<Evaluation> {
    const prompt = buildEvaluationPrompt(input);

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      let raw: unknown;
      try {
        raw = await this.provider.complete(prompt);
      } catch (err) {
        if (err instanceof ProviderUnavailableError) throw providerError(err.message);
        throw err;
      }

      const parsed = ProviderEvaluationSchema.safeParse(raw);
      if (!parsed.success) {
        this.logger.warn('evaluation.invalid_response', {
          attempt,
          issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
        });
        continue;
      }

      const { accepted, discarded } = reconcileCorrections(input.text, parsed.data.corrections);
      if (discarded.length > 0) {
        this.logger.warn('evaluation.corrections_discarded', {
          total: parsed.data.corrections.length,
          discarded: discarded.map((d) => d.reason),
        });
      }
      const hasErrors = accepted.some((c) => c.severity === 'error');
      const passed = parsed.data.score >= PASS_THRESHOLD && !hasErrors;

      return {
        score: parsed.data.score,
        breakdown: parsed.data.breakdown,
        corrections: accepted,
        tips: parsed.data.tips.filter((t) => t.title.trim() && t.body.trim()).slice(0, 4),
        summary: parsed.data.summary,
        passed,
        model: this.provider.model,
        rubricVersion: RUBRIC_VERSION,
        discardedCorrections: discarded.length,
      };
    }

    throw evaluationUnavailable();
  }
}
