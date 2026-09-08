// Migrations. One table, one enum type, run once at startup.
//
// The enum is the interesting part. `message_kind` lives in the `pg_enum`
// catalog, so a test can read the labels back out and compare them with the
// TypeScript union. That is a real contract check, not a guess.
import type { PGlite } from '@electric-sql/pglite';

export const MESSAGE_KIND_TYPE = 'message_kind';

export async function runMigrations(db: PGlite): Promise<void> {
  await db.exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_kind') THEN
        CREATE TYPE message_kind AS ENUM ('announcement', 'question', 'complaint');
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS messages (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind        message_kind NOT NULL,
      author      text NOT NULL,
      body        text NOT NULL,
      created_at  timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at DESC);
  `);
}

/** Reads the enum labels back out of the Postgres catalog, in sort order. */
export async function readEnumLabels(db: PGlite, typeName = MESSAGE_KIND_TYPE): Promise<string[]> {
  const res = await db.query<{ label: string }>(
    `SELECT e.enumlabel AS label
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = $1
      ORDER BY e.enumsortorder`,
    [typeName]
  );
  return res.rows.map((r) => r.label);
}
