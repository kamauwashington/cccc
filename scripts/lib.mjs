// Shared helpers for the repository scripts. The workspaces deliberately share
// nothing. These scripts are repository tooling, so they may share.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');
export const TEMPLATE_DIR = path.join(REPO_ROOT, 'template');
export const HOME = os.homedir();

export const CLAUDE_CODE_MIN_VERSION = '2.1.0';
export const CLAUDE_CODE_TESTED_VERSION = '2.1.263';

export const c = {
  red: (s) => '\u001b[31m' + s + '\u001b[0m',
  green: (s) => '\u001b[32m' + s + '\u001b[0m',
  yellow: (s) => '\u001b[33m' + s + '\u001b[0m',
  blue: (s) => '\u001b[34m' + s + '\u001b[0m',
  dim: (s) => '\u001b[2m' + s + '\u001b[0m',
  bold: (s) => '\u001b[1m' + s + '\u001b[0m',
};

export function listWorkspaces() {
  if (!fs.existsSync(EXAMPLES_DIR)) return [];
  return fs
    .readdirSync(EXAMPLES_DIR)
    .filter((n) => /^\d\d-/.test(n))
    .filter((n) => fs.statSync(path.join(EXAMPLES_DIR, n)).isDirectory())
    .sort()
    .map((name) => ({ name, dir: path.join(EXAMPLES_DIR, name) }));
}

// Accepts "02", "2", "02-hooks", or "hooks".
export function resolveWorkspace(token) {
  const all = listWorkspaces();
  if (!token) return null;
  const t = String(token).trim();
  const padded = /^\d+$/.test(t) ? t.padStart(2, '0') : null;
  return (
    all.find((w) => w.name === t) ||
    (padded && all.find((w) => w.name.startsWith(padded + '-'))) ||
    all.find((w) => w.name.slice(3) === t) ||
    all.find((w) => w.name.includes(t)) ||
    null
  );
}

export function readJson(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(p, value) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

export function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

export function copyRecursive(from, to) {
  const st = fs.statSync(from);
  if (st.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from)) {
      copyRecursive(path.join(from, entry), path.join(to, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

// Minimal glob. Supports ** and * inside a path pattern. Returns absolute paths.
export function expandGlob(root, pattern) {
  if (!pattern.includes('*')) {
    const abs = path.join(root, pattern);
    return fs.existsSync(abs) ? [abs] : [];
  }
  const rx = new RegExp(
    '^' +
      pattern
        .split('/')
        .map((seg) =>
          seg === '**'
            ? '(?:.+)?'
            : seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')
        )
        .join('/')
        .replace(/\(\?:\.\+\)\?\//g, '(?:.+/)?') +
      '$'
  );
  const out = [];
  const walk = (dir, rel) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const nextRel = rel ? rel + '/' + e.name : e.name;
      const abs = path.join(dir, e.name);
      if (rx.test(nextRel)) out.push(abs);
      if (e.isDirectory()) walk(abs, nextRel);
    }
  };
  walk(root, '');
  return out;
}

export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}
