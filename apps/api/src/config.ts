export interface Config {
  port: number;
  openaiApiKey: string;
  openaiModel: string;
  webOrigins: string[];
  databasePath: string;
  maxTextLength: number;
  rateLimitMax: number;
  rateLimitWindowSeconds: number;
}

export class ConfigError extends Error {}

function intOr(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new ConfigError(`Valor inválido para entero positivo: ${value}`);
  return n;
}

/**
 * Lee la configuración del proceso. Falla si falta la credencial del proveedor.
 * El mensaje de error nunca incluye valores, solo nombres de variables.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const openaiApiKey = env.OPENAI_API_KEY?.trim();
  if (!openaiApiKey) {
    throw new ConfigError('Falta la variable de configuración OPENAI_API_KEY');
  }
  return {
    port: intOr(env.PORT, 3001),
    openaiApiKey,
    openaiModel: env.OPENAI_MODEL?.trim() || 'gpt-5.4-mini',
    webOrigins: (env.WEB_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    databasePath: env.DATABASE_PATH?.trim() || './data/practice.db',
    maxTextLength: intOr(env.MAX_TEXT_LENGTH, 4000),
    rateLimitMax: intOr(env.RATE_LIMIT_MAX, 10),
    rateLimitWindowSeconds: intOr(env.RATE_LIMIT_WINDOW_SECONDS, 60),
  };
}
