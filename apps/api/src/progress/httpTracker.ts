import type { Logger } from '../logger.js';
import type { ProgressAttempt, ProgressTracker } from './tracker.js';

export interface HttpProgressTrackerOptions {
  /** Raíz de la API del motor, p. ej. `http://127.0.0.1:8000`. */
  baseUrl: string;
  /** Tópico del motor donde vive el historial de escritura. */
  topicId: string;
  logger: Logger;
  /** Presupuesto total del reporte, no por petición. */
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

  /**
   * Un presupuesto para todo el reporte, no uno por petición: siete categorías
   * contra un motor que cuelga costarían siete esperas completas, y esas
   * promesas se acumulan sin que nadie las mire, porque la práctica ya
   * respondió y se ve sana.
   *
   * Un fallo de transporte corta el resto y se propaga: si el motor no
   * contesta el primer hecho, tampoco contestará los otros seis, y quien llama
   * decide qué hacer con eso.
   */
  async record(attempts: ProgressAttempt[]): Promise<void> {
    const deadline = AbortSignal.timeout(this.timeoutMs);
    for (const attempt of attempts) {
      await this.post(attempt, deadline);
    }
  }

  /** Lanza si el motor no es alcanzable; un rechazo suyo no es excepción. */
  private async post(attempt: ProgressAttempt, signal: AbortSignal): Promise<void> {
    const url =
      `${this.options.baseUrl}/topics/${encodeURIComponent(this.options.topicId)}` +
      `/objectives/${encodeURIComponent(attempt.objectiveId)}/attempts`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attempt_id: attempt.attemptId,
          correct: attempt.correct,
          at: attempt.at,
          kind: 'exercise',
          note: attempt.note,
        }),
        signal,
      });
      // 409 es el mismo hecho reportado dos veces: el motor lo rechaza por
      // diseño y eso es exactamente lo que queremos, no un error que avisar.
      if (res.ok || res.status === 409) return;
      // Un 4xx es un contrato roto, no una caída: el motor entendió y dijo que
      // no. Se ve igual de silencioso que un 5xx desde la práctica, pero lo
      // arregla una persona, no el tiempo.
      if (res.status < 500) {
        this.options.logger.error('progress.contract_rejected', {
          status: res.status,
          objectiveId: attempt.objectiveId,
        });
        return;
      }
      this.options.logger.warn('progress.rejected', {
        status: res.status,
        objectiveId: attempt.objectiveId,
      });
    } catch (err) {
      this.options.logger.warn('progress.unreachable', {
        objectiveId: attempt.objectiveId,
        error: err instanceof Error ? err.message : 'desconocido',
      });
      throw err;
    }
  }
}
