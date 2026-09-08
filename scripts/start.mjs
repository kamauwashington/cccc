#!/usr/bin/env node
// Demo opener for one workspace. Resets it, then shows the starting state.
//
//   node scripts/start.mjs 01
//
// Typecheck runs first. If it is red, the script stops there and prints the
// errors. A workspace that typechecks clean goes on to the tests. A workspace
// that passes both is green on purpose, and the script says so.
//
// It always exits 0. A non zero exit would make npm print seven lines of its
// own error block on top of the output, which is noise on a projector.

import { spawnSync } from 'node:child_process';
import { resolveWorkspace, listWorkspaces, c } from './lib.mjs';

const MAX_LINES = 12;

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  return { code: r.status === null ? 1 : r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function printCapped(text) {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  for (const line of lines.slice(0, MAX_LINES)) console.log('  ' + line);
  if (lines.length > MAX_LINES) {
    console.log('  ' + c.dim('... ' + (lines.length - MAX_LINES) + ' more lines'));
  }
}

const token = process.argv[2];
const ws = resolveWorkspace(token);
if (!ws) {
  console.error('start: unknown workspace ' + JSON.stringify(token || ''));
  console.error('start: try one of ' + listWorkspaces().map((w) => w.name.slice(0, 2)).join(', '));
  process.exit(1);
}

const reset = run('node', [new URL('reset.mjs', import.meta.url).pathname, ws.name.slice(0, 2)], ws.dir);
process.stdout.write(reset.out);
if (reset.code !== 0) process.exit(0);

const tc = run('npx', ['tsc', '--noEmit'], ws.dir);
if (tc.code !== 0) {
  const count = (tc.out.match(/error TS/g) || []).length;
  console.log(c.red(c.bold('typecheck')) + ': ' + count + ' errors');
  printCapped(tc.out);
  process.exit(0);
}
console.log(c.green(c.bold('typecheck')) + ': clean');

const tt = run('npx', ['vitest', 'run', '--reporter=dot'], ws.dir);
const summary = (tt.out.match(/^\s*Tests\s+\d+.*\(\d+\)\s*$/gm) || []).pop();
if (tt.code !== 0) {
  console.log(c.red(c.bold('tests')) + ': ' + (summary || 'failed').trim());
  printCapped(tt.out.split('\n').filter((l) => /FAIL|✗|×|AssertionError|Error:/.test(l)).join('\n'));
  process.exit(0);
}
console.log(c.green(c.bold('tests')) + ': ' + (summary || 'passed').trim());
console.log(c.dim('This workspace starts green on purpose.'));
process.exit(0);
