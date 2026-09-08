#!/usr/bin/env node
// Scans every .md file and every code comment. Fails on em dashes and on a
// short list of banned phrases. Runs in CI and as part of `npm run verify`.
//
// The rules it enforces live in the root CLAUDE.md and in the `concise` skill
// in 03-prompt-craft. All three have to agree with each other.
//
// Suppression, for the places that quote a banned phrase on purpose:
//   <!-- prose-lint-ignore -->        markdown, applies to the next line
//   <!-- prose-lint-ignore-file -->   markdown, applies to the whole file
//   // prose-lint-ignore              source comment, applies to the next line
// Fenced code blocks in markdown are skipped, since they hold sample text.

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, c } from './lib.mjs';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

const BANNED = [
  { pattern: EM_DASH, label: 'em dash', fix: 'Use a period, a comma, or parentheses.' },
  { pattern: EN_DASH, label: 'en dash', fix: 'Use a hyphen or the word "to".' },
  { pattern: /\bit is worth noting\b/i, label: '"it is worth noting"', fix: 'Delete it.' },
  { pattern: /\bit'?s worth noting\b/i, label: '"it\'s worth noting"', fix: 'Delete it.' },
  { pattern: /^\s*importantly[,\s]/im, label: 'filler opener "Importantly"', fix: 'Delete it.' },
  { pattern: /\bit should be noted\b/i, label: '"it should be noted"', fix: 'Delete it.' },
  { pattern: /\bneedless to say\b/i, label: '"needless to say"', fix: 'Delete it.' },
  { pattern: /\bin today'?s world\b/i, label: '"in today\'s world"', fix: 'Delete it.' },
  { pattern: /\bdelve into\b/i, label: '"delve into"', fix: 'Use "look at" or "read".' },
  { pattern: /\bleverage[sd]?\b(?!\s+ratio)/i, label: '"leverage" as a verb', fix: 'Use "use".' },
  { pattern: /\bat the end of the day\b/i, label: '"at the end of the day"', fix: 'Delete it.' },
  {
    pattern: /\bnot (?:just |only |merely |simply )?[a-z][\w' -]{2,40}, but (?:rather |instead )?[a-z]/i,
    label: '"not X, but Y" construction',
    fix: 'Say the thing directly.',
  },
];

const SCAN_EXTENSIONS = new Set(['.md', '.mjs', '.js', '.ts', '.tsx', '.mts']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.tmp', '.pristine', '.solution']);
const IGNORE_LINE = /prose-lint-ignore(?!-file)/;
const IGNORE_FILE = /prose-lint-ignore-file/;

// Pull comment text out of a source file so prose rules apply to comments and
// not to code. Markdown is scanned whole.
function commentLines(text) {
  const out = [];
  const lines = text.split('\n');
  let inBlock = false;
  lines.forEach((line, i) => {
    let content = null;
    if (inBlock) {
      content = line;
      if (line.includes('*/')) inBlock = false;
    } else if (line.includes('/*')) {
      content = line.slice(line.indexOf('/*'));
      if (!line.includes('*/')) inBlock = true;
    } else {
      const m = line.match(/(^|[^:"'`\\])\/\/(.*)$/);
      if (m) content = m[2];
    }
    if (content && content.trim()) out.push({ line: i + 1, text: content });
  });
  return out;
}

// Markdown lines outside fenced code blocks.
function markdownLines(text) {
  const out = [];
  let fenced = false;
  text.split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (!fenced) out.push({ line: i + 1, text: line });
  });
  return out;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, out);
    else if (SCAN_EXTENSIONS.has(path.extname(e.name))) out.push(abs);
  }
  return out;
}

function scan(entries) {
  const found = [];
  let suppressNext = false;
  for (const entry of entries) {
    const body = entry.text;
    if (IGNORE_LINE.test(body)) {
      suppressNext = true;
      continue;
    }
    if (suppressNext) {
      suppressNext = false;
      continue;
    }
    for (const rule of BANNED) {
      const matched =
        typeof rule.pattern === 'string' ? body.includes(rule.pattern) : rule.pattern.test(body);
      if (matched) {
        found.push({ line: entry.line, label: rule.label, fix: rule.fix, body: body.trim() });
      }
    }
  }
  return found;
}

function main() {
  const files = walk(REPO_ROOT);
  const failures = [];
  const selfPath = path.join('scripts', 'lint-prose.mjs');

  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file);
    if (rel === selfPath) continue; // this file holds the banned phrases as data

    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (IGNORE_FILE.test(text.slice(0, 500))) continue;

    const entries = path.extname(file) === '.md' ? markdownLines(text) : commentLines(text);
    for (const f of scan(entries)) failures.push({ rel, ...f });
  }

  if (failures.length === 0) {
    console.log(c.green(c.bold('prose ok')) + ': ' + files.length + ' files scanned');
    return;
  }

  for (const f of failures) {
    console.log(
      '  ' +
        c.red('fail') +
        '  ' +
        f.rel +
        ':' +
        f.line +
        '  ' +
        f.label +
        '\n        ' +
        c.dim(f.body.slice(0, 100)) +
        '\n        ' +
        c.dim(f.fix)
    );
  }
  console.log(
    c.red(c.bold('prose failed')) +
      ': ' +
      failures.length +
      ' problems in ' +
      files.length +
      ' files'
  );
  process.exit(1);
}

main();
