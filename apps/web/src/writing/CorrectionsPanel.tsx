import { CATEGORY_LABELS, type Correction, type CorrectionCategory } from '@english-practice/shared';

interface Props {
  corrections: Correction[];
  /** Categorías que el texto ejercitó y resolvió bien. */
  exercised: CorrectionCategory[];
  liveIds: Set<string>;
  activeId: string | null;
  onActivate: (id: string | null) => void;
  hasEvaluation: boolean;
}

/**
 * Lo que el texto necesita arreglar y, debajo, lo que resolvió bien. Ambas son
 * información adyacente: el estudiante reescribe por sí mismo. No existe
 * ningún botón de "aplicar".
 */
export function CorrectionsPanel({ corrections, exercised, liveIds, activeId, onActivate, hasEvaluation }: Props) {
  const errors = corrections.filter((c) => c.severity === 'error').length;
  return (
    <section className="panel" aria-label="Correcciones posibles">
      <div className="panel-head">
        <h2>Correcciones posibles</h2>
        {hasEvaluation && <span className="count">{corrections.length}</span>}
        <div className="spacer" />
        {hasEvaluation && corrections.length > 0 && (
          <span className="meta">
            <b>{errors}</b> {errors === 1 ? 'error' : 'errores'} · <b>{corrections.length - errors}</b> estilo
          </span>
        )}
      </div>
      {!hasEvaluation && <div className="empty">Envía tu texto a revisión para recibir correcciones ancladas a tu redacción.</div>}
      {hasEvaluation && corrections.length === 0 && <div className="empty">Sin correcciones. ¡Buen trabajo!</div>}
      {hasEvaluation && exercised.length > 0 && (
        <section className="exercised" aria-label="Lo que resolviste bien">
          <h3 className="exercised-head">Resolviste bien</h3>
          <ul className="exercised-list">
            {exercised.map((category) => (
              <li key={category}>{CATEGORY_LABELS[category]}</li>
            ))}
          </ul>
        </section>
      )}
      <div className="fix-list">
      {corrections.map((c) => {
        const live = liveIds.has(c.id);
        return (
          <button
            key={c.id}
            type="button"
            className={`fix ${c.severity === 'style' ? 'style' : ''} ${activeId === c.id ? 'active' : ''} ${live ? '' : 'stale'}`}
            onClick={() => onActivate(activeId === c.id ? null : c.id)}
            aria-pressed={activeId === c.id}
          >
            <span className="bullet" />
            <span className="body">
              <span className="kind">
                {CATEGORY_LABELS[c.category]} · {c.severity === 'error' ? 'error' : 'estilo'}
                {!live && <span className="stale-tag">tramo editado</span>}
              </span>
              <span className="from" lang="en" style={{ display: 'block' }}>{c.original}</span>
              <span className="to" lang="en" style={{ display: 'block' }}>{c.suggestion}</span>
              <span className="why" style={{ display: 'block' }}>{c.explanation}</span>
            </span>
          </button>
        );
      })}
      </div>
    </section>
  );
}
