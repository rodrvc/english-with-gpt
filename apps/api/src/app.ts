import express, { type Express } from 'express';
import cors from 'cors';
import { API_PREFIX } from '@english-practice/shared';
import type { Logger } from './logger.js';
import { errorHandler, notFoundHandler } from './http/errorHandler.js';
import { createRouter, type RouteDeps } from './http/routes.js';

export interface AppOptions extends RouteDeps {
  allowedOrigins: string[];
  logger: Logger;
}

export function createApp(options: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Sin cabecera Origin (curl, clientes no navegador) → permitido sin CORS.
        if (!origin) return callback(null, false);
        callback(null, options.allowedOrigins.includes(origin));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      exposedHeaders: ['Retry-After', 'RateLimit', 'RateLimit-Policy'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '256kb' }));

  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      options.logger.info('http', { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - startedAt });
    });
    next();
  });

  app.use(API_PREFIX, createRouter(options));
  app.use(notFoundHandler);
  app.use(errorHandler(options.logger));
  return app;
}
