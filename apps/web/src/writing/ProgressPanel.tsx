import { CATEGORY_LABELS, type MasteryLevel, type ObjectiveProgress } from '@english-practice/shared';

const LEVEL_LABELS: Record<MasteryLevel, string> = {
  unassessed: 'Sin evidencia',
  weak: 'Flojo',
  learning: 'Aprendiendo',
  competent: 'Competente',
  mastered: 'Dominado',
};

interface Props {
  objectives: ObjectiveProgress[];
  /** `false` cuando no se pudo preguntar al motor. */
  available: boolean;
}

/**
 * Nivel por categoría, según el historial que lleva el motor de seguimiento.
 *
 * Tres estados vacíos distintos, porque significan cosas distintas: no hay
 * motor configurado, no se pudo preguntar, o todavía no hay evidencia. El
 * último es una respuesta legítima —el motor no asigna nivel con menos de dos
 * intentos— y decirle "vas en cero" a alguien que recién empieza sería falso.
 */
export function ProgressPanel({ objectives, available }: Props) {
  const assessed = objectives.filter((o) => o.level !== 'unassessed');
  const due = objectives.filter((o) => o.isDue);

  return (
    <section className="panel" aria-label="Tu progreso">
      <div className="panel-head">
        <h2>Tu progreso</h2>
        {available && assessed.length > 0 && <span className="count">{assessed.length}</span>}
        <div className="spacer" />
        {available && due.length > 0 && (
          <span className="meta">
            <b>{due.length}</b> {due.length === 1 ? 'por repasar' : 'por repasar'}
          </span>
        )}
      </div>

      {!available && (
        <div className="empty">
          No pudimos consultar tu progreso ahora. Tu práctica no se ve afectada.
        </div>
      )}
      {available && assessed.length === 0 && (
        <div className="empty">
          Todavía no hay evidencia suficiente. Practica un par de veces y aquí verás tu nivel por
          categoría.
        </div>
      )}
      {available && assessed.length > 0 && (
        <ul className="mastery-list">
          {assessed.map((objective) => (
            <li key={objective.category} className={`mastery ${objective.level}`}>
              <span className="mastery-name">{CATEGORY_LABELS[objective.category]}</span>
              <span className="mastery-level">{LEVEL_LABELS[objective.level]}</span>
              {objective.isDue && <span className="mastery-due">Toca repasar</span>}
              <span className="mastery-score" aria-label={`Puntaje ${Math.round(objective.score)}`}>
                {Math.round(objective.score)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
