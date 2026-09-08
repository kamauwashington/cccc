// Shared helpers. Every test drives the real CLI as a subprocess, because that
// is how Claude Code will drive it too.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const WORKSPACE = path.resolve(HERE, '..');
export const TEST_DB = path.join(WORKSPACE, '.tmp', 'test-board');

// The contract this suite enforces. Raise it only on purpose.
export const MAX_DEFAULT_LINES = 15;
export const MAX_HELP_LINES = 25;

export interface Run {
  status: number;
  stdout: string;
  stderr: string;
}

export function board(args: string[]): Run {
  const res = spawnSync('node', [path.join(WORKSPACE, 'tools', 'board.mjs'), ...args], {
    cwd: WORKSPACE,
    encoding: 'utf8',
    env: { ...process.env, BOARD_DB: TEST_DB },
  });
  return { status: res.status ?? 1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

export function lines(text: string): string[] {
  return text.split('\n').filter((l) => l.trim().length > 0);
}

export function looksLikeJson(text: string): boolean {
  const first = text.trim()[0];
  return first === '{' || first === '[';
}
