#!/usr/bin/env node
// Sets up one run of this example and prints what the choice costs.
//
//   node run.mjs lean    reset, make the map the root CLAUDE.md, report
//   node run.mjs fat     reset, make the copy the root CLAUDE.md, report
//
// Reset has to happen first. reset.json restores CLAUDE.md and deletes
// CLAUDE.lean.md, so a reset always lands in lean mode. The swap runs after.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { currentMode, setMode } from './swap.mjs';
import { c } from '../../scripts/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

// Loads when a session starts. Claude Code reads the launch directory and every
// parent. It does not walk down.
const LAUNCH = [
  path.join(REPO, 'CLAUDE.md'),
  path.join(HERE, 'CLAUDE.md'),
  path.join(HERE, '.claude', 'CLAUDE.md'),
];

// Loads later, when a tool call touches a matching file.
const ON_DEMAND = [
  'src/orders/CLAUDE.md',
  'src/payments/CLAUDE.md',
  'src/fulfillment/CLAUDE.md',
  'src/notifications/CLAUDE.md',
  'src/orders/.claude/rules/money.md',
  '.claude/rules/writing.md',
].map((rel) => path.join(HERE, rel));

function measure(file) {
  const text = fs.readFileSync(file, 'utf8');
  return {
    label: path.relative(HERE, file),
    lines: text.replace(/\n$/, '').split('\n').length,
    bytes: Buffer.byteLength(text),
  };
}

const n = (v) => v.toLocaleString('en-US');

// Four bytes a token is the usual rough ratio for English prose. It is an
// estimate and the output says so. /context is the number to quote.
const approxTokens = (bytes) => Math.round(bytes / 4);

function row(label, lines, bytes) {
  return `  ${label.padEnd(38)}${n(lines).padStart(6)} lines${n(bytes).padStart(9)} B`;
}

function table(title, files) {
  const rows = files.filter(fs.existsSync).map(measure);
  const bytes = rows.reduce((sum, r) => sum + r.bytes, 0);
  const lines = rows.reduce((sum, r) => sum + r.lines, 0);
  console.log(c.bold(title));
  for (const r of rows) console.log(row(r.label, r.lines, r.bytes));
  console.log(c.dim(row('total', lines, bytes) + `   ~${n(approxTokens(bytes))} tokens`));
  console.log();
  return { bytes, lines };
}

function main() {
  const target = process.argv[2];
  if (target !== 'fat' && target !== 'lean') {
    console.error('usage: node run.mjs fat | lean');
    process.exit(2);
  }

  execFileSync('npm', ['run', 'reset'], { cwd: HERE, stdio: 'inherit' });
  const result = setMode(target);
  console.log(`root CLAUDE.md ${result.changed ? 'switched to' : 'already'} ${result.mode}`);
  console.log();

  const launch = table('Loads at launch, every session, whatever the task', LAUNCH);
  table('Loads on demand, only if the task opens that folder', ON_DEMAND);

  // Both root files are always on disk. One is CLAUDE.md, the other is parked
  // under its own name, so the other mode can be measured without swapping.
  const parked = path.join(HERE, currentMode() === 'lean' ? 'CLAUDE.fat.md' : 'CLAUDE.lean.md');
  const other = target === 'lean' ? 'fat' : 'lean';
  const otherBytes =
    launch.bytes - measure(path.join(HERE, 'CLAUDE.md')).bytes + measure(parked).bytes;
  const ratio = (Math.max(launch.bytes, otherBytes) / Math.min(launch.bytes, otherBytes)).toFixed(1);

  console.log(c.bold('Launch cost, this mode against the other'));
  console.log(
    `  ${target.padEnd(6)}${n(launch.bytes).padStart(9)} B   ~${n(approxTokens(launch.bytes))} tokens   ` +
      c.dim('<- active')
  );
  console.log(`  ${other.padEnd(6)}${n(otherBytes).padStart(9)} B   ~${n(approxTokens(otherBytes))} tokens`);
  console.log(`  fat starts every session at ${ratio}x the lean launch.`);
  console.log();
  console.log(c.dim('Bytes and lines are exact. Tokens are bytes over four, an estimate.'));
  console.log(c.dim('Run /clear so the new root file is read, then /start. /context is the real number.'));
}

main();
