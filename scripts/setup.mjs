#!/usr/bin/env node
// Writes .claude/settings.local.json in every workspace. It does nothing else.
//
// These values have to be absolute paths, so they cannot be committed. That is
// the whole reason this script exists.
//
// Two settings matter here:
//
//   autoMemoryDirectory
//     Redirects auto memory into the workspace, where it is visible and easy to
//     wipe. The value has to be absolute or start with "~/". A relative path is
//     ignored. Local scope is used because whether project scope is honoured is
//     contested across doc versions, and local scope works everywhere.
//
//   claudeMdExcludes
//     Globs matched against absolute paths. Covers .claude/rules/ files as well
//     as CLAUDE.md files. The two home directory entries matter most. They stop
//     the presenter's personal instructions from changing how a demo behaves.

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, HOME, listWorkspaces, readJson, writeJson, c } from './lib.mjs';

function localSettingsFor(ws) {
  return {
    autoMemoryDirectory: path.resolve(ws, '.claude/memory'),
    claudeMdExcludes: [
      path.join(REPO_ROOT, 'CLAUDE.md'),
      path.join(REPO_ROOT, 'CLAUDE.local.md'),
      path.join(REPO_ROOT, '.claude/CLAUDE.md'),
      path.join(REPO_ROOT, '.claude/rules/**'),
      path.join(REPO_ROOT, 'examples/CLAUDE.md'),
      path.join(HOME, '.claude/CLAUDE.md'),
      path.join(HOME, '.claude/rules/**'),
    ],
  };
}

function main() {
  const workspaces = listWorkspaces();
  if (workspaces.length === 0) {
    console.log(c.yellow('setup: no workspaces under examples/ yet. Nothing to do.'));
    return;
  }

  let written = 0;
  for (const { name, dir } of workspaces) {
    const target = path.join(dir, '.claude', 'settings.local.json');
    const next = localSettingsFor(dir);

    // Keep any keys a presenter added by hand, and overwrite only what this
    // script owns.
    const existing = readJson(target, {});
    const merged = { ...existing, ...next };

    const before = JSON.stringify(existing);
    const after = JSON.stringify(merged);

    fs.mkdirSync(path.join(dir, '.claude', 'memory'), { recursive: true });
    if (before !== after) {
      writeJson(target, merged);
      written++;
    }
    console.log(
      '  ' + c.dim(name.padEnd(22)) + (before !== after ? c.green('wrote') : c.dim('up to date'))
    );
  }

  console.log(
    c.bold('setup') +
      ': ' +
      workspaces.length +
      ' workspaces, ' +
      written +
      ' settings.local.json written'
  );
}

main();
