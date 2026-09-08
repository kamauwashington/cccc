// Test harness. Every test file gets its own in memory Postgres and its own
// listening app. Nothing is shared, so the files can run in parallel.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { PGlite } from '@electric-sql/pglite';
import { createApp } from '../../src/app';
import { createDb } from '../../src/db/client';
import { runMigrations } from '../../src/db/migrate';

export interface Board {
  db: PGlite;
  base: string;
  close(): Promise<void>;
}

export async function startBoard(): Promise<Board> {
  const db = await createDb();
  await runMigrations(db);
  const server = http.createServer(createApp(db));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    db,
    base: 'http://127.0.0.1:' + port,
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await db.close();
    },
  };
}

export async function postJson(base: string, path: string, body: unknown) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

export async function getJson(base: string, path: string) {
  const res = await fetch(base + path);
  return { status: res.status, body: (await res.json()) as any };
}
