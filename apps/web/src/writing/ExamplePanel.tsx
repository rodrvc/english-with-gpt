import type { ChallengeExample, UsefulPhrase } from '@english-practice/shared';

const STAGE_LABELS: Record<UsefulPhrase['stage'], string> = {
  opening: 'Para abrir',
  body: 'Para desarrollar',
  closing: 'Para cerrar',
};

const STAGE_ORDER: UsefulPhrase['stage'][] = ['opening', 'body', 'closing'];

interface Props {
  example: ChallengeExample | null;
  loading: boolean;
  error: unknown;
  view: 'example' | 'phrases';
  onRetry: () => void;
}

/**
 * Vistas de referencia del desafío: el texto modelo y las frases reutilizables.
 *
 * Ocupan el mismo espacio que el editor —el estudiante alterna entre pestañas—
 * en lugar de mostrarse al lado, para que leer el modelo sea un momento aparte
 * de escribir y no una tentación permanente de copiar.
 */
export function ExamplePanel({ example, loading, error, view, onRetry }: Props) {
  if (loading) {
    return (
      <div className="example-state">
        <span className="spinner" />
        <p>Preparando el ejemplo…</p>
      </div>
    );
  }

  if (error || !example) {
    return (
      <div className="example-state">
        <p>No se pudo cargar el ejemplo.</p>
        <button className="btn btn-ghost" type="button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }

  if (view === 'example') {
    return (
      <article className="example-text" lang="en">
        {example.text.split(/\n{2,}/).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </article>
    );
  }

  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    items: example.phrases.filter((p) => p.stage === stage),
  })).filter((group) => group.items.length > 0);

  if (byStage.length === 0) {
    return (
      <div className="example-state">
        <p>Este desafío no trae frases sugeridas.</p>
      </div>
    );
  }

  return (
    <div className="phrases">
      {byStage.map(({ stage, items }) => (
        <section key={stage} className="phrase-group">
          <h3>{STAGE_LABELS[stage]}</h3>
          <ul>
            {items.map((p, i) => (
              <li key={i}>
                <span className="phrase" lang="en">
                  {p.phrase}
                </span>
                <span className="phrase-meaning">{p.meaning}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
