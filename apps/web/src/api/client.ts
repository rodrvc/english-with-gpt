import {
  ChallengeExampleResponseSchema,
  ErrorResponseSchema,
  GetChallengeResponseSchema,
  HealthResponseSchema,
  ListChallengesResponseSchema,
  SessionResponseSchema,
  SubmitAttemptResponseSchema,
  API_PREFIX,
  type CreateSessionRequest,
  type ErrorCode,
  type ListChallengesQuery,
} from '@english-practice/shared';
import type { ZodType } from 'zod';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    public readonly details?: { path: string; message: string }[],
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function call<T>(schema: ZodType<T>, path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor. ¿Está corriendo la API?');
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ErrorResponseSchema.safeParse(body);
    if (parsed.success) {
      const e = parsed.data.error;
      throw new ApiError(res.status, e.code, e.message, e.details, e.retryAfterSeconds);
    }
    throw new ApiError(res.status, 'INTERNAL_ERROR', `Error inesperado (${res.status})`);
  }
  return schema.parse(body);
}

function query(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const api = {
  health: () => call(HealthResponseSchema, '/health'),
  listChallenges: (filters: ListChallengesQuery = {}) =>
    call(ListChallengesResponseSchema, `/challenges${query(filters)}`),
  getChallenge: (id: string) => call(GetChallengeResponseSchema, `/challenges/${encodeURIComponent(id)}`),
  getChallengeExample: (id: string) =>
    call(ChallengeExampleResponseSchema, `/challenges/${encodeURIComponent(id)}/example`),
  createSession: (input: CreateSessionRequest) =>
    call(SessionResponseSchema, '/sessions', { method: 'POST', body: JSON.stringify(input) }),
  getSession: (id: string) => call(SessionResponseSchema, `/sessions/${encodeURIComponent(id)}`),
  submitAttempt: (sessionId: string, text: string) =>
    call(SubmitAttemptResponseSchema, `/sessions/${encodeURIComponent(sessionId)}/attempts`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};
