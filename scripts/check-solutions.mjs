#!/usr/bin/env node
// Proves that every shipped .solution/ actually passes.
//
// Each workspace starts broken on purpose, so a plain `npm test` across the
// repository is red by design. That makes it useless as a CI signal. This
// script gives CI something real to check.
//
// For each workspace that ships a .solution/:
//   1. Copy .solution/ over the live files.
//   2. Run the workspace's verify command.
//   3. Restore the workspace from .pristine/.
//
// The restore runs in a finally block, so a failure still leaves the workspace
// at its starting state.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { REPO_ROOT, listWorkspaces, readJson, copyRecursive, c } from './lib.mjs';

function restore(ws) {
  try {
    execSync('node ' + path.join(REPO_ROOT, 'scripts', 'reset.mjs') + ' ' + ws.name, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    console.log('  ' + c.red('restore failed for ' + ws.name + ': ' + err.message));
  }
}

// A solution has to earn its green by changing the code. Shipping an edited
// test, a loosened tsconfig, or a rewritten vitest config would make the check
// meaningless, so refuse those outright rather than trusting the author.
const PROTECTED = ['tests', 'vitest.config.ts', 'tsconfig.json', 'package.json'];

function tamperedPaths(solutionDir) {
  return PROTECTED.filter((entry) => fs.existsSync(path.join(solutionDir, entry)));
}

function checkOne(ws) {
  const solution = path.join(ws.dir, '.solution');
  if (!fs.existsSync(solution)) {
    console.log('  ' + c.dim('skip  ' + ws.name.padEnd(22) + 'no .solution/ (take home example)'));
    return null;
  }

  const tampered = tamperedPaths(solution);
  if (tampered.length) {
    console.log('  ' + c.red('FAIL') + '  ' + ws.name.padEnd(22) + 'solution edits protected files');
    console.log(
      c.dim(
        '        .solution/ contains: ' +
          tampered.join(', ') +
          '\n        A solution must pass by changing src, not by changing the tests\n' +
          '        or the config. Remove those from .solution/ and fix the code.'
      )
    );
    return false;
  }

  const manifest = readJson(path.join(ws.dir, 'reset.json'), {});
  const verify = manifest.verify;

  // No verify command means the workspace runs nothing, so there is no green to
  // earn. A leftover .solution/ there is stale, and this says so.
  if (!verify) {
    console.log(
      '  ' + c.dim('skip  ' + ws.name.padEnd(22) + 'no verify command, nothing to prove')
    );
    return null;
  }

  try {
    for (const entry of fs.readdirSync(solution)) {
      if (entry === 'README.md') continue;
      copyRecursive(path.join(solution, entry), path.join(ws.dir, entry));
    }

    execSync(verify, {
      cwd: ws.dir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
      timeout: 300000,
    });

    // Belt and braces. The solution could have run a script that rewrote a
    // test on the way past, so compare the live tests against the snapshot.
    const drifted = PROTECTED.filter((entry) => {
      const a = path.join(ws.dir, '.pristine', entry);
      const b = path.join(ws.dir, entry);
      if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
      try {
        execSync('git diff --no-index --quiet -- ' + JSON.stringify(a) + ' ' + JSON.stringify(b), {
          stdio: 'ignore',
          timeout: 15000,
        });
        return false;
      } catch {
        return true;
      }
    });

    if (drifted.length) {
      console.log('  ' + c.red('FAIL') + '  ' + ws.name.padEnd(22) + 'tests or config drifted');
      console.log(c.dim('        changed during the run: ' + drifted.join(', ')));
      return false;
    }

    console.log('  ' + c.green('pass') + '  ' + ws.name.padEnd(22) + verify);
    return true;
  } catch (err) {
    // Show the lines that say what broke. Slicing the tail lands on npm's
    // trailer instead of the vitest summary, which hides the real failure.
    const raw = String(err.stdout || '') + String(err.stderr || '');
    const plain = raw.replace(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'), '');
    const useful = plain
      .split('\n')
      .filter((l) => /(FAIL|Tests\s+\d|error TS\d|AssertionError|Error:|✕|×|timed out)/.test(l))
      .slice(0, 20);
    const shown = useful.length ? useful : plain.split('\n').slice(-20);
    console.log('  ' + c.red('FAIL') + '  ' + ws.name.padEnd(22) + verify);
    console.log(c.dim(shown.map((l) => '        ' + l.trim()).join('\n')));
    return false;
  } finally {
    restore(ws);
  }
}

function main() {
  console.log(c.bold('check-solutions') + c.dim('  (applies .solution/, verifies, then resets)'));
  const results = listWorkspaces().map((ws) => ({ ws, ok: checkOne(ws) }));
  const checked = results.filter((r) => r.ok !== null);
  const failed = checked.filter((r) => r.ok === false);

  console.log('');
  if (failed.length) {
    console.log(
      c.red(c.bold('check-solutions failed')) +
        ': ' +
        failed.length +
        '/' +
        checked.length +
        ' solutions do not pass'
    );
    process.exit(1);
  }
  console.log(
    c.green(c.bold('check-solutions ok')) + ': ' + checked.length + ' solutions pass'
  );
}

main();
