#!/usr/bin/env node
// Stop hook. Runs when Claude finishes a turn.
//
// Four jobs:
//   1. Run the `verify` command from reset.json.
//   2. Count how many files changed against the .pristine/ snapshot.
//   3. Write RESULT.md.
//   4. Print one line and ring the terminal bell.
//
// Three rules this file has to keep:
//   - Always exit 0. A non zero exit can block or loop the model. Failures show
//     up as text in the line, never as an exit code.
//   - The no change path has to finish well under a second. This runs every
//     time Claude finishes a turn.
//   - Debounce. A chatty session would otherwise run the test suite six times.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(HERE, '..', '..');
const STATE = path.join(WS, '.claude', '.complete-state.json');
const PRISTINE = path.join(WS, '.pristine');
const VERIFY_TIMEOUT_MS = Number(process.env.CCC_VERIFY_TIMEOUT_MS || 180000);
const BELL = '\u0007'; // terminal bell
const MAX_LISTED = 12; // cap the printed file list so a big change cannot flood

const name = path.basename(WS);
const started = Date.now();

function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

// Walk a directory or a single file and collect path, size, and mtime.
// Size plus mtime is enough to debounce and it costs one stat per file.
function stamp(target, out) {
  const abs = path.join(WS, target);
  let st;
  try {
    st = fs.statSync(abs);
  } catch {
    return;
  }
  if (st.isDirectory()) {
    for (const entry of fs.readdirSync(abs)) {
      if (entry === 'node_modules' || entry === '.git') continue;
      stamp(path.join(target, entry), out);
    }
    return;
  }
  out.push(target + ':' + st.size + ':' + Math.floor(st.mtimeMs));
}

function fingerprint(targets) {
  const out = [];
  for (const t of targets) stamp(t, out);
  out.sort();
  return out.join('|');
}

// Collect every file under a restore target, as a workspace relative path.
function listFiles(target, out) {
  const abs = path.join(WS, target);
  let st;
  try {
    st = fs.statSync(abs);
  } catch {
    return;
  }
  if (st.isDirectory()) {
    for (const entry of fs.readdirSync(abs)) {
      if (entry === 'node_modules' || entry === '.git') continue;
      listFiles(path.join(target, entry), out);
    }
    return;
  }
  out.push(target);
}

// Which files differ from the snapshot, and how long each one is now.
// Byte compare rather than git, so this works with no repository at all.
function changedFiles(targets) {
  const live = [];
  for (const t of targets) listFiles(t, live);

  const changed = [];
  for (const rel of live) {
    const b = path.join(WS, rel);
    let now;
    try {
      now = fs.readFileSync(b);
    } catch {
      continue;
    }
    let before = null;
    try {
      before = fs.readFileSync(path.join(PRISTINE, rel));
    } catch {
      // A file the snapshot does not have counts as changed.
    }
    if (before && before.equals(now)) continue;
    const lines = now.toString('utf8').replace(/\n$/, '').split('\n').length;
    changed.push({ rel, lines });
  }
  changed.sort((a, b) => a.rel.localeCompare(b.rel));
  return changed;
}

function run(cmd) {
  try {
    // Keep stdout on the pass path too. The test score lives in it, and
    // "tests 24/24" is the number the room wants to see.
    const out = execSync(cmd, {
      cwd: WS,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: VERIFY_TIMEOUT_MS,
      env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
    });
    return { ok: true, output: String(out || '') };
  } catch (err) {
    // Keep the whole thing. The score lives in the vitest summary, which sits
    // at the end of stdout and therefore in the middle once stderr is appended.
    // Slicing here would cut it off. RESULT.md does its own slicing instead.
    return { ok: false, output: String(err.stdout || '') + String(err.stderr || '') };
  }
}

// Pull a "24/24" style score out of a vitest run when one is there.
// Strip ANSI first. Vitest still emits colour codes between the words even with
// FORCE_COLOR=0, and they sit right where the regex needs to match.
function testScore(output) {
  const plain = output.replace(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'), '');
  const m = plain.match(/Tests\s+(?:(\d+)\s+failed[^\n|]*\|\s*)?(\d+)\s+passed\s*\((\d+)\)/);
  if (!m) return null;
  return m[2] + '/' + m[3];
}

function main() {
  const reset = readJson(path.join(WS, 'reset.json'), {});
  const targets = reset.restore && reset.restore.length ? reset.restore : ['src', 'tests'];
  const verifyCmd = reset.verify;

  const fp = fingerprint(targets);
  const prev = readJson(STATE, {});
  if (prev.fingerprint === fp) {
    // Nothing changed since the last run. Say so and stop. This is the path
    // that has to stay fast.
    process.stdout.write('[skip] ' + name + '  no file changes since last check\n');
    return;
  }

  const changed = changedFiles(targets);
  const changedCount = changed.length;
  let status = 'ok';
  let detail = 'no verify command in reset.json';
  let body = '';

  if (verifyCmd) {
    const res = run(verifyCmd);
    const score = testScore(res.output);
    if (res.ok) {
      detail = score ? 'typecheck ok  tests ' + score : 'verify ok';
    } else {
      status = 'fail';
      detail = score ? 'verify failed  tests ' + score : 'verify failed';
      body = res.output;
    }
  }

  const secs = Math.round((Date.now() - started) / 1000);
  const line = '[' + status + '] ' + name + '  ' + secs + 's  ' + changedCount + ' files  ' + detail;

  fs.writeFileSync(
    path.join(WS, 'RESULT.md'),
    [
      '# ' + name,
      '',
      '- status: ' + status,
      '- elapsed: ' + secs + 's',
      '- files changed vs .pristine: ' + changedCount,
      '- verify: `' + (verifyCmd || '(none)') + '`',
      '- detail: ' + detail,
      '- checked: ' + new Date().toISOString(),
      '',
      '## Files written',
      '',
      changed.length
        ? changed.map((f) => '- `' + f.rel + '` ' + f.lines + ' lines').join('\n') + '\n'
        : 'None.\n',
      body ? '## Output tail\n\n```\n' + body.slice(-4000) + '\n```\n' : '',
    ].join('\n'),
    'utf8'
  );

  fs.writeFileSync(STATE, JSON.stringify({ fingerprint: fp, at: Date.now() }), 'utf8');

  // Print the summary here so nobody has to type `cat RESULT.md` on stage.
  // A Stop hook runs after the turn ends, so the model cannot read RESULT.md
  // in the same turn. The hook is the only thing that can show it.
  process.stdout.write(line + '\n');
  for (const f of changed.slice(0, MAX_LISTED)) {
    process.stdout.write('  ' + f.rel.padEnd(34) + String(f.lines).padStart(5) + ' lines\n');
  }
  if (changed.length > MAX_LISTED) {
    process.stdout.write('  and ' + (changed.length - MAX_LISTED) + ' more\n');
  }
  process.stdout.write(BELL);
}

try {
  main();
} catch (err) {
  process.stdout.write('[warn] ' + name + '  completion hook error: ' + err.message + '\n');
}
process.exit(0); // always
