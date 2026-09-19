import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { HttpProgressTracker } from './httpTracker.js';
import { silentLogger } from '../logger.js';
import type { ProgressAttempt } from './tracker.js';

interface Received {
  method: string;
  url: string;
  body: Record<string, unknown>;
}

/**
 * Congela la forma exacta que espera el motor. Si su contrato cambia, esto
 * falla aquí y no en silencio contra una API real.
 */
function serve(status: number): Promise<{ url: string; received: Received[]; server: Server }> {
  const received: Received[] = [];
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      received.push({ method: req.method ?? '', url: req.url ?? '', body: JSON.parse(raw || '{}') });
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end('{}');
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ url: `http://127.0.0.1:${port}`, received, server });
    });
  });
}

const attempt: ProgressAttempt = {
  attemptId: 'a1:grammar:miss',
  objectiveId: 'writing-grammar',
  correct: false,
  at: '2026-09-19T10:00:00.000Z',
  note: '2 errores',
};

let open: Server | undefined;
afterEach(() => open?.close());

describe('HttpProgressTracker', () => {
  it('envía el hecho a la ruta del objetivo con el cuerpo que el motor espera', async () => {
    const { url, received, server } = await serve(201);
    open = server;
    await new HttpProgressTracker({ baseUrl: url, topicId: 'english-writing', logger: silentLogger }).record([attempt]);

    expect(received).toHaveLength(1);
    expect(received[0]!.method).toBe('POST');
    expect(received[0]!.url).toBe('/topics/english-writing/objectives/writing-grammar/attempts');
    expect(received[0]!.body).toEqual({
      attempt_id: 'a1:grammar:miss',
      correct: false,
      at: '2026-09-19T10:00:00.000Z',
      kind: 'exercise',
      note: '2 errores',
    });
  });

  it('trata el 409 como éxito: es el mismo hecho reportado dos veces', async () => {
    const { url, server } = await serve(409);
    open = server;
    await expect(
      new HttpProgressTracker({ baseUrl: url, topicId: 't', logger: silentLogger }).record([attempt]),
    ).resolves.toBeUndefined();
  });

  it('un rechazo del motor no es excepción: entendió y dijo que no', async () => {
    const { url, server } = await serve(400);
    open = server;
    await expect(
      new HttpProgressTracker({ baseUrl: url, topicId: 't', logger: silentLogger }).record([attempt]),
    ).resolves.toBeUndefined();
  });

  it('propaga un motor inalcanzable, sin intentar los hechos restantes', async () => {
    const tracker = new HttpProgressTracker({
      // Puerto cerrado: la conexión se rechaza de inmediato.
      baseUrl: 'http://127.0.0.1:1',
      topicId: 't',
      logger: silentLogger,
      timeoutMs: 500,
    });
    await expect(tracker.record([attempt, { ...attempt, attemptId: 'a1:spelling:miss' }])).rejects.toThrow();
  });
});
