#!/usr/bin/env node
// Swaps which root CLAUDE.md is active. One tree, two root files.
//
// Lean mode on disk:   CLAUDE.md (the map)  +  CLAUDE.fat.md (parked)
// Fat mode on disk:    CLAUDE.md (the copy) +  CLAUDE.lean.md (parked)
//
// The parked file is always named for what it holds, so a glance at the
// directory listing tells you which mode you are in. Both modes hold the same
// two byte sequences, so `npm run fat` then `npm run lean` is a round trip.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ACTIVE = path.join(HERE, 'CLAUDE.md');
const PARKED_FAT = path.join(HERE, 'CLAUDE.fat.md');
const PARKED_LEAN = path.join(HERE, 'CLAUDE.lean.md');

export function currentMode() {
  const fatParked = fs.existsSync(PARKED_FAT);
  const leanParked = fs.existsSync(PARKED_LEAN);
  if (fatParked && !leanParked) return 'lean';
  if (leanParked && !fatParked) return 'fat';
  throw new Error(
    'CLAUDE.fat.md and CLAUDE.lean.md cannot both be present or both be missing. ' +
      'Exactly one of them is the parked file.'
  );
}

function move(from, to) {
  fs.renameSync(from, to);
}

export function setMode(target) {
  const mode = currentMode();
  if (mode === target) return { mode, changed: false };
  if (target === 'fat') {
    move(ACTIVE, PARKED_LEAN);
    move(PARKED_FAT, ACTIVE);
  } else {
    move(ACTIVE, PARKED_FAT);
    move(PARKED_LEAN, ACTIVE);
  }
  return { mode: target, changed: true };
}

// Matches `wc -l`, so the number printed here is the number a reader can check.
function lineCount(file) {
  return fs.readFileSync(file, 'utf8').replace(/\n$/, '').split('\n').length;
}

function main() {
  const target = process.argv[2];
  if (target !== 'fat' && target !== 'lean' && target !== 'status') {
    console.error('usage: node swap.mjs fat | lean | status');
    process.exit(2);
  }
  if (target === 'status') {
    console.log(`root CLAUDE.md is ${currentMode()} (${lineCount(ACTIVE)} lines)`);
    return;
  }
  const result = setMode(target);
  const verb = result.changed ? 'switched to' : 'already';
  console.log(`root CLAUDE.md ${verb} ${result.mode} (${lineCount(ACTIVE)} lines)`);
  console.log('Run /clear in Claude Code, or restart it, so the new file is read.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
