#!/usr/bin/env node
// The tool.
//
// A tool is a script. There is no server here, no protocol, and no MCP. Claude
// runs this the same way you would, and reads what it prints.
//
// Every subcommand prints the same three part shape:
//
//   line 1   the headline. What was asked and how many matched.
//   line 2   blank
//   rest     fixed width rows, newest first
//
// That shape is the contract. Claude reads the headline for the count and the
// rows for the detail, so the answer never depends on parsing prose.
//
//   node tools/board.mjs stats
//   node tools/board.mjs list [--channel NAME] [--limit N]
//   node tools/board.mjs search <text> [--limit N]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', 'data', 'board.json');
const DEFAULT_LIMIT = 5;

const messages = JSON.parse(fs.readFileSync(DATA, 'utf8'));

function flag(argv, name, fallback) {
  const i = argv.indexOf('--' + name);
  return i === -1 || i === argv.length - 1 ? fallback : argv[i + 1];
}

function day(iso) {
  return String(iso).slice(0, 10);
}

// Fixed width rows. The columns line up, so the shape is obvious on a
// projector and cheap to read back.
function rows(list, limit) {
  const shown = list.slice(0, Number(limit));
  return shown
    .map((m) =>
      [
        '  #' + String(m.id).padEnd(5),
        day(m.created_at),
        m.channel.padEnd(10),
        m.author.padEnd(8),
        m.body.length > 52 ? m.body.slice(0, 49) + '...' : m.body,
      ].join('  ')
    )
    .join('\n');
}

function newestFirst(list) {
  return [...list].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function stats() {
  const byChannel = new Map();
  for (const m of messages) byChannel.set(m.channel, (byChannel.get(m.channel) || 0) + 1);
  const newest = newestFirst(messages)[0];
  const ranked = [...byChannel.entries()].sort((a, b) => b[1] - a[1]);

  return [
    'board  ' + messages.length + ' messages  ' + byChannel.size + ' channels  newest ' + day(newest.created_at),
    '',
    ...ranked.map(([name, n]) => '  ' + name.padEnd(12) + String(n).padStart(4)),
  ].join('\n');
}

function list(argv) {
  const channel = flag(argv, 'channel', null);
  const limit = flag(argv, 'limit', DEFAULT_LIMIT);
  const matched = newestFirst(channel ? messages.filter((m) => m.channel === channel) : messages);
  const scope = channel ? 'channel=' + channel : 'all channels';

  return [
    'board list  ' + scope + '  showing ' + Math.min(matched.length, Number(limit)) + ' of ' + matched.length,
    '',
    rows(matched, limit),
  ].join('\n');
}

function search(argv) {
  const query = argv.find((a) => !a.startsWith('--') && a !== flag(argv, 'limit', null));
  if (!query) return 'board search  no query given  showing 0 of 0';
  const limit = flag(argv, 'limit', DEFAULT_LIMIT);
  const needle = query.toLowerCase();
  const matched = newestFirst(
    messages.filter(
      (m) => m.body.toLowerCase().includes(needle) || m.author.toLowerCase().includes(needle)
    )
  );

  return [
    'board search  query="' + query + '"  showing ' + Math.min(matched.length, Number(limit)) + ' of ' + matched.length,
    '',
    matched.length ? rows(matched, limit) : '  no matches',
  ].join('\n');
}

const HELP = [
  'board: read a message board from data/board.json',
  '',
  'usage: node tools/board.mjs <command> [options]',
  '',
  'commands:',
  '  stats                    counts per channel, newest date',
  '  list [--channel NAME]    newest messages. --limit N (default 5)',
  '  search <text>            match on body or author. --limit N (default 5)',
  '',
  'Every command prints a headline, a blank line, then fixed width rows.',
].join('\n');

const [, , cmd, ...argv] = process.argv;

const out =
  cmd === 'stats' ? stats() : cmd === 'list' ? list(argv) : cmd === 'search' ? search(argv) : HELP;

console.log(out);
