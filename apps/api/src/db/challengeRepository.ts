import type { DatabaseSync } from 'node:sqlite';
import { ChallengeSchema, type Challenge, type ListChallengesQuery } from '@english-practice/shared';

interface Row {
  id: string;
  context: string;
  prompt: string;
  description: string;
  level: string;
  min_words: number;
  max_words: number;
  register: string;
  time_limit_seconds: number;
}

function toChallenge(row: Row): Challenge {
  return ChallengeSchema.parse({
    id: row.id,
    context: row.context,
    prompt: row.prompt,
    description: row.description,
    level: row.level,
    minWords: row.min_words,
    maxWords: row.max_words,
    register: row.register,
    timeLimitSeconds: row.time_limit_seconds,
  });
}

export class ChallengeRepository {
  constructor(private readonly db: DatabaseSync) {}

  upsertMany(challenges: Challenge[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO challenges (id, context, prompt, description, level, min_words, max_words, register, time_limit_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        context = excluded.context, prompt = excluded.prompt, description = excluded.description,
        level = excluded.level, min_words = excluded.min_words, max_words = excluded.max_words,
        register = excluded.register, time_limit_seconds = excluded.time_limit_seconds
    `);
    for (const c of challenges) {
      stmt.run(c.id, c.context, c.prompt, c.description, c.level, c.minWords, c.maxWords, c.register, c.timeLimitSeconds);
    }
  }

  list(filters: ListChallengesQuery = {}): Challenge[] {
    const clauses: string[] = [];
    const params: string[] = [];
    if (filters.level) {
      clauses.push('level = ?');
      params.push(filters.level);
    }
    if (filters.context) {
      clauses.push('context = ?');
      params.push(filters.context);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db.prepare(`SELECT * FROM challenges ${where} ORDER BY level, id`).all(...params) as unknown as Row[];
    return rows.map(toChallenge);
  }

  findById(id: string): Challenge | undefined {
    const row = this.db.prepare('SELECT * FROM challenges WHERE id = ?').get(id) as unknown as Row | undefined;
    return row ? toChallenge(row) : undefined;
  }
}
