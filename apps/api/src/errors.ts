import type { ErrorCode } from '@english-practice/shared';

export interface ErrorDetail {
  path: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `${what} no existe`);
export const validation = (message: string, details?: ErrorDetail[]) =>
  new AppError(400, 'VALIDATION_ERROR', message, details);
export const sessionClosed = () => new AppError(409, 'SESSION_CLOSED', 'La sesión ya está cerrada');
export const evaluationUnavailable = (message = 'La evaluación no está disponible en este momento') =>
  new AppError(503, 'EVALUATION_UNAVAILABLE', message);
export const providerError = (message = 'El proveedor de IA no respondió correctamente') =>
  new AppError(502, 'PROVIDER_ERROR', message);
