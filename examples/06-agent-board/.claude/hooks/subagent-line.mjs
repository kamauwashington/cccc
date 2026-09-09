#!/usr/bin/env node
// SubagentStart and SubagentStop hook. One file, both events.
//
// The point of this file: visibility costs zero model tokens. If you ask the
// agents to report their own timings, you pay for every one of those words in
// output tokens, and output tokens are wall clock time. A hook reads the same
// facts from outside the model for free.
//
// SubagentStart prints the agent's opener in character and stashes a start
// time keyed by agent id.
// SubagentStop prints one coloured line and appends a row to TRANSCRIPT.md.
//
// Two rules this file has to keep:
//   - Always exit 0. A non zero exit from a Stop style hook can block the run.
//   - Never throw on a missing field. Hook payloads differ between versions,
//     so every read is guarded and every value has a fallback.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(HERE, '..', '..');
const STARTS = path.join(WS, '.claude', '.subagent-starts.json');
const TRANSCRIPT = path.join(WS, 'TRANSCRIPT.md');

const COLORS = {
  copperhead: '\u001b[32m',
  cottonmouth: '\u001b[35m',
  'black-mamba': '\u001b[33m',
  sidewinder: '\u001b[38;5;208m',
};
// What each agent says when it picks up its file. The hook says it, so the
// line costs zero output tokens and lands the moment the agent starts.
const OPENERS = {
  copperhead: 'Copperhead here. The schema is mine.',
  cottonmouth: 'Cottonmouth here. I will take the spec.',
  'black-mamba': 'Black Mamba here. Routes. Stand back.',
  sidewinder: 'Sidewinder here. I read. I judge. I leave.',
};

const CYAN = '\u001b[36m';
const RESET = '\u001b[0m';
const DIM = '\u001b[2m';

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

// Pull the entries that belong to this subagent out of the session transcript.
// Newer transcripts tag every entry with an agent id. Older ones only mark the
// side chain, so the tail is the best guess available.
function transcriptEntries(transcriptPath, agentId) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return [];
  let lines;
  try {
    lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
  } catch {
    return [];
  }
  const all = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      all.push(JSON.parse(line));
    } catch {
      // A partially flushed last line is normal. Skip it.
    }
  }
  if (agentId) {
    const exact = all.filter(
      (e) => e && (e.agentId === agentId || e.agent_id === agentId || e.subagentId === agentId)
    );
    if (exact.length) return exact;
  }
  const tail = [];
  for (let i = all.length - 1; i >= 0; i--) {
    const e = all[i];
    if (!e || e.isSidechain !== true) break;
    tail.unshift(e);
  }
  return tail;
}

function summarise(entries) {
  let model = null;
  let output = 0;
  let inputPeak = 0;
  let first = null;
  let last = null;

  for (const e of entries) {
    const ts = e && e.timestamp ? Date.parse(e.timestamp) : NaN;
    if (Number.isFinite(ts)) {
      if (first === null || ts < first) first = ts;
      if (last === null || ts > last) last = ts;
    }
    const msg = e && e.message;
    if (!msg) continue;
    if (msg.model) model = msg.model;
    const u = msg.usage;
    if (!u) continue;
    output += Number(u.output_tokens || 0);
    const inp =
      Number(u.input_tokens || 0) +
      Number(u.cache_read_input_tokens || 0) +
      Number(u.cache_creation_input_tokens || 0);
    if (inp > inputPeak) inputPeak = inp;
  }

  return { model, tokens: inputPeak + output, output, first, last };
}

function shortModel(model) {
  if (!model) return 'unknown';
  const m = String(model).match(/(opus|sonnet|haiku|fable)/i);
  return m ? m[1].toLowerCase() : String(model).slice(0, 24);
}

function fmtSecs(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '?';
  return (ms / 1000).toFixed(1) + 's';
}

function onStart(payload) {
  const name = payload.agent_type || payload.subagent_type || 'subagent';
  const id = payload.agent_id || name;

  const colour = COLORS[name] || CYAN;
  const opener = OPENERS[name] || 'On it.';
  process.stdout.write(colour + '  [' + name + ']' + RESET + ' ' + opener + '\n');

  const starts = readJson(STARTS, {});
  starts[id] = Date.now();
  try {
    fs.writeFileSync(STARTS, JSON.stringify(starts), 'utf8');
  } catch {
    // A read only checkout is fine. The transcript timestamps still work.
  }
}

function onStop(payload) {
  const name = payload.agent_type || payload.subagent_type || 'subagent';
  const id = payload.agent_id || name;

  const entries = transcriptEntries(payload.transcript_path, payload.agent_id);
  const stats = summarise(entries);

  const starts = readJson(STARTS, {});
  const startedAt = starts[id] || starts[name] || stats.first;
  const elapsed = startedAt ? Date.now() - startedAt : stats.last - stats.first;

  if (starts[id]) {
    delete starts[id];
    try {
      fs.writeFileSync(STARTS, JSON.stringify(starts), 'utf8');
    } catch {
      // Ignore.
    }
  }

  const model = shortModel(stats.model);
  const tokens = stats.tokens > 0 ? String(stats.tokens) : '?';
  const colour = COLORS[name] || CYAN;

  process.stdout.write(
    colour +
      '  [' +
      name +
      ']' +
      RESET +
      ' ' +
      DIM +
      model.padEnd(7) +
      fmtSecs(elapsed).padStart(7) +
      '  ' +
      tokens.padStart(7) +
      ' tokens' +
      RESET +
      '\n'
  );

  try {
    if (!fs.existsSync(TRANSCRIPT)) {
      fs.writeFileSync(
        TRANSCRIPT,
        '# Subagent transcript\n\nWritten by `.claude/hooks/subagent-line.mjs`. One row per finished subagent.\n\n' +
          '| agent | model | elapsed | tokens | at |\n| --- | --- | --- | --- | --- |\n',
        'utf8'
      );
    }
    fs.appendFileSync(
      TRANSCRIPT,
      '| ' +
        name +
        ' | ' +
        model +
        ' | ' +
        fmtSecs(elapsed) +
        ' | ' +
        tokens +
        ' | ' +
        new Date().toISOString() +
        ' |\n',
      'utf8'
    );
  } catch {
    // Never fail the run over a log line.
  }
}

try {
  const payload = readStdin();
  if (payload.hook_event_name === 'SubagentStart') onStart(payload);
  else onStop(payload);
} catch (err) {
  process.stdout.write('  [warn] subagent-line hook: ' + err.message + '\n');
}
process.exit(0); // always
