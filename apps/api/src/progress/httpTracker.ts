import type { Logger } from '../logger.js';
import { CATEGORY_LABELS } from '@english-practice/shared';
import { objectiveFor, TRACKED_CATEGORIES } from './tracker.js';
import type {
  MasteryLevel,
  ObjectiveProgress,
  ProgressAttempt,
  ProgressTracker,
} from './tracker.js';

/** Forma que devuelve el motor. Solo se lee lo que la vista usa. */
interface EngineState {
  objective_id: string;
  level: string;
  score: number;
  total_attempts: number;
  correct_attempts: number;
  is_due: boolean;
  next_review_at: string | null;
}

const LEVELS = new Set<MasteryLevel>(['unassessed', 'weak', 'learning', 'competent', 'mastered']);

/** El motor los serializa en mayúsculas (`WEAK`), su enum interno. */
function toLevel(value: string): MasteryLevel {
  const level = value.toLowerCase();
  if (LEVELS.has(level as MasteryLevel)) return level as MasteryLevel;
  // No se degrada a `unassessed`: esa palabra significa "no hay evidencia" y
  // la vista la usa para decírselo al estudiante. Un nivel que esta versión
  // no conoce no es evidencia ausente, es una pregunta sin responder, y eso
  // se trata como lectura fallida.
  throw new Error(`El motor devolvió un nivel desconocido: ${value}`);
}

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
  readonly configured = true;
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
    for (const [index, attempt] of attempts.entries()) {
      await this.post(attempt, deadline, `${index + 1}/${attempts.length}`);
    }
  }

  /**
   * Crea el tópico si falta y da de alta los objetivos. Ambas operaciones son
   * idempotentes, así que correrlo en cada arranque es seguro.
   */
  async register(): Promise<void> {
    const base = `${this.options.baseUrl}/topics`;
    const topic = encodeURIComponent(this.options.topicId);
    // 409 es que el tópico ya existe, que es el caso normal tras el primer
    // arranque: no es un fallo.
    const created = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_id: this.options.topicId, name: 'English Writing' }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!created.ok && created.status !== 409) {
      throw new Error(`El motor rechazó el tópico con ${created.status}`);
    }

    const res = await fetch(`${base}/${topic}/objectives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectives: TRACKED_CATEGORIES.map((category) => ({
          objective_id: objectiveFor(category),
          title: CATEGORY_LABELS[category],
        })),
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new Error(`El motor rechazó los objetivos con ${res.status}`);
  }

  /**
   * A diferencia de `record`, una lectura fallida sí se propaga entera: la
   * vista tiene que poder decir "no pude preguntar" en vez de mostrar un
   * historial vacío que parece un estudiante sin progreso.
   */
  async states(): Promise<ObjectiveProgress[]> {
    const url = `${this.options.baseUrl}/topics/${encodeURIComponent(this.options.topicId)}/objectives/states`;
    const res = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    if (!res.ok) throw new Error(`El motor respondió ${res.status}`);
    const body = (await res.json()) as EngineState[];
    return body.map((state) => ({
      objectiveId: state.objective_id,
      level: toLevel(state.level),
      // El motor lo entrega de 0 a 1 y la app muestra puntajes de 0 a 100 en
      // todas partes. Se convierte acá, que es donde se conocen sus unidades.
      score: Math.round(state.score * 100),
      totalAttempts: state.total_attempts,
      correctAttempts: state.correct_attempts,
      isDue: state.is_due,
      nextReviewAt: state.next_review_at,
    }));
  }

  /** Lanza si el motor no es alcanzable; un rechazo suyo no es excepción. */
  private async post(attempt: ProgressAttempt, signal: AbortSignal, position: string): Promise<void> {
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
      // Agotar el presupuesto y no poder conectarse se ven igual desde acá,
      // pero piden respuestas distintas: el primero puede ser un motor sano y
      // lento. La posición dice además cuánto del reporte alcanzó a llegar.
      this.options.logger.warn(signal.aborted ? 'progress.budget_spent' : 'progress.unreachable', {
        objectiveId: attempt.objectiveId,
        position,
        error: err instanceof Error ? err.message : 'desconocido',
      });
      throw err;
    }
  }
}
