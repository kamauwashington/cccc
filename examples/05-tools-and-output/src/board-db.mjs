// The shared core. Both the CLI in tools/ and the MCP server in mcp/ sit on
// top of this file, so the line counts in the README compare wrappers and not
// database code.
//
// PGlite is Postgres compiled to WebAssembly. It runs in this process and
// stores its data in a directory. No server, no port, no docker.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { seedIfEmpty } from './board-seed.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const WORKSPACE = path.resolve(HERE, '..');

// One knob so the tests can seed a database of their own.
export function dbPath() {
  return process.env.BOARD_DB || path.join(WORKSPACE, '.tmp', 'board');
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS messages (
    id         serial PRIMARY KEY,
    channel    text        NOT NULL,
    author     text        NOT NULL,
    body       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS messages_channel_idx ON messages (channel);
  CREATE INDEX IF NOT EXISTS messages_created_idx ON messages (created_at DESC);
`;

export async function openBoard() {
  const db = await PGlite.create(dbPath());
  await db.exec(SCHEMA);
  // A fresh checkout has an empty board, and an empty board makes the output
  // demo look like nothing. Fill it once, here, so no setup step is required.
  await seedIfEmpty(db);
  return db;
}

export async function post(db, { channel, author, body }) {
  const res = await db.query(
    'INSERT INTO messages (channel, author, body) VALUES ($1, $2, $3) RETURNING id, channel, author, body, created_at',
    [channel, author, body]
  );
  return res.rows[0];
}

export async function listMessages(db, { channel = null, limit = 500 } = {}) {
  const res = await db.query(
    `SELECT id, channel, author, body, created_at
       FROM messages
      WHERE ($1::text IS NULL OR channel = $1)
      ORDER BY created_at DESC, id DESC
      LIMIT $2`,
    [channel, limit]
  );
  return res.rows;
}

export async function searchMessages(db, { query, channel = null, limit = 500 } = {}) {
  const res = await db.query(
    `SELECT id, channel, author, body, created_at
       FROM messages
      WHERE (body ILIKE '%' || $1 || '%' OR author ILIKE '%' || $1 || '%')
        AND ($2::text IS NULL OR channel = $2)
      ORDER BY created_at DESC, id DESC
      LIMIT $3`,
    [query, channel, limit]
  );
  return res.rows;
}

export async function stats(db) {
  const total = await db.query('SELECT count(*)::int AS n FROM messages');
  const byChannel = await db.query(
    'SELECT channel, count(*)::int AS n FROM messages GROUP BY channel ORDER BY n DESC, channel ASC'
  );
  return { total: total.rows[0].n, channels: byChannel.rows };
}

// Group a row set by channel without a second round trip.
export function channelTally(rows) {
  const seen = new Map();
  for (const row of rows) seen.set(row.channel, (seen.get(row.channel) || 0) + 1);
  return [...seen.entries()]
    .map(([channel, n]) => ({ channel, n }))
    .sort((a, b) => b.n - a.n || a.channel.localeCompare(b.channel));
}

export function isoDay(value) {
  return new Date(value).toISOString().slice(0, 10);
}
