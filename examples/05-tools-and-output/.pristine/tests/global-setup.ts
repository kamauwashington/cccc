// Seeds a database the tests own, once, before any test file runs.
// The seeded board is what makes the naive output large enough to matter.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { TEST_DB, WORKSPACE } from './board-cli.js';

const SENTINEL = path.join(TEST_DB, '.seeded');

export default function setup(): void {
  if (fs.existsSync(SENTINEL)) return;
  const res = spawnSync('node', [path.join(WORKSPACE, 'tools', 'seed.mjs')], {
    cwd: WORKSPACE,
    encoding: 'utf8',
    env: { ...process.env, BOARD_DB: TEST_DB },
  });
  if (res.status !== 0) {
    throw new Error('seed failed: ' + (res.stderr || res.stdout));
  }
  fs.writeFileSync(SENTINEL, 'ok', 'utf8');
}
