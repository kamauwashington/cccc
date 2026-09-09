#!/usr/bin/env node
// Optional. Changes into a workspace and launches Claude Code there.
//
//   ./go 02            from the repository root
//   npm run go 02      the same thing through npm
//
// Typing the `cd` by hand the first two times teaches the launch directory rule
// better, so this script prints the command it is about to run. The rule it is
// teaching: .claude/settings.json is read from the directory you launch in and
// is never inherited from a parent.
//
// A workspace may ship a `launch.json` holding the flags and the opening prompt
// that its demo needs:
//
//   { "args": ["--model", "opus"], "prompt": "/start" }
//
// Those come first and anything typed after `--` is appended, so a flag on the
// command line still wins. Pass `--no-prompt` to launch without the prompt.

import path from 'node:path';
import { spawn } from 'node:child_process';
import { listWorkspaces, resolveWorkspace, readJson, c } from './lib.mjs';

const token = process.argv[2];
const ws = resolveWorkspace(token);

if (!ws) {
  console.error(c.red('go: no workspace matches "' + (token || '') + '"'));
  console.error('Usage: ./go 02');
  console.error('Known workspaces:');
  for (const w of listWorkspaces()) console.error('  ' + w.name);
  process.exit(1);
}


const typed = process.argv.slice(3);
const wantsPrompt = !typed.includes('--no-prompt');
const extra = typed.filter((a) => a !== '--no-prompt');

const launch = readJson(path.join(ws.dir, 'launch.json'), {}) || {};
const args = [...(Array.isArray(launch.args) ? launch.args : []), ...extra];
if (wantsPrompt && typeof launch.prompt === 'string' && launch.prompt) {
  args.push(launch.prompt);
}

console.log(c.dim('This is the same as typing:'));
console.log('  cd examples/' + ws.name + ' && claude ' + args.join(' '));
console.log('');

const child = spawn('claude', args, {
  cwd: ws.dir,
  stdio: 'inherit',
});

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error(c.red('go: claude CLI not found on PATH.'));
    process.exit(1);
  }
  throw err;
});

child.on('exit', (code) => process.exit(code ?? 0));
