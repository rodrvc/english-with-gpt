import { CONTEXT_LABELS, REGISTER_LABELS, type Challenge } from '@english-practice/shared';
import { useCountdown } from './useCountdown';

interface Props {
  challenge: Challenge;
  startedAt: string;
  attemptNumber: number;
  passed: boolean;
  onRestartTimer: () => void;
  restarting: boolean;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ChallengeCard({ challenge, startedAt, attemptNumber, passed, onRestartTimer, restarting }: Props) {
  const remaining = useCountdown(startedAt, challenge.timeLimitSeconds, !passed);
  return (
    <section className="card prompt-card">
      <div className="eyebrow">Desafío · {CONTEXT_LABELS[challenge.context]}</div>
      <h1 lang="en">{challenge.prompt}</h1>
      <p>
        {challenge.description} Tono {REGISTER_LABELS[challenge.register].toLowerCase()}, {challenge.minWords}–{challenge.maxWords} palabras.
      </p>
      <div className="chips">
        {passed ? (
          <span className="chip">✅ Completado</span>
        ) : remaining > 0 ? (
          <span className="chip" title="Tiempo sugerido, no obligatorio">⏱ {formatClock(remaining)} restantes</span>
        ) : (
          <span className="chip warn" title="El tiempo es orientativo; puedes seguir escribiendo">⏱ Tiempo sugerido agotado</span>
        )}
        {!passed && (
          <button
            className="chip chip-action"
            type="button"
            disabled={restarting}
            onClick={onRestartTimer}
            title="Vuelve a poner el cronómetro en marcha desde ahora, sin perder tus intentos"
          >
            {restarting ? '…' : '↻ Reiniciar tiempo'}
          </button>
        )}
        <span className="chip neutral">Intento {attemptNumber}</span>
        <span className="chip neutral">Nivel {challenge.level}</span>
        <span className="chip neutral">{REGISTER_LABELS[challenge.register]}</span>
      </div>
    </section>
  );
}
