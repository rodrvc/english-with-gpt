import type { BreakdownReasons, ScoreBreakdown } from '@english-practice/shared';

const DIMENSIONS: { key: keyof ScoreBreakdown; label: string }[] = [
  { key: 'grammar', label: 'Gramática' },
  { key: 'vocabulary', label: 'Vocabulario' },
  { key: 'coherence', label: 'Coherencia' },
  { key: 'register', label: 'Registro / tono' },
];

interface Props {
  breakdown: ScoreBreakdown | null;
  reasons: BreakdownReasons | null;
}

/**
 * Puntaje por dimensión con su motivo debajo.
 *
 * El número solo no dice qué corregir: "coherencia 15" no revela que el texto
 * no responde a lo que pedía el desafío. La razón lo hace explícito junto al
 * dato que la provoca.
 */
export function BreakdownPanel({ breakdown, reasons }: Props) {
  return (
    <section className="panel" aria-label="Desglose">
      <div className="panel-head">
        <h2>Desglose</h2>
      </div>
      <div className="bars">
        {DIMENSIONS.map((d) => {
          const value = breakdown ? breakdown[d.key] : 0;
          const reason = reasons?.[d.key]?.trim();
          return (
            <div className="bar" key={d.key}>
              <div className="bar-top">
                <b>{d.label}</b>
                <span>{breakdown ? value : '—'}</span>
              </div>
              <div className="track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={d.label}>
                <div className="fill" style={{ width: `${value}%` }} />
              </div>
              {reason && <p className="bar-reason">{reason}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
