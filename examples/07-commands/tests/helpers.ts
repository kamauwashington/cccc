import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WORKSPACE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HISTORY_FILE = path.join(WORKSPACE, 'fixtures', 'history.txt');
export const CHANGELOG_FILE = path.join(WORKSPACE, 'CHANGELOG.md');

/** The version the demo ships. It is the argument in PROMPT.md. */
export const SHIP_VERSION = '1.4.0';

export function historyText(): string {
  return fs.readFileSync(HISTORY_FILE, 'utf8');
}

export function changelogText(): string | null {
  if (!fs.existsSync(CHANGELOG_FILE)) return null;
  return fs.readFileSync(CHANGELOG_FILE, 'utf8');
}
