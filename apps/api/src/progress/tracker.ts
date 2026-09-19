import { CorrectionCategorySchema, type CorrectionCategory } from '@english-practice/shared';

/**
 * Un hecho que el motor de seguimiento cuenta: en esta fecha, sobre este
 * objetivo, la respuesta fue correcta o incorrecta. Inmutable por contrato.
 */
export interface ProgressAttempt {
  /** Identificador estable del intento. Repetirlo es un no-op en el motor. */
  attemptId: string;
  objectiveId: string;
  correct: boolean;
  at: string;
  note?: string;
}

/**
 * Frontera con el motor de seguimiento. Writing decide si una respuesta fue
 * correcta; el motor solo lleva la cuenta.
 *
 * `record` propaga sus fallos. Quien llama decide qué hacer con ellos, y hoy
 * esa decisión —que el historial no puede romper la práctica— vive en la ruta,
 * en un solo lugar. La alternativa, que el adaptador se los trague, deja la
 * decisión tomada dos veces y hace que una futura lectura (qué toca repasar)
 * herede el hábito de devolver vacío en silencio, que ahí sí sería un error:
 * "nada pendiente" y "no pude preguntar" no son lo mismo.
 *
 * Por lo mismo, quien llame a `record` debe atrapar: un rechazo sin manejar
 * es fatal para el proceso, y este no es un fallo que valga un proceso.
 */
export interface ProgressTracker {
  /** `false` en el puerto inerte: no hay motor detrás. */
  readonly configured: boolean;
  /**
   * Da de alta los objetivos que esta app sigue. Idempotente: el motor los
   * absorbe sin duplicar historial. Sin esto, cada hecho se rechaza con 404 y
   * el progreso no existe.
   */
  register(): Promise<void>;
  record(attempts: ProgressAttempt[]): Promise<void>;
  /**
   * Estado de cada objetivo. Lanza si no se pudo preguntar: devolver una lista
   * vacía haría indistinguible "todavía no hay evidencia" de "no hubo
   * respuesta", y son cosas distintas que la UI muestra distinto.
   */
  states(): Promise<ObjectiveProgress[]>;
}

/** Implementación inerte: el motor no está configurado. */
export const noopTracker: ProgressTracker = {
  configured: false,
  async register(): Promise<void> {},
  async record(): Promise<void> {},
  async states(): Promise<ObjectiveProgress[]> {
    return [];
  },
};

/**
 * El objetivo es la categoría de corrección. Es un identificador estable: si
 * cambia, el motor pierde el hilo del historial, porque `objective_id` es la
 * clave de los intentos.
 */
export function objectiveFor(category: CorrectionCategory): string {
  return `writing-${category}`;
}

/**
 * Las categorías que el motor sigue como objetivos: todas.
 *
 * Derivado, no copiado. Una lista a mano acepta que alguien agregue una
 * categoría a la taxonomía sin que falle nada: esa categoría simplemente
 * dejaría de llegar al motor, y el síntoma aparecería meses después como un
 * nivel que nunca se mueve.
 */
export const TRACKED_CATEGORIES: readonly CorrectionCategory[] = CorrectionCategorySchema.options;

/** Nivel de dominio de un objetivo, tal como lo nombra el motor. */
export type MasteryLevel = 'unassessed' | 'weak' | 'learning' | 'competent' | 'mastered';

/** Lo que el motor sabe de un objetivo, proyectado desde su historial. */
export interface ObjectiveProgress {
  objectiveId: string;
  level: MasteryLevel;
  score: number;
  totalAttempts: number;
  correctAttempts: number;
  isDue: boolean;
  nextReviewAt: string | null;
}

/** Inverso de `objectiveFor`. Ignora objetivos que esta app no conoce. */
export function categoryForObjective(objectiveId: string): CorrectionCategory | null {
  const suffix = objectiveId.startsWith('writing-') ? objectiveId.slice('writing-'.length) : null;
  const match = TRACKED_CATEGORIES.find((category) => category === suffix);
  return match ?? null;
}
