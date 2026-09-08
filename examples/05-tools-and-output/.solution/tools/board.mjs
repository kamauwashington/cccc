#!/usr/bin/env node
// board: a message board CLI over PGlite.
//
// The output contract, in three sentences.
//
//   Every subcommand answers in a handful of lines by default: the counts, the
//   channel breakdown, and the newest five rows. `--json` is the escape hatch
//   and returns the whole payload. `--verbose` is `--json` plus the database
//   path and the elapsed time, for when the question is about the tool itself.
//
// tests/output-discipline.test.ts holds that contract to 15 lines.

import {
  channelTally,
  dbPath,
  isoDay,
  listMessages,
  openBoard,
  post,
  searchMessages,
  stats,
} from '../src/board-db.mjs';

// How many rows a default summary shows. Five is enough to recognise the board
// and small enough that nobody thinks about the cost of running it.
const PREVIEW = 5;

const HELP = `board: a small message board over PGlite

usage: node tools/board.mjs <command> [options]

commands:
  post <body>        add a message
  list               newest messages, summarised
  search <query>     match on body or author

options:
  --json             the full payload as JSON
  --verbose          --json plus the database path and timing
  --limit N          how many rows to consider (default 500)
  --channel NAME     restrict to one channel
  --author NAME      author for post (default "you")
  --help             this text

Defaults stay short on purpose. Pair --json with --limit N, a pipe into jq,
or a redirect to a file.`;

// A small hand rolled parser. Flags with values, flags without, and the rest.
function parseArgs(argv) {
  const flags = { limit: 500, channel: null, author: 'you', help: false, json: false, verbose: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') flags.help = true;
    else if (arg === '--json') flags.json = true;
    else if (arg === '--verbose') flags.verbose = true;
    else if (arg === '--limit') flags.limit = Number(argv[++i]);
    else if (arg.startsWith('--limit=')) flags.limit = Number(arg.slice(8));
    else if (arg === '--channel') flags.channel = argv[++i];
    else if (arg.startsWith('--channel=')) flags.channel = arg.slice(10);
    else if (arg === '--author') flags.author = argv[++i];
    else if (arg.startsWith('--author=')) flags.author = arg.slice(9);
    else rest.push(arg);
  }
  if (!Number.isFinite(flags.limit) || flags.limit < 1) flags.limit = 500;
  // --verbose is a superset of --json, so asking for one asks for the other.
  if (flags.verbose) flags.json = true;
  return { flags, rest };
}

function oneLine(row) {
  return `#${String(row.id).padStart(4)} ${isoDay(row.created_at)} ${row.author.padEnd(6)} #${row.channel.padEnd(10)} ${row.body}`;
}

function out(lines) {
  process.stdout.write(lines.join('\n') + '\n');
}

// The escape hatch. Full payload, pretty printed, nothing else on stdout so a
// pipe into jq works. --verbose adds the two facts about the run itself.
function emit(flags, payload, startedAt) {
  const body = flags.verbose ? { database: dbPath(), ...payload } : payload;
  process.stdout.write(JSON.stringify(body, null, 2) + '\n');
  if (flags.verbose) process.stdout.write(`elapsed ${Date.now() - startedAt}ms\n`);
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function tallyLine(tally) {
  return 'channels: ' + tally.map(({ channel, n }) => `${channel} ${n}`).join(', ');
}

// One shape for both list and search: a headline, the channel breakdown, the
// newest few rows, and a pointer at the flag that returns the rest.
function summary({ headline, rows, flags }) {
  const tally = channelTally(rows);
  const shown = rows.slice(0, PREVIEW);
  const lines = [headline];
  if (tally.length > 1 || !flags.channel) lines.push(tallyLine(tally));
  lines.push(`newest ${shown.length}:`);
  for (const row of shown) lines.push(oneLine(row));
  lines.push(`--json returns all ${rows.length} rows. --limit N narrows the window.`);
  return lines;
}

function scope(flags) {
  return flags.channel ? ` in #${flags.channel}` : '';
}

async function cmdPost(db, flags, rest, startedAt) {
  const body = rest.join(' ').trim();
  if (!body) throw new Error('post needs a message body. See --help.');
  const row = await post(db, {
    channel: flags.channel || 'general',
    author: flags.author,
    body,
  });
  const { total, channels } = await stats(db);

  if (flags.json) {
    emit(flags, { command: 'post', posted: row, total, channels }, startedAt);
    return;
  }
  out([
    `posted #${row.id} to #${row.channel} as ${row.author}`,
    `board now holds ${plural(total, 'message')} across ${plural(channels.length, 'channel')}`,
  ]);
}

async function cmdList(db, flags, startedAt) {
  const rows = await listMessages(db, { channel: flags.channel, limit: flags.limit });

  if (flags.json) {
    emit(
      flags,
      {
        command: 'list',
        channel: flags.channel,
        limit: flags.limit,
        returned: rows.length,
        channels: channelTally(rows),
        messages: rows,
      },
      startedAt
    );
    return;
  }
  if (rows.length === 0) {
    out([`0 messages${scope(flags)}. Post one with: node tools/board.mjs post "hello"`]);
    return;
  }
  const span = `${isoDay(rows[rows.length - 1].created_at)} to ${isoDay(rows[0].created_at)}`;
  out(summary({ headline: `${plural(rows.length, 'message')}${scope(flags)}, ${span}`, rows, flags }));
}

async function cmdSearch(db, flags, rest, startedAt) {
  const query = rest.join(' ').trim();
  if (!query) throw new Error('search needs a query. See --help.');
  const rows = await searchMessages(db, { query, channel: flags.channel, limit: flags.limit });

  if (flags.json) {
    emit(
      flags,
      {
        command: 'search',
        query,
        channel: flags.channel,
        limit: flags.limit,
        matched: rows.length,
        returned: rows.length,
        channels: channelTally(rows),
        messages: rows,
      },
      startedAt
    );
    return;
  }
  if (rows.length === 0) {
    out([`0 matches for "${query}"${scope(flags)}`]);
    return;
  }
  const label = rows.length === 1 ? 'match' : 'matches';
  out(summary({ headline: `${rows.length} ${label} for "${query}"${scope(flags)}`, rows, flags }));
}

async function main() {
  const argv = process.argv.slice(2);
  const { flags, rest } = parseArgs(argv);
  const command = rest.shift();
  const startedAt = Date.now();

  // --help answers from this file alone. It never opens the database.
  if (flags.help || !command || command === 'help') {
    process.stdout.write(HELP + '\n');
    return;
  }

  const db = await openBoard();
  try {
    if (command === 'post') await cmdPost(db, flags, rest, startedAt);
    else if (command === 'list') await cmdList(db, flags, startedAt);
    else if (command === 'search') await cmdSearch(db, flags, rest, startedAt);
    else throw new Error(`unknown command "${command}". See --help.`);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  process.stderr.write('board: ' + err.message + '\n');
  process.exit(1);
});
