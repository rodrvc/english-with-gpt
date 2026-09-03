import type { ZodType } from 'zod';
import { validation, type ErrorDetail } from '../errors.js';

/** Valida un valor contra un esquema compartido; lanza VALIDATION_ERROR con los campos. */
export function parseOrThrow<T>(schema: ZodType<T>, value: unknown, what: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const details: ErrorDetail[] = result.error.issues.map((issue) => ({
    path: issue.path.map(String).join('.') || '(root)',
    message: issue.message,
  }));
  return thrown(validation(`${what} inválido`, details));
}

function thrown(err: Error): never {
  throw err;
}
