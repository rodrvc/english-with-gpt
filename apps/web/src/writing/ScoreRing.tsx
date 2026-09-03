interface Props {
  score: number | null;
  delta: number | null;
  attemptNumber: number | null;
}

const R = 37;
const C = 2 * Math.PI * R;

export function ScoreRing({ score, delta, attemptNumber }: Props) {
  const value = score ?? 0;
  const offset = C * (1 - value / 100);
  return (
    <aside className="card score" aria-label="Puntaje">
      <div className="ring">
        <svg width="88" height="88" aria-hidden="true">
          <circle cx="44" cy="44" r={R} fill="none" stroke="var(--pink-100)" strokeWidth="9" />
          <circle
            cx="44"
            cy="44"
            r={R}
            fill="none"
            stroke="var(--pink-500)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={score === null ? C : offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="val">
          {score === null ? '—' : score}
          <small>/100</small>
        </div>
      </div>
      <div className="label">Score</div>
      {score !== null && attemptNumber !== null && (
        <div className={`delta ${delta === null ? 'flat' : delta < 0 ? 'down' : delta === 0 ? 'flat' : ''}`}>
          {delta === null
            ? 'Primer intento'
            : delta > 0
              ? `▲ +${delta} vs intento ${attemptNumber - 1}`
              : delta < 0
                ? `▼ ${delta} vs intento ${attemptNumber - 1}`
                : `= igual que intento ${attemptNumber - 1}`}
        </div>
      )}
    </aside>
  );
}
