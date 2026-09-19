import type { Logger } from '../logger.js';
import type { ProgressAttempt, ProgressTracker } from './tracker.js';

export interface HttpProgressTrackerOptions {
  /** Raíz de la API del motor, p. ej. `http://127.0.0.1:8000`. */
  baseUrl: string;
  /** Tópico del motor donde vive el historial de escritura. */
  topicId: string;
  logger: Logger;
  /** Corta la espera: el motor nunca debe frenar una evaluación. */
  timeoutMs?: number;
}

/**
 * Cliente del motor de seguimiento.
 *
 * Reporta cada hecho por separado porque el motor pondera por recencia y
 * necesita los intentos separados. Un fallo se registra y se traga: el
 * historial es valioso, pero no al precio de romper la práctica.
 */
export class HttpProgressTracker implements ProgressTracker {
  private readonly timeoutMs: number;

  constructor(private readonly options: HttpProgressTrackerOptions) {
    this.timeoutMs = options.timeoutMs ?? 3000;
  }

  async record(attempts: ProgressAttempt[]): Promise<void> {
    for (const attempt of attempts) {
      await this.post(attempt);
    }
  }

  private async post(attempt: ProgressAttempt): Promise<void> {
    const url = `${this.options.baseUrl}/topics/${encodeURIComponent(this.options.topicId)}/attempts`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective_id: attempt.objectiveId,
          attempt_id: attempt.attemptId,
          correct: attempt.correct,
          at: attempt.at,
          kind: 'exercise',
          note: attempt.note,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      // 409 es el mismo hecho reportado dos veces: el motor lo rechaza por
      // diseño y eso es exactamente lo que queremos, no un error que avisar.
      if (res.ok || res.status === 409) return;
      this.options.logger.warn('progress.rejected', {
        status: res.status,
        objectiveId: attempt.objectiveId,
      });
    } catch (err) {
      this.options.logger.warn('progress.unreachable', {
        objectiveId: attempt.objectiveId,
        error: err instanceof Error ? err.message : 'desconocido',
      });
    }
  }
}
