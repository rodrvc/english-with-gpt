import { CATEGORY_LABELS, type Correction } from '@english-practice/shared';

interface Props {
  corrections: Correction[];
  liveIds: Set<string>;
  activeId: string | null;
  onActivate: (id: string | null) => void;
  hasEvaluation: boolean;
}

/**
 * Lista de correcciones propuestas. Son información adyacente: el estudiante
 * reescribe por sí mismo. No existe ningún botón de "aplicar".
 */
export function CorrectionsPanel({ corrections, liveIds, activeId, onActivate, hasEvaluation }: Props) {
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
