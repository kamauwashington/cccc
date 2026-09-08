#!/usr/bin/env node
// Refreshes the .pristine/ snapshot for a workspace from its current files.
//
// Run this when you change an example's starting state on purpose. Never run it
// after a demo, because it would bake the solution into the snapshot.
//
//   node scripts/snapshot.mjs 02
//   node scripts/snapshot.mjs --all

import fs from 'node:fs';
import path from 'node:path';
import {
  listWorkspaces,
  resolveWorkspace,
  readJson,
  rmrf,
  copyRecursive,
  c,
} from './lib.mjs';

function snapshotOne({ name, dir }) {
  const manifest = readJson(path.join(dir, 'reset.json'));
  if (!manifest) {
    console.log('  ' + c.red('skip') + ' ' + name + '  no reset.json');
    return false;
  }
  const pristine = path.join(dir, '.pristine');
  rmrf(pristine);
  fs.mkdirSync(pristine, { recursive: true });

  let count = 0;
  for (const target of manifest.restore || []) {
    const from = path.join(dir, target);
    if (!fs.existsSync(from)) continue;
    copyRecursive(from, path.join(pristine, target));
    count++;
  }

  fs.writeFileSync(
    path.join(pristine, 'README.md'),
    [
      '# Reset snapshot',
      '',
      'This folder is the starting state of `' + name + '`.',
      '',
      '`scripts/reset.mjs` copies these files back over the live ones. Do not edit',
      'anything here while working on the example. Change the live files, then run',
      '`node scripts/snapshot.mjs ' + name.slice(0, 2) + '` on purpose.',
      '',
      'The workspace settings deny Read and Edit on this folder so Claude does not',
      'find the starting state and copy from it.',
      '',
    ].join('\n'),
    'utf8'
  );

  console.log('  ' + c.green('snap') + '  ' + name.padEnd(22) + count + ' targets captured');
  return true;
}

function main() {
  const token = process.argv[2];
  const all = token === '--all' || !token;
  const targets = all ? listWorkspaces() : [resolveWorkspace(token)].filter(Boolean);

  if (!all && targets.length === 0) {
    console.error(c.red('snapshot: no workspace matches "' + token + '"'));
    process.exit(1);
  }

  let ok = 0;
  for (const ws of targets) if (snapshotOne(ws)) ok++;
  console.log(c.bold('snapshot') + ': ' + ok + '/' + targets.length + ' workspaces captured');
}

main();
