import { ApiError } from '../api/client';

const CODE_HINTS: Record<string, string> = {
  RATE_LIMITED: 'Has enviado demasiadas revisiones seguidas.',
  EVALUATION_UNAVAILABLE: 'La IA no devolvió una evaluación válida. Vuelve a intentarlo.',
  PROVIDER_ERROR: 'Hubo un problema con el proveedor de IA.',
  SESSION_CLOSED: 'Esta sesión ya terminó. Inicia un nuevo desafío.',
  NOT_FOUND: 'No encontramos ese recurso.',
  VALIDATION_ERROR: 'Revisa los datos enviados.',
  NETWORK_ERROR: 'Sin conexión con la API.',
};

export function ErrorBanner({ error, onDismiss }: { error: unknown; onDismiss?: () => void }) {
  if (!error) return null;
  const apiError = error instanceof ApiError ? error : null;
  const message = apiError?.message ?? (error instanceof Error ? error.message : String(error));
  return (
    <div className="banner error" role="alert">
      <div style={{ flex: 1 }}>
        {apiError && <div className="code">{apiError.code}{apiError.retryAfterSeconds ? ` · reintenta en ${apiError.retryAfterSeconds}s` : ''}</div>}
        <div>{message}</div>
        {apiError && CODE_HINTS[apiError.code] && CODE_HINTS[apiError.code] !== message && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{CODE_HINTS[apiError.code]}</div>
        )}
        {apiError?.details && apiError.details.length > 0 && (
          <ul>
            {apiError.details.map((d, i) => (
              <li key={i}>
                <b>{d.path}</b>: {d.message}
              </li>
            ))}
          </ul>
        )}
      </div>
      {onDismiss && (
        <button className="btn btn-ghost btn-sm" onClick={onDismiss} type="button">
          Cerrar
        </button>
      )}
    </div>
  );
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="loading-block" role="status">
      <span className="spinner" /> {label}
    </div>
  );
}
