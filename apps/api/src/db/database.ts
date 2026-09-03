import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  context TEXT NOT NULL,
  prompt TEXT NOT NULL,
  description TEXT NOT NULL,
  level TEXT NOT NULL,
  min_words INTEGER NOT NULL,
  max_words INTEGER NOT NULL,
  register TEXT NOT NULL,
  time_limit_seconds INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id),
  status TEXT NOT NULL,
  started_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  number INTEGER NOT NULL,
  text TEXT NOT NULL,
  evaluation_json TEXT NOT NULL,
  score INTEGER NOT NULL,
  score_delta INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE(session_id, number)
);
CREATE INDEX IF NOT EXISTS attempts_created_at ON attempts(created_at);
`;

/** Abre (o crea) la base y aplica el esquema de forma idempotente. */
export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}
