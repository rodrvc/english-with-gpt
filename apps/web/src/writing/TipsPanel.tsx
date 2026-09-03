import type { Tip } from '@english-practice/shared';

const ICONS = ['🎯', '📈', '💡', '✨'];

export function TipsPanel({ tips, summary }: { tips: Tip[]; summary: string | null }) {
  return (
    <section className="panel" aria-label="Consejos de la IA">
      <div className="panel-head">
        <h2>IA · Consejos</h2>
      </div>
      {tips.length === 0 ? (
        <div className="empty">Aquí verás patrones de error, tu evolución y el siguiente paso concreto.</div>
      ) : (
        <div className="tips">
          {summary && (
            <div className="tip">
              <span className="ic">📝</span>
              <div>
                <h3>Resumen</h3>
                <p>{summary}</p>
              </div>
            </div>
          )}
          {tips.map((t, i) => (
            <div className="tip" key={i}>
              <span className="ic">{ICONS[i % ICONS.length]}</span>
              <div>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
