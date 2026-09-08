#!/usr/bin/env node
// Copies a workspace's .solution/ folder over the live files.
//
//   npm run solution -- 06
//
// This is the fallback for a live run that stalls. Use it, keep talking, and
// move on. Not every workspace ships a .solution/ folder. The ones that get
// demoed live do.

import fs from 'node:fs';
import path from 'node:path';
import { listWorkspaces, resolveWorkspace, copyRecursive, c } from './lib.mjs';

function applyOne(ws) {
  const solution = path.join(ws.dir, '.solution');
  if (!fs.existsSync(solution)) {
    console.log('  ' + c.dim('skip  ' + ws.name.padEnd(22) + 'no .solution/ folder'));
    return false;
  }

  let count = 0;
  for (const entry of fs.readdirSync(solution)) {
    if (entry === 'README.md') continue;
    copyRecursive(path.join(solution, entry), path.join(ws.dir, entry));
    count++;
  }

  console.log('  ' + c.green('apply') + ' ' + ws.name.padEnd(22) + count + ' targets copied');
  return true;
}

const token = process.argv[2];
const all = !token || token === '--all';

if (all) {
  // Green the whole repository in one command. Useful for showing what the
  // finished state looks like, and for checking the examples still work.
  const workspaces = listWorkspaces();
  let ok = 0;
  for (const ws of workspaces) if (applyOne(ws)) ok++;
  console.log(c.bold('solution') + ': ' + ok + '/' + workspaces.length + ' workspaces solved');
  console.log(c.dim('Run `npm run reset` to put every example back to its starting state.'));
} else {
  const ws = resolveWorkspace(token);
  if (!ws) {
    console.error(c.red('solution: no workspace matches "' + token + '"'));
    console.error('Known workspaces: ' + listWorkspaces().map((w) => w.name).join(', '));
    process.exit(1);
  }
  if (!applyOne(ws)) process.exit(1);
  console.log(c.dim('Run `npm run reset -- ' + ws.name.slice(0, 2) + '` to go back to the start.'));
}
