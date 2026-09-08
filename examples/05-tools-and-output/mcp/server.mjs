#!/usr/bin/env node
// The same three operations as tools/board.mjs, served over MCP stdio.
//
// Written by hand with no SDK so you can see the whole protocol. The transport
// is newline delimited JSON-RPC 2.0 on stdin and stdout. Anything this file
// writes to stdout that is not a JSON-RPC message breaks the connection, so
// logging goes to stderr.
//
// Read this next to tools/board.mjs. Same database, same three operations.
// Count the lines. Then ask what the extra lines bought you.
//
// What they cost:
//   - a process that starts with Claude Code and stays alive
//   - a tools/list result that sits in the context window of every session,
//     used or not
//   - a second place to change when the schema changes
//
// What they buy, when the tool leaves this repository: remote systems, auth,
// and reuse from Claude Desktop or any other MCP client.

import {
  listMessages,
  openBoard,
  post,
  searchMessages,
  stats,
} from '../src/board-db.mjs';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'board', version: '1.0.0' };

// Every tool description and every schema field below is sent to the model on
// connect. This block is the context cost of the server.
const TOOLS = [
  {
    name: 'board_post',
    description: 'Add a message to the board.',
    inputSchema: {
      type: 'object',
      properties: {
        body: { type: 'string', description: 'The message text.' },
        channel: { type: 'string', description: 'Channel name. Defaults to general.' },
        author: { type: 'string', description: 'Author name. Defaults to you.' },
      },
      required: ['body'],
    },
  },
  {
    name: 'board_list',
    description: 'List the newest messages. Returns a short summary unless full is true.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Restrict to one channel.' },
        limit: { type: 'number', description: 'How many rows to consider. Defaults to 500.' },
        full: { type: 'boolean', description: 'Return every row instead of a summary.' },
      },
    },
  },
  {
    name: 'board_search',
    description: 'Search message bodies and authors. Returns a short summary unless full is true.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text to match.' },
        channel: { type: 'string', description: 'Restrict to one channel.' },
        limit: { type: 'number', description: 'How many rows to consider. Defaults to 500.' },
        full: { type: 'boolean', description: 'Return every row instead of a summary.' },
      },
      required: ['query'],
    },
  },
];

let db = null;
let pending = 0;
let closing = false;

async function database() {
  if (!db) db = await openBoard();
  return db;
}

function text(value) {
  return { content: [{ type: 'text', text: value }] };
}

async function callTool(name, args) {
  const conn = await database();
  const limit = Number.isFinite(args.limit) ? args.limit : 500;

  if (name === 'board_post') {
    if (!args.body) throw new Error('body is required');
    const row = await post(conn, {
      channel: args.channel || 'general',
      author: args.author || 'you',
      body: args.body,
    });
    const { total } = await stats(conn);
    return text(`posted #${row.id} to #${row.channel} as ${row.author}. board now holds ${total} messages.`);
  }

  if (name === 'board_list') {
    const rows = await listMessages(conn, { channel: args.channel || null, limit });
    if (args.full) return text(JSON.stringify(rows, null, 2));
    return text(`${rows.length} messages. newest: ${rows.slice(0, 3).map((r) => `#${r.id} ${r.author}: ${r.body}`).join(' | ')}`);
  }

  if (name === 'board_search') {
    if (!args.query) throw new Error('query is required');
    const rows = await searchMessages(conn, { query: args.query, channel: args.channel || null, limit });
    if (args.full) return text(JSON.stringify(rows, null, 2));
    return text(`${rows.length} matches. newest: ${rows.slice(0, 3).map((r) => `#${r.id} ${r.author}: ${r.body}`).join(' | ')}`);
  }

  throw new Error(`unknown tool "${name}"`);
}

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function reply(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function fail(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

async function handle(message) {
  const { id, method, params } = message;

  // Notifications carry no id and never get a reply.
  if (id === undefined || id === null) return;

  if (method === 'initialize') {
    reply(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
    });
    return;
  }

  if (method === 'ping') {
    reply(id, {});
    return;
  }

  if (method === 'tools/list') {
    reply(id, { tools: TOOLS });
    return;
  }

  if (method === 'tools/call') {
    const name = params && params.name;
    const args = (params && params.arguments) || {};
    try {
      reply(id, await callTool(name, args));
    } catch (err) {
      // A tool failure is a result with isError, never a protocol error.
      reply(id, { content: [{ type: 'text', text: 'board error: ' + err.message }], isError: true });
    }
    return;
  }

  fail(id, -32601, `method not found: ${method}`);
}

// stdin closing is the shutdown signal. Finish any request already in flight
// first, otherwise a client that pipes input loses the last reply.
function shutdown() {
  if (pending > 0) return;
  if (db) db.close().finally(() => process.exit(0));
  else process.exit(0);
}

function main() {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let cut;
    while ((cut = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        fail(null, -32700, 'parse error');
        continue;
      }
      pending++;
      handle(message)
        .catch((err) => fail(message.id ?? null, -32603, err.message))
        .finally(() => {
          pending--;
          if (closing) shutdown();
        });
    }
  });
  process.stdin.on('end', () => {
    closing = true;
    shutdown();
  });
}

main();
