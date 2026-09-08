#!/usr/bin/env node
// Pre talk checks. Keep this small.
//
// `claude doctor` already checks installation, settings validity, MCP servers,
// plugin state, and skill list truncation. Run that from a shell for read only
// output. This script only covers what `claude doctor` does not know about.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  REPO_ROOT,
  HOME,
  listWorkspaces,
  compareVersions,
  CLAUDE_CODE_MIN_VERSION,
  CLAUDE_CODE_TESTED_VERSION,
  c,
} from './lib.mjs';

let failed = 0;
let warned = 0;

function ok(msg) {
  console.log('  ' + c.green('pass') + '  ' + msg);
}
function warn(msg) {
  warned++;
  console.log('  ' + c.yellow('warn') + '  ' + msg);
}
function fail(msg) {
  failed++;
  console.log('  ' + c.red('FAIL') + '  ' + msg);
}

function checkClaudeVersion() {
  let raw;
  try {
    raw = execSync('claude --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch {
    fail('claude CLI not found on PATH. Install it before the talk.');
    return;
  }
  const m = raw.match(/(\d+\.\d+\.\d+)/);
  if (!m) {
    warn('could not parse a version from: ' + raw.trim());
    return;
  }
  const version = m[1];
  if (compareVersions(version, CLAUDE_CODE_MIN_VERSION) < 0) {
    fail(
      'Claude Code ' + version + ' is below the pinned floor ' + CLAUDE_CODE_MIN_VERSION + '. Upgrade.'
    );
    return;
  }
  if (compareVersions(version, CLAUDE_CODE_TESTED_VERSION) !== 0) {
    warn(
      'Claude Code ' +
        version +
        ' differs from the tested version ' +
        CLAUDE_CODE_TESTED_VERSION +
        '. Walk section 11 of the build plan again.'
    );
    return;
  }
  ok('Claude Code ' + version + ' matches the tested version');
}

function checkVerify() {
  try {
    execSync('node ' + path.join(REPO_ROOT, 'scripts', 'verify.mjs'), {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    ok('verify.mjs passes');
  } catch (err) {
    fail('verify.mjs failed. Run `npm run verify` to see why.');
  }
}

function checkProse() {
  try {
    execSync('node ' + path.join(REPO_ROOT, 'scripts', 'lint-prose.mjs'), {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    ok('prose lint passes');
  } catch {
    fail('prose lint failed. Run `npm run lint:prose` to see why.');
  }
}

function checkPristine() {
  const workspaces = listWorkspaces();
  const missing = workspaces.filter((w) => !fs.existsSync(path.join(w.dir, '.pristine')));
  if (missing.length) {
    fail('.pristine/ missing in: ' + missing.map((w) => w.name).join(', '));
    return;
  }
  ok('.pristine/ exists in all ' + workspaces.length + ' workspaces');
}

function checkInstalled() {
  const workspaces = listWorkspaces();
  const rootModules = fs.existsSync(path.join(REPO_ROOT, 'node_modules'));
  if (!rootModules) {
    fail('node_modules is missing at the repository root. Run `npm install`.');
    return;
  }
  const noBin = workspaces.filter(
    (w) => !fs.existsSync(path.join(w.dir, 'node_modules')) && !fs.existsSync(path.join(REPO_ROOT, 'node_modules', 'vitest'))
  );
  if (noBin.length) {
    fail('workspaces look uninstalled: ' + noBin.map((w) => w.name).join(', '));
    return;
  }
  ok('workspaces are installed');
}

function checkLocalSettings() {
  const workspaces = listWorkspaces();
  const missing = workspaces.filter(
    (w) => !fs.existsSync(path.join(w.dir, '.claude', 'settings.local.json'))
  );
  if (missing.length) {
    fail(
      'settings.local.json missing in: ' +
        missing.map((w) => w.name).join(', ') +
        '. Run `npm run setup`.'
    );
    return;
  }
  ok('generated settings.local.json present everywhere');
}

// This is the leak the repository cannot fix from inside. There is no setting
// that excludes skills from a parent directory or from the home directory.
function checkHomeLeakage() {
  const skillsDir = path.join(HOME, '.claude', 'skills');
  if (fs.existsSync(skillsDir)) {
    const entries = fs.readdirSync(skillsDir).filter((n) => !n.startsWith('.'));
    if (entries.length) {
      warn(
        '~/.claude/skills/ holds ' +
          entries.length +
          ' skills (' +
          entries.slice(0, 5).join(', ') +
          (entries.length > 5 ? ', ...' : '') +
          ').\n        These load in every example and no setting can exclude them.\n' +
          '        Move them aside before the talk if a demo behaves oddly.'
      );
    } else {
      ok('~/.claude/skills/ is empty');
    }
  } else {
    ok('~/.claude/skills/ does not exist');
  }

  // A personal output style competes with the project style in example 08.
  const stylesDir = path.join(HOME, '.claude', 'output-styles');
  if (fs.existsSync(stylesDir)) {
    const styles = fs.readdirSync(stylesDir).filter((n) => n.endsWith('.md'));
    if (styles.length) {
      warn(
        '~/.claude/output-styles/ holds ' +
          styles.length +
          ' styles (' +
          styles.slice(0, 5).join(', ') +
          (styles.length > 5 ? ', ...' : '') +
          ').\n        One of these can win over the project style in example 08.\n' +
          '        Check `/output-style` in that workspace before the talk.'
      );
    } else {
      ok('~/.claude/output-styles/ is empty');
    }
  } else {
    ok('~/.claude/output-styles/ does not exist');
  }

  const homeMd = path.join(HOME, '.claude', 'CLAUDE.md');
  if (fs.existsSync(homeMd)) {
    ok('~/.claude/CLAUDE.md exists and is excluded by claudeMdExcludes');
  }
}

function main() {
  console.log(c.bold('preflight') + ' ' + c.dim('(run `claude doctor` too, it checks other things)'));
  checkClaudeVersion();
  checkInstalled();
  checkLocalSettings();
  checkPristine();
  checkVerify();
  checkProse();
  checkHomeLeakage();

  console.log('');
  if (failed) {
    console.log(c.red(c.bold('preflight failed')) + ': ' + failed + ' failures, ' + warned + ' warnings');
    process.exit(1);
  }
  console.log(c.green(c.bold('preflight ok')) + ': ' + warned + ' warnings');
  console.log(c.dim('Next: run `claude doctor`, then rehearse the four live examples.'));
}

main();
