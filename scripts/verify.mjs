#!/usr/bin/env node
// Two checks, and only two.
//
//   1. The root .claude/ directory holds settings.json and nothing else.
//      There is no way to exclude skills from a parent directory or from the
//      user's home directory. No setting exists for this. The only fix is to
//      keep the root .claude/ bare and to check that it stays bare.
//
//   2. Every workspace has the skeleton files from the template.
//
// This script must never flag repeated content between workspaces. The
// duplication is required by the tool, since settings do not inherit. It is
// also the point. An attendee can copy one folder out and it runs on its own.

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, listWorkspaces, readJson, c } from './lib.mjs';

const SKELETON_FILES = [
  'package.json',
  'README.md',
  'PROMPT.md',
  'reset.json',
  '.claude/settings.json',
  'CLAUDE.md',
  '.claude/hooks/complete.mjs',
];

// Most workspaces open with `/start`. 07 does not, because its whole lesson is
// that you run a command and read what comes back, so an opener would be one
// more thing between the attendee and the point. A missing start.md is a
// warning, never a failure.
const OPENER = '.claude/commands/start.md';

const SKELETON_DIRS = ['src', '.claude', '.pristine'];

// Most workspaces ship code and a test suite that proves it. 03 does not. Its
// lesson is the conversation, it writes no files, and a tests/ directory there
// would be a suite with nothing to test. A workspace opts out by leaving
// `verify` out of reset.json, and then these checks do not apply to it.
const CODE_FILES = ['vitest.config.ts'];
const CODE_DIRS = ['tests'];
const CODE_SCRIPTS = ['test', 'typecheck'];

const problems = [];
const warnings = [];

function checkRootClaudeIsBare() {
  const dir = path.join(REPO_ROOT, '.claude');
  if (!fs.existsSync(dir)) {
    problems.push('root .claude/ is missing. It should hold settings.json.');
    return;
  }
  const entries = fs.readdirSync(dir).filter((n) => n !== '.DS_Store');
  const allowed = new Set(['settings.json', 'settings.local.json']);
  const extra = entries.filter((n) => !allowed.has(n));
  if (extra.length) {
    problems.push(
      'root .claude/ holds extra entries: ' +
        extra.join(', ') +
        '\n    Anything here loads into all eight examples. Skills and CLAUDE.md ' +
        'files\n    in a parent directory cannot be excluded by any setting. ' +
        'Move it into\n    the workspace that needs it.'
    );
  }
  if (!entries.includes('settings.json')) {
    problems.push('root .claude/settings.json is missing.');
  }
}

function checkWorkspaceSkeleton(ws) {
  for (const rel of SKELETON_FILES) {
    if (!fs.existsSync(path.join(ws.dir, rel))) {
      problems.push(ws.name + ': missing ' + rel);
    }
  }
  for (const rel of SKELETON_DIRS) {
    const abs = path.join(ws.dir, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      problems.push(ws.name + ': missing directory ' + rel + '/');
    }
  }

  if (!fs.existsSync(path.join(ws.dir, OPENER))) {
    warnings.push(ws.name + ': no ' + OPENER + ', so it has no /start opener');
  }

  const manifest = readJson(path.join(ws.dir, 'reset.json'));
  const runsCode = Boolean(manifest && manifest.verify);

  if (runsCode) {
    for (const rel of CODE_FILES) {
      if (!fs.existsSync(path.join(ws.dir, rel))) {
        problems.push(ws.name + ': missing ' + rel);
      }
    }
    for (const rel of CODE_DIRS) {
      const abs = path.join(ws.dir, rel);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
        problems.push(ws.name + ': missing directory ' + rel + '/');
      }
    }
  }

  if (manifest) {
    if (!Array.isArray(manifest.restore) || manifest.restore.length === 0) {
      problems.push(ws.name + ': reset.json has no restore list');
    }
    if (!manifest.verify) {
      warnings.push(
        ws.name + ': reset.json has no verify command, so this workspace runs nothing'
      );
    }
    for (const target of manifest.restore || []) {
      const snap = path.join(ws.dir, '.pristine', target);
      const live = path.join(ws.dir, target);
      if (fs.existsSync(live) && !fs.existsSync(snap)) {
        problems.push(ws.name + ': .pristine/ has no snapshot of "' + target + '"');
      }
    }
  }

  // A workspace left on the template's placeholder name collides with every
  // other copy, and npm then refuses to run anything ("multiple workspaces with
  // the same name"). Catch it here rather than in a confusing npx failure.
  const pkg = readJson(path.join(ws.dir, 'package.json'));
  if (pkg) {
    const expected = '@ccc/' + ws.name;
    if (pkg.name !== expected) {
      problems.push(
        ws.name + ': package.json name is "' + pkg.name + '", expected "' + expected + '"'
      );
    }
    const required = runsCode ? ['reset', ...CODE_SCRIPTS] : ['reset'];
    for (const script of required) {
      if (!pkg.scripts || !pkg.scripts[script]) {
        problems.push(ws.name + ': package.json has no "' + script + '" script');
      }
    }
  }

  const settings = readJson(path.join(ws.dir, '.claude', 'settings.json'));
  if (settings) {
    const text = JSON.stringify(settings);
    if (text.includes(REPO_ROOT) || /"\/Users\/|"\/home\//.test(text)) {
      problems.push(
        ws.name + ': .claude/settings.json holds an absolute path. It has to stay portable.'
      );
    }
    if (!settings.hooks || !settings.hooks.Stop) {
      warnings.push(ws.name + ': .claude/settings.json has no Stop hook');
    }
  }

  // settings.local.json is generated. It must never be committed.
  const gitignore = fs.existsSync(path.join(REPO_ROOT, '.gitignore'))
    ? fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8')
    : '';
  if (!gitignore.includes('settings.local.json')) {
    problems.push('.gitignore does not ignore .claude/settings.local.json');
  }
}

function main() {
  checkRootClaudeIsBare();

  const workspaces = listWorkspaces();
  if (workspaces.length === 0) {
    warnings.push('no workspaces found under examples/');
  }
  for (const ws of workspaces) checkWorkspaceSkeleton(ws);

  for (const w of warnings) console.log('  ' + c.yellow('warn') + '  ' + w);
  for (const p of problems) console.log('  ' + c.red('fail') + '  ' + p);

  if (problems.length) {
    console.log(
      c.red(c.bold('verify failed')) +
        ': ' +
        problems.length +
        ' problems across ' +
        workspaces.length +
        ' workspaces'
    );
    process.exit(1);
  }

  console.log(
    c.green(c.bold('verify ok')) +
      ': root .claude/ is bare, ' +
      workspaces.length +
      ' workspaces have the skeleton'
  );
}

main();
