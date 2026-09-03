import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ErrorResponse } from '@english-practice/shared';
import { AppError } from '../errors.js';
import type { Logger } from '../logger.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ErrorResponse = { error: { code: 'NOT_FOUND', message: 'Recurso no encontrado' } };
  res.status(404).json(body);
};

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (err instanceof AppError) {
      const body: ErrorResponse = {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
          ...(err.retryAfterSeconds !== undefined ? { retryAfterSeconds: err.retryAfterSeconds } : {}),
        },
      };
      if (err.retryAfterSeconds !== undefined) res.setHeader('Retry-After', String(err.retryAfterSeconds));
      res.status(err.status).json(body);
      return;
    }
    // Cuerpo JSON malformado (body-parser).
    if (isBodyParseError(err)) {
      const body: ErrorResponse = { error: { code: 'VALIDATION_ERROR', message: 'El cuerpo no es JSON válido' } };
      res.status(400).json(body);
      return;
    }
    logger.error('unhandled', { name: err instanceof Error ? err.name : typeof err, message: err instanceof Error ? err.message : String(err) });
    const body: ErrorResponse = { error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } };
    res.status(500).json(body);
  };
}

function isBodyParseError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'type' in err && (err as { type: unknown }).type === 'entity.parse.failed';
}
