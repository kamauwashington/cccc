#!/usr/bin/env node
// PostToolUse hook on Write, Edit, and Bash. Runs after the tool has run.
//
// A hook is also a feedback loop. This one runs the TypeScript compiler and
// hands the error straight back to Claude, so a broken edit is fixed inside the
// same turn instead of at the end of it.
//
// It stays fast by doing nothing most of the time:
//   - a Write or Edit only counts when it hits a .ts file under src/ or tests/
//   - a Bash command only counts when it ran codegen, which rewrites
//     src/generated/ without any Write or Edit tool call
// Everything else exits 0 immediately.
//
// Exit 2 sends stderr back to the model. The tool call already happened, so
// this is feedback rather than a block.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(HERE, '..', '..');
const TIMEOUT_MS = 60000;
const MAX_CHARS = 3000;

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function shouldCheck(payload) {
  const tool = payload.tool_name;
  const input = payload.tool_input || {};

  if (tool === 'Bash') {
    return typeof input.command === 'string' && /codegen/.test(input.command);
  }
  if (tool !== 'Write' && tool !== 'Edit' && tool !== 'MultiEdit') return false;

  const target = input.file_path;
  if (typeof target !== 'string' || !target.endsWith('.ts')) return false;
  const rel = path.relative(WS, path.resolve(WS, target)).split(path.sep).join('/');
  return rel.startsWith('src/') || rel.startsWith('tests/');
}

// Call the compiler through node so there is no shell and no npx lookup.
function tscPath() {
  const candidates = [
    path.join(WS, 'node_modules', 'typescript', 'bin', 'tsc'),
    path.join(WS, '..', '..', 'node_modules', 'typescript', 'bin', 'tsc'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin());
  } catch {
    process.exit(0);
  }
  if (!shouldCheck(payload)) process.exit(0);

  const tsc = tscPath();
  if (!tsc) process.exit(0); // no compiler here, say nothing

  const res = spawnSync(process.execPath, [tsc, '--noEmit', '--pretty', 'false'], {
    cwd: WS,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  if (res.status === 0) process.exit(0);

  const output = ((res.stdout || '') + (res.stderr || '')).trim();
  process.stderr.write(
    'tsc --noEmit failed after that edit.\n\n' +
      output.slice(0, MAX_CHARS) +
      '\n\nFix the compile error before moving on. An exhaustive switch that ends in\n' +
      '`assertNever` fails this way when a new case is added and nobody handles it.\n' +
      'This hook is .claude/hooks/typecheck-after-edit.mjs.\n'
  );
  process.exit(2); // 2 sends this text back to the model
}

main();
