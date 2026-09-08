#!/usr/bin/env node
// board: a message board CLI over PGlite.
//
// This is the version someone writes when they are thinking about the database
// and not about the reader. It works. Every query is correct. And `list` on a
// seeded board prints 320 lines straight into the context window.
//
// tests/output-discipline.test.ts describes where this file needs to land.
// Run `npm test` and read the failures.

import {
  isoDay,
  listMessages,
  openBoard,
  post,
  searchMessages,
  stats,
} from '../src/board-db.mjs';

const HELP = `board: a small message board over PGlite

usage: node tools/board.mjs <command> [options]

commands:
  post <body>        add a message. --author NAME --channel NAME
  list               newest messages. --channel NAME --limit N
  search <query>     match on body or author. --channel NAME --limit N

options:
  --limit N          how many rows to consider (default 500)
  --channel NAME     restrict to one channel
  --author NAME      author for post (default "you")
  --help             this text`;

// A small hand rolled parser. Flags with values, flags without, and the rest.
function parseArgs(argv) {
  const flags = { limit: 500, channel: null, author: 'you', help: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') flags.help = true;
    else if (arg === '--limit') flags.limit = Number(argv[++i]);
    else if (arg.startsWith('--limit=')) flags.limit = Number(arg.slice(8));
    else if (arg === '--channel') flags.channel = argv[++i];
    else if (arg.startsWith('--channel=')) flags.channel = arg.slice(10);
    else if (arg === '--author') flags.author = argv[++i];
    else if (arg.startsWith('--author=')) flags.author = arg.slice(9);
    else rest.push(arg);
  }
  if (!Number.isFinite(flags.limit) || flags.limit < 1) flags.limit = 500;
  return { flags, rest };
}

function oneLine(row) {
  return `#${String(row.id).padStart(4)} ${isoDay(row.created_at)} ${row.author.padEnd(6)} #${row.channel.padEnd(10)} ${row.body}`;
}

function out(lines) {
  process.stdout.write(lines.join('\n') + '\n');
}

async function cmdPost(db, flags, rest) {
  const body = rest.join(' ').trim();
  if (!body) throw new Error('post needs a message body. See --help.');
  const row = await post(db, {
    channel: flags.channel || 'general',
    author: flags.author,
    body,
  });
  const { total } = await stats(db);
  out([
    `posted #${row.id} to #${row.channel} as ${row.author}`,
    `board now holds ${total} messages`,
  ]);
}

async function cmdList(db, flags) {
  const rows = await listMessages(db, { channel: flags.channel, limit: flags.limit });
  out(rows.map(oneLine));
}

async function cmdSearch(db, flags, rest) {
  const query = rest.join(' ').trim();
  if (!query) throw new Error('search needs a query. See --help.');
  const rows = await searchMessages(db, { query, channel: flags.channel, limit: flags.limit });
  out(rows.map(oneLine));
}

async function main() {
  const argv = process.argv.slice(2);
  const { flags, rest } = parseArgs(argv);
  const command = rest.shift();

  if (flags.help || !command || command === 'help') {
    process.stdout.write(HELP + '\n');
    return;
  }

  const db = await openBoard();
  try {
    if (command === 'post') await cmdPost(db, flags, rest);
    else if (command === 'list') await cmdList(db, flags);
    else if (command === 'search') await cmdSearch(db, flags, rest);
    else throw new Error(`unknown command "${command}". See --help.`);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  process.stderr.write('board: ' + err.message + '\n');
  process.exit(1);
});
