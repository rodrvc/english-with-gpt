import { useCallback, useEffect, useMemo, useState } from 'react';
import { PASS_THRESHOLD, type Attempt, type ChallengeExample, type Session } from '@english-practice/shared';
import { api } from '../api/client';
import { ErrorBanner, Loading } from '../components/Feedback';
import { TopBar } from '../components/TopBar';
import { BreakdownPanel } from '../writing/BreakdownPanel';
import { ChallengeCard } from '../writing/ChallengeCard';
import { ChallengePicker } from '../writing/ChallengePicker';
import { CorrectionsPanel } from '../writing/CorrectionsPanel';
import { ExamplePanel } from '../writing/ExamplePanel';
import { HighlightEditor } from '../writing/HighlightEditor';
import { ScoreRing } from '../writing/ScoreRing';
import { TipsPanel } from '../writing/TipsPanel';
import { countWords, surviveEdit } from '../writing/segments';

type EditorTab = 'write' | 'example' | 'phrases';

const TABS: { id: EditorTab; label: string }[] = [
  { id: 'write', label: 'Tu texto' },
  { id: 'example', label: 'Ejemplo' },
  { id: 'phrases', label: 'Frases útiles' },
];

const SESSION_KEY = 'english-practice.writing.sessionId';

function readStoredSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function storeSessionId(id: string | null): void {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

export function WritingPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [starting, setStarting] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [showMarks, setShowMarks] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>('write');
  const [example, setExample] = useState<ChallengeExample | null>(null);
  const [exampleLoading, setExampleLoading] = useState(false);
  const [exampleError, setExampleError] = useState<unknown>(null);
  const [restarting, setRestarting] = useState(false);

  // Restaurar la sesión previa (si existe) al abrir la app.
  useEffect(() => {
    const stored = readStoredSessionId();
    if (!stored) {
      setBooting(false);
      return;
    }
    api
      .getSession(stored)
      .then((r) => {
        setSession(r.session);
        const last = r.session.attempts.at(-1);
        if (last) setText(last.text);
      })
      .catch(() => storeSessionId(null))
      .finally(() => setBooting(false));
  }, []);

  const lastAttempt: Attempt | null = session?.attempts.at(-1) ?? null;
  const evaluation = lastAttempt?.evaluation ?? null;
  const evaluatedText = lastAttempt?.text ?? null;
  const dirty = evaluatedText !== null && text !== evaluatedText;

  // Marcas vigentes tras editar: sin transformar posiciones dentro de la zona editada.
  const liveCorrections = useMemo(() => {
    if (!evaluation || evaluatedText === null) return [];
    return surviveEdit(evaluatedText, text, evaluation.corrections);
  }, [evaluation, evaluatedText, text]);
  const liveIds = useMemo(() => new Set(liveCorrections.map((c) => c.id)), [liveCorrections]);

  const start = useCallback(async (input: Parameters<typeof api.createSession>[0]) => {
    setStarting(true);
    setError(null);
    try {
      const r = await api.createSession(input);
      setSession(r.session);
      storeSessionId(r.session.id);
      setText('');
      setActiveId(null);
      setShowMarks(true);
    } catch (e) {
      setError(e);
    } finally {
      setStarting(false);
    }
  }, []);

  const submit = useCallback(async () => {
    if (!session || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.submitAttempt(session.id, text);
      setSession(r.session);
      setActiveId(null);
      // El texto NO se toca: sigue siendo exactamente lo que escribió el estudiante.
    } catch (e) {
      setError(e);
    } finally {
      setSubmitting(false);
    }
  }, [session, submitting, text]);

  const reset = useCallback(() => {
    setSession(null);
    storeSessionId(null);
    setText('');
    setActiveId(null);
    setError(null);
    setTab('write');
    setExample(null);
    setExampleError(null);
  }, []);

  const restartTimer = useCallback(async () => {
    if (!session || restarting) return;
    setRestarting(true);
    try {
      const r = await api.restartTimer(session.id);
      setSession(r.session);
    } catch (e) {
      setError(e);
    } finally {
      setRestarting(false);
    }
  }, [session, restarting]);

  const challengeId = session?.challenge.id ?? null;

  const loadExample = useCallback(() => {
    if (!challengeId) return;
    setExampleLoading(true);
    setExampleError(null);
    api
      .getChallengeExample(challengeId)
      .then((r) => setExample(r.example))
      .catch((err) => setExampleError(err))
      .finally(() => setExampleLoading(false));
  }, [challengeId]);

  // El ejemplo se pide la primera vez que el estudiante abre una de sus
  // pestañas, no al cargar el desafío: quien no lo consulta no lo paga.
  useEffect(() => {
    if (tab === 'write' || example || exampleLoading || exampleError) return;
    loadExample();
  }, [tab, example, exampleLoading, exampleError, loadExample]);

  if (booting) {
    return (
      <>
        <TopBar />
        <Loading label="Recuperando tu sesión…" />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <TopBar />
        <ChallengePicker onStart={start} starting={starting} />
      </>
    );
  }

  const passed = session.status === 'passed';
  const words = countWords(text);
  const errorsLeft = liveCorrections.filter((c) => c.severity === 'error').length;
  const canSubmit = !passed && !submitting && text.trim().length > 0;

  return (
    <>
      <TopBar level={session.challenge.level} />
      <main className="wrap">
        <ErrorBanner error={error} onDismiss={() => setError(null)} />
        {passed && (
          <div className="banner success" role="status">
            <span style={{ fontSize: 20 }}>🎉</span>
            <div style={{ flex: 1 }}>
              <b>¡Completaste el desafío!</b> Alcanzaste {lastAttempt?.evaluation.score} puntos sin errores objetivos.
              {liveCorrections.length > 0 && ' Las sugerencias de estilo quedan como mejoras opcionales.'}
            </div>
            <button className="btn btn-primary" type="button" onClick={reset}>
              Nuevo desafío →
            </button>
          </div>
        )}
        {!passed && evaluation && evaluation.score >= PASS_THRESHOLD && errorsLeft > 0 && (
          <div className="banner info" role="status">
            Tu puntaje ya alcanza el umbral de {PASS_THRESHOLD}, pero quedan <b>&nbsp;{errorsLeft}&nbsp;</b> {errorsLeft === 1 ? 'error' : 'errores'} por resolver para aprobar.
          </div>
        )}

        <div className="head">
          <ChallengeCard
            challenge={session.challenge}
            startedAt={session.startedAt}
            attemptNumber={session.attempts.length + (passed ? 0 : 1)}
            passed={passed}
            onRestartTimer={restartTimer}
            restarting={restarting}
          />
          <ScoreRing score={evaluation?.score ?? null} delta={lastAttempt?.scoreDelta ?? null} attemptNumber={lastAttempt?.number ?? null} />
        </div>

        <div className="grid">
          <section className="panel" aria-label="Tu texto">
            <div className="panel-head">
              <div className="tabs" role="tablist" aria-label="Vistas del desafío">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    className="tab"
                    role="tab"
                    type="button"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {tab === 'write' && evaluation && (
                <span className="count">
                  {liveCorrections.length} {liveCorrections.length === 1 ? 'sugerencia' : 'sugerencias'}
                </span>
              )}
              <div className="spacer" />
              {tab === 'write' && evaluation && (
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  aria-pressed={!showMarks}
                  onClick={() => {
                    setShowMarks((v) => !v);
                    setActiveId(null);
                  }}
                >
                  {showMarks ? '👁 Ocultar marcas' : '👁 Mostrar marcas'}
                </button>
              )}
            </div>

            {tab === 'write' ? (
              <HighlightEditor
                text={text}
                onChange={(t) => {
                  setText(t);
                  if (activeId && !liveIds.has(activeId)) setActiveId(null);
                }}
                corrections={liveCorrections}
                showMarks={showMarks}
                activeId={activeId}
                onActivate={setActiveId}
                disabled={passed}
                placeholder="Escribe aquí tu texto en inglés…"
              />
            ) : (
              <div className="example-stack">
                <ExamplePanel
                  example={example}
                  loading={exampleLoading}
                  error={exampleError}
                  view={tab === 'example' ? 'example' : 'phrases'}
                  onRetry={loadExample}
                />
              </div>
            )}

            <div className="editor-foot">
              {tab !== 'write' ? (
                <>
                  <span className="meta">
                    {tab === 'example'
                      ? 'Un texto modelo para este desafío. Léelo y vuelve a escribir el tuyo.'
                      : 'Expresiones que puedes reutilizar en tu texto.'}
                  </span>
                  <div className="spacer" />
                  <button className="btn btn-primary" type="button" onClick={() => setTab('write')}>
                    ← Volver a mi texto
                  </button>
                </>
              ) : (
              <>
              <span className="meta">
                <b>{words}</b> palabras
                {evaluation && (
                  <>
                    {' · '}
                    <b>{liveCorrections.length}</b> correcciones pendientes
                  </>
                )}
              </span>
              {dirty && !passed && <span className="meta dirty">✎ Cambios sin revisar</span>}
              {submitting && (
                <span className="meta">
                  <span className="spinner" /> Evaluando con IA… puedes seguir editando
                </span>
              )}
              <div className="spacer" />
              {!passed && (
                <button className="btn btn-ghost" type="button" onClick={reset}>
                  Cambiar desafío
                </button>
              )}
              <button className="btn btn-primary" type="button" disabled={!canSubmit} onClick={submit}>
                {submitting ? 'Revisando…' : evaluation ? 'Volver a revisar →' : 'Revisar con IA →'}
              </button>
              </>
              )}
            </div>
          </section>

          <div className="side">
            <CorrectionsPanel
              corrections={evaluation?.corrections ?? []}
              liveIds={liveIds}
              activeId={activeId}
              onActivate={setActiveId}
              hasEvaluation={evaluation !== null}
            />
            <TipsPanel tips={evaluation?.tips ?? []} summary={evaluation?.summary ?? null} />
            <BreakdownPanel breakdown={evaluation?.breakdown ?? null} reasons={evaluation?.breakdownReasons ?? null} />
          </div>
        </div>
      </main>
    </>
  );
}
