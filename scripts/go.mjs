#!/usr/bin/env node
// Optional. Changes into a workspace and launches Claude Code there.
//
//   npm run go 02
//
// Typing the `cd` by hand the first two times teaches the launch directory rule
// better, so this script prints the command it is about to run. The rule it is
// teaching: .claude/settings.json is read from the directory you launch in and
// is never inherited from a parent.

import { spawn } from 'node:child_process';
import { listWorkspaces, resolveWorkspace, c } from './lib.mjs';

const token = process.argv[2];
const ws = resolveWorkspace(token);

if (!ws) {
  console.error(c.red('go: no workspace matches "' + (token || '') + '"'));
  console.error('Usage: npm run go 02');
  console.error('Known workspaces:');
  for (const w of listWorkspaces()) console.error('  ' + w.name);
  process.exit(1);
}

console.log(c.dim('This is the same as typing:'));
console.log('  cd examples/' + ws.name + ' && claude');
console.log('');

const child = spawn('claude', process.argv.slice(3), {
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
