/**
 * Logger mínimo. Redacta cualquier valor que parezca una credencial antes de
 * escribir, como red de seguridad adicional a no pasarlas nunca.
 */
const SECRET_PATTERN = /sk-[A-Za-z0-9_-]{8,}/g;

export function redact(value: string): string {
  return value.replace(SECRET_PATTERN, 'sk-***');
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

function line(level: string, message: string, meta?: Record<string, unknown>): string {
  const payload = meta ? ` ${JSON.stringify(meta)}` : '';
  return redact(`${new Date().toISOString()} [${level}] ${message}${payload}`);
}

export const logger: Logger = {
  info: (m, meta) => console.log(line('info', m, meta)),
  warn: (m, meta) => console.warn(line('warn', m, meta)),
  error: (m, meta) => console.error(line('error', m, meta)),
};

export const silentLogger: Logger = { info() {}, warn() {}, error() {} };
