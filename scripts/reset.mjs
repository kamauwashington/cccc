#!/usr/bin/env node
// Usage:
//   npm run reset -- 02      restore one workspace
//   npm run reset            restore every workspace
//
// Copy based restore from the .pristine/ snapshot. It does not need git and it
// catches gitignored files, which is the point. Auto memory and RESULT.md are
// both gitignored, and both have to go.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  listWorkspaces,
  resolveWorkspace,
  readJson,
  rmrf,
  copyRecursive,
  expandGlob,
  c,
} from './lib.mjs';

function resetOne({ name, dir }) {
  const manifest = readJson(path.join(dir, 'reset.json'));
  if (!manifest) {
    console.log('  ' + c.red('skip') + ' ' + name + '  no reset.json');
    return false;
  }

  const pristine = path.join(dir, '.pristine');
  if (!fs.existsSync(pristine)) {
    console.log('  ' + c.red('skip') + ' ' + name + '  no .pristine/ snapshot');
    return false;
  }

  let restored = 0;
  for (const target of manifest.restore || []) {
    const from = path.join(pristine, target);
    const to = path.join(dir, target);
    if (!fs.existsSync(from)) {
      // No snapshot entry for this target. Deleting the live file here would be
      // destructive and surprising, and it is usually a stale snapshot rather
      // than a file that should not exist. Say so and leave it alone. Use the
      // `delete` list for files the starting state must not have.
      if (fs.existsSync(to)) {
        console.log(
          '  ' +
            c.yellow('warn') +
            '  ' +
            name +
            ': "' +
            target +
            '" has no .pristine entry. Left as is. Run `node scripts/snapshot.mjs ' +
            name.slice(0, 2) +
            '`.'
        );
      }
      continue;
    }
    rmrf(to);
    copyRecursive(from, to);
    restored++;
  }

  let deleted = 0;
  for (const pattern of manifest.delete || []) {
    for (const hit of expandGlob(dir, pattern)) {
      rmrf(hit);
      deleted++;
    }
  }

  // Auto memory always goes, whether or not it is listed. It is the one thing
  // /rewind will not clear.
  const memory = path.join(dir, '.claude', 'memory');
  rmrf(memory);
  fs.mkdirSync(memory, { recursive: true });
  // Keep the placeholder so the folder matches the snapshot. Without it the
  // completion hook counts the empty directory as a changed file every run.
  const keep = path.join(pristine, '.claude', 'memory', '.gitkeep');
  if (fs.existsSync(keep)) fs.copyFileSync(keep, path.join(memory, '.gitkeep'));

  if (manifest.postReset) {
    try {
      execSync(manifest.postReset, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      console.log('  ' + c.yellow('warn') + ' ' + name + '  postReset failed: ' + err.message);
    }
  }

  console.log(
    '  ' +
      c.green('reset') +
      ' ' +
      name.padEnd(22) +
      restored +
      ' restored, ' +
      deleted +
      ' deleted, memory cleared'
  );
  return true;
}

function main() {
  const token = process.argv[2];
  const targets = token ? [resolveWorkspace(token)].filter(Boolean) : listWorkspaces();

  if (token && targets.length === 0) {
    console.error(c.red('reset: no workspace matches "' + token + '"'));
    console.error('Known workspaces: ' + listWorkspaces().map((w) => w.name).join(', '));
    process.exit(1);
  }
  if (targets.length === 0) {
    console.log(c.yellow('reset: no workspaces found.'));
    return;
  }

  let ok = 0;
  for (const ws of targets) if (resetOne(ws)) ok++;

  console.log(c.bold('reset') + ': ' + ok + '/' + targets.length + ' workspaces restored');
  if (targets.length === 1) {
    console.log(c.dim('Run /clear next so the conversation forgets the previous attempt.'));
  }
}

main();
