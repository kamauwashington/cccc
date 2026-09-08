#!/usr/bin/env node
// Wipes the board and refills it. The CLI already seeds itself the first time
// it opens an empty database, so this is the deliberate reset, not a setup
// step you have to remember.

import fs from 'node:fs';
import path from 'node:path';
import { dbPath, openBoard } from '../src/board-db.mjs';
import { seedRows } from '../src/board-seed.mjs';

async function main() {
  const dir = dbPath();
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dir), { recursive: true });

  // Seed here rather than leaning on the automatic path, so an explicit
  // `npm run seed` still works with BOARD_NO_AUTOSEED set.
  process.env.BOARD_NO_AUTOSEED = '1';
  const db = await openBoard();
  const n = await seedRows(db);
  await db.close();
  process.stdout.write(`seeded ${n} messages into ${path.relative(process.cwd(), dir)}\n`);
}

main().catch((err) => {
  process.stderr.write('seed failed: ' + err.message + '\n');
  process.exit(1);
});
