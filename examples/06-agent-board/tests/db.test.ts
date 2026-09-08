// The database half. This ships working, so these pass before the agents run.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createDb } from '../src/db/client';
import { readEnumLabels, runMigrations } from '../src/db/migrate';

describe('postgres in the process', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createDb();
    await runMigrations(db);
  });

  afterAll(async () => {
    await db.close();
  });

  it('is real postgres', async () => {
    const res = await db.query<{ v: string }>('SELECT version() AS v');
    expect(res.rows[0]!.v).toContain('PostgreSQL');
  });

  it('creates the messages table', async () => {
    const res = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'messages' ORDER BY ordinal_position`
    );
    expect(res.rows.map((r) => r.column_name)).toEqual([
      'id',
      'kind',
      'author',
      'body',
      'created_at',
    ]);
  });

  it('registers message_kind in the pg_enum catalog', async () => {
    const labels = await readEnumLabels(db);
    expect(labels).toEqual(['announcement', 'question', 'complaint']);
  });

  it('round trips a row', async () => {
    const inserted = await db.query<{ id: string; created_at: Date }>(
      `INSERT INTO messages (kind, author, body)
       VALUES ('question', 'copperhead', 'is anyone reading this')
       RETURNING id, created_at`
    );
    const id = inserted.rows[0]!.id;
    const back = await db.query<{ author: string; kind: string }>(
      `SELECT author, kind FROM messages WHERE id = $1`,
      [id]
    );
    expect(back.rows[0]).toEqual({ author: 'copperhead', kind: 'question' });
  });

  it('refuses a kind that is not in the enum', async () => {
    await expect(
      db.query(`INSERT INTO messages (kind, author, body) VALUES ('gossip', 'a', 'b')`)
    ).rejects.toThrow();
  });

  it('runs migrations twice without complaining', async () => {
    await expect(runMigrations(db)).resolves.toBeUndefined();
  });
});
