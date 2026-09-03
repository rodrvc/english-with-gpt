import { useEffect, useState } from 'react';
import {
  CONTEXT_LABELS,
  CefrLevelSchema,
  ChallengeContextSchema,
  REGISTER_LABELS,
  type CefrLevel,
  type Challenge,
  type ChallengeContext,
} from '@english-practice/shared';
import { api } from '../api/client';
import { ErrorBanner, Loading } from '../components/Feedback';

interface Props {
  onStart: (input: { challengeId?: string; level?: CefrLevel; context?: ChallengeContext }) => Promise<void>;
  starting: boolean;
}

export function ChallengePicker({ onStart, starting }: Props) {
  const [level, setLevel] = useState<CefrLevel | ''>('');
  const [context, setContext] = useState<ChallengeContext | ''>('');
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setChallenges(null);
    api
      .listChallenges({ ...(level ? { level } : {}), ...(context ? { context } : {}) })
      .then((r) => !cancelled && setChallenges(r.challenges))
      .catch((e) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, [level, context]);

  const filters = { ...(level ? { level } : {}), ...(context ? { context } : {}) };

  return (
    <main className="wrap picker">
      <h1>Elige un desafío de escritura</h1>
      <p className="lead">Escribe en inglés, recibe correcciones ancladas a tu texto y reescribe hasta aprobar.</p>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      <div className="filters">
        <select value={level} onChange={(e) => setLevel(e.target.value as CefrLevel | '')} aria-label="Nivel CEFR">
          <option value="">Todos los niveles</option>
          {CefrLevelSchema.options.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select value={context} onChange={(e) => setContext(e.target.value as ChallengeContext | '')} aria-label="Contexto">
          <option value="">Todos los contextos</option>
          {ChallengeContextSchema.options.map((c) => (
            <option key={c} value={c}>
              {CONTEXT_LABELS[c]}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="button" disabled={starting || challenges?.length === 0} onClick={() => onStart(filters)}>
          {starting ? 'Iniciando…' : '🎲 Desafío al azar'}
        </button>
      </div>
      {challenges === null ? (
        <Loading label="Cargando desafíos…" />
      ) : challenges.length === 0 ? (
        <div className="empty">No hay desafíos con esos filtros.</div>
      ) : (
        <div className="challenge-list">
          {challenges.map((c) => (
            <button key={c.id} type="button" className="card challenge-item" disabled={starting} onClick={() => onStart({ challengeId: c.id })}>
              <span className="eyebrow">{CONTEXT_LABELS[c.context]}</span>
              <h3 lang="en">{c.prompt}</h3>
              <p>{c.description}</p>
              <span className="chips">
                <span className="chip neutral">Nivel {c.level}</span>
                <span className="chip neutral">{REGISTER_LABELS[c.register]}</span>
                <span className="chip neutral">{c.minWords}–{c.maxWords} palabras</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
