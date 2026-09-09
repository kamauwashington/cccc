#!/usr/bin/env node
// A third tool, same three part shape.
//
// `board.mjs` answers "what is on the board" and `people.mjs` answers "who".
// This one answers "when". Same 320 rows again, summarised down the time axis.
//
//   line 1   the headline. What was asked and how many matched.
//   line 2   blank
//   rest     fixed width rows, newest first
//
// The bar is scaled to the busiest bucket shown, so the shape of the trend is
// readable without anyone doing arithmetic on the counts.
//
//   node tools/activity.mjs weeks [--channel NAME] [--limit N]
//   node tools/activity.mjs days  [--channel NAME] [--limit N]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', 'data', 'board.json');
const DEFAULT_LIMIT = 5;
const BAR = 24;

const messages = JSON.parse(fs.readFileSync(DATA, 'utf8'));

function flag(argv, name, fallback) {
  const i = argv.indexOf('--' + name);
  return i === -1 || i === argv.length - 1 ? fallback : argv[i + 1];
}

function day(iso) {
  return String(iso).slice(0, 10);
}

// Monday of the week the date falls in. UTC throughout, so the buckets do not
// shift with whoever is running the demo.
function weekOf(iso) {
  const d = new Date(day(iso) + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function bucket(list, keyOf) {
  const counts = new Map();
  for (const m of list) {
    const k = keyOf(m.created_at);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function plusDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// A week bucket at either end of the data covers days the board does not have.
// Reporting a 4 day stub as a week would read as a quiet week, which is a lie
// the caller cannot see. Say "partial" and the trend stays honest.
function span(list) {
  let first = null;
  let last = null;
  for (const m of list) {
    const d = day(m.created_at);
    if (first === null || d < first) first = d;
    if (last === null || d > last) last = d;
  }
  return { first, last };
}

function report(argv, unit, size, keyOf) {
  const channel = flag(argv, 'channel', null);
  const limit = Number(flag(argv, 'limit', DEFAULT_LIMIT));
  const scoped = channel ? messages.filter((m) => m.channel === channel) : messages;
  const buckets = bucket(scoped, keyOf);
  const shown = buckets.slice(0, limit);
  const peak = shown.reduce((max, [, n]) => Math.max(max, n), 0);
  const scope = channel ? 'channel=' + channel + '  ' : 'all channels  ';
  const { first, last } = span(scoped);

  const rows = shown.map(([key, n]) => {
    const width = peak ? Math.max(1, Math.round((n / peak) * BAR)) : 0;
    const partial = key < first || plusDays(key, size - 1) > last;
    const row =
      '  ' + key + '  ' + String(n).padStart(4) + '  ' + '#'.repeat(width).padEnd(BAR) +
      (partial ? '  partial' : '');
    return row.replace(/\s+$/, '');
  });

  return [
    'board activity  by=' + unit + '  ' + scope + scoped.length + ' messages  showing ' +
      shown.length + ' of ' + buckets.length + ' ' + unit + 's',
    '',
    rows.length ? rows.join('\n') : '  no activity',
  ].join('\n');
}

const HELP = [
  'activity: when the board in data/board.json was busy',
  '',
  'usage: node tools/activity.mjs <command> [options]',
  '',
  'commands:',
  '  weeks [--channel NAME]   messages per week, newest first. --limit N (default 5)',
  '  days  [--channel NAME]   messages per day, newest first. --limit N (default 5)',
  '',
  'Every command prints a headline, a blank line, then fixed width rows.',
].join('\n');

const [, , cmd, ...argv] = process.argv;

const out =
  cmd === 'weeks' ? report(argv, 'week', 7, weekOf) : cmd === 'days' ? report(argv, 'day', 1, day) : HELP;

console.log(out);
