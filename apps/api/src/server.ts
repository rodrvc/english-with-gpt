import { createApp } from './app.js';
import { ConfigError, loadConfig } from './config.js';
import { ChallengeRepository } from './db/challengeRepository.js';
import { openDatabase } from './db/database.js';
import { CHALLENGE_SEED } from './db/seed.js';
import { SessionRepository } from './db/sessionRepository.js';
import { Evaluator } from './evaluation/evaluator.js';
import { ExampleGenerator } from './evaluation/example.js';
import { OpenAIEvaluationProvider } from './evaluation/openaiProvider.js';
import { logger } from './logger.js';

function main(): void {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      logger.error(`Configuración inválida: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const db = openDatabase(config.databasePath);
  const challenges = new ChallengeRepository(db);
  challenges.upsertMany(CHALLENGE_SEED);
  const sessions = new SessionRepository(db, challenges);

  const provider = new OpenAIEvaluationProvider({ apiKey: config.openaiApiKey, model: config.openaiModel, logger });
  const evaluator = new Evaluator(provider, logger);
  const examples = new ExampleGenerator({ apiKey: config.openaiApiKey, model: config.openaiModel, logger });

  const app = createApp({
    challenges,
    sessions,
    evaluator,
    examples,
    maxTextLength: config.maxTextLength,
    evaluationAvailable: true,
    rateLimit: { max: config.rateLimitMax, windowSeconds: config.rateLimitWindowSeconds },
    allowedOrigins: config.webOrigins,
    logger,
  });

  const server = app.listen(config.port, () => {
    logger.info('api.listening', { port: config.port, model: config.openaiModel, origins: config.webOrigins });
  });

  const shutdown = (signal: string) => {
    logger.info('api.shutdown', { signal });
    server.close(() => {
      db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
