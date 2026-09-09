#!/usr/bin/env node
// A second tool, same three part shape.
//
// `board.mjs` answers "what is on the board". This one answers "who is on it".
// It reads the same 320 rows. Only the summary changes. That is the idea worth
// copying: a second question gets a second script, not a bigger dump.
//
//   line 1   the headline. What was asked and how many matched.
//   line 2   blank
//   rest     fixed width rows, busiest first
//
//   node tools/people.mjs top [--channel NAME] [--limit N]
//   node tools/people.mjs who <author>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', 'data', 'board.json');
const DEFAULT_LIMIT = 5;
const SPREAD = 3;

const messages = JSON.parse(fs.readFileSync(DATA, 'utf8'));

function flag(argv, name, fallback) {
  const i = argv.indexOf('--' + name);
  return i === -1 || i === argv.length - 1 ? fallback : argv[i + 1];
}

function day(iso) {
  return String(iso).slice(0, 10);
}

// One pass, one entry per author. The channel map is what makes the answer
// "chen carries deploys" instead of just "chen posts a lot".
function tally(list) {
  const people = new Map();
  for (const m of list) {
    let entry = people.get(m.author);
    if (!entry) {
      entry = { author: m.author, total: 0, channels: new Map(), first: day(m.created_at), last: day(m.created_at) };
      people.set(m.author, entry);
    }
    entry.total++;
    entry.channels.set(m.channel, (entry.channels.get(m.channel) || 0) + 1);
    const d = day(m.created_at);
    if (d < entry.first) entry.first = d;
    if (d > entry.last) entry.last = d;
  }
  return [...people.values()].sort((a, b) => b.total - a.total || a.author.localeCompare(b.author));
}

function byCount(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function top(argv) {
  const channel = flag(argv, 'channel', null);
  const limit = Number(flag(argv, 'limit', DEFAULT_LIMIT));
  const scoped = channel ? messages.filter((m) => m.channel === channel) : messages;
  const ranked = tally(scoped);
  const scope = channel ? 'channel=' + channel + '  ' : 'all channels  ';

  const rows = ranked.slice(0, limit).map((e) => {
    const spread = byCount(e.channels)
      .slice(0, SPREAD)
      .map(([name, n]) => name + ' ' + n)
      .join('  ');
    return '  ' + e.author.padEnd(10) + String(e.total).padStart(4) + '   ' + spread;
  });

  return [
    'board people  ' + scope + ranked.length + ' authors  ' + scoped.length +
      ' messages  showing ' + Math.min(ranked.length, limit) + ' of ' + ranked.length,
    '',
    rows.length ? rows.join('\n') : '  no authors',
  ].join('\n');
}

function who(argv) {
  const name = argv.find((a) => !a.startsWith('--') && a !== flag(argv, 'limit', null));
  if (!name) return ['board people  no author given  showing 0 of 0', '', '  no matches'].join('\n');

  const needle = name.toLowerCase();
  const entry = tally(messages.filter((m) => m.author.toLowerCase() === needle))[0];
  if (!entry) {
    return ['board people  author=' + name + '  0 messages  showing 0 of 0', '', '  no matches'].join('\n');
  }

  const channels = byCount(entry.channels);
  return [
    'board people  author=' + entry.author + '  ' + entry.total + ' messages  ' +
      entry.first + '..' + entry.last + '  showing ' + channels.length + ' of ' + channels.length,
    '',
    channels.map(([n, count]) => '  ' + n.padEnd(12) + String(count).padStart(4)).join('\n'),
  ].join('\n');
}

const HELP = [
  'people: who is posting on the board in data/board.json',
  '',
  'usage: node tools/people.mjs <command> [options]',
  '',
  'commands:',
  '  top [--channel NAME]     busiest authors, with where they post. --limit N (default 5)',
  '  who <author>             one author, broken out by channel',
  '',
  'Every command prints a headline, a blank line, then fixed width rows.',
].join('\n');

const [, , cmd, ...argv] = process.argv;

const out = cmd === 'top' ? top(argv) : cmd === 'who' ? who(argv) : HELP;

console.log(out);
