import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

enum RootMode {
  Lean = 'lean',
  Fat = 'fat',
}

/** Runs the same script `npm run fat` and `npm run lean` run. */
function swap(target: RootMode): void {
  execFileSync(process.execPath, ['swap.mjs', target], { cwd: ROOT, stdio: 'pipe' });
}

function currentMode(): RootMode {
  return fs.existsSync(path.join(ROOT, 'CLAUDE.lean.md')) ? RootMode.Fat : RootMode.Lean;
}

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function lines(rel: string): number {
  return read(rel).split('\n').length;
}

// A three line frontmatter reader. Enough for `key: ["a", "b"]` and `key: text`.
// Bringing in a YAML parser for two files would be more code than this.
function frontmatter(rel: string): Record<string, unknown> {
  const text = read(rel);
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) throw new Error(`${rel} has no frontmatter block`);
  const out: Record<string, unknown> = {};
  for (const line of match[1]!.split('\n')) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const raw = kv[2]!.trim();
    out[kv[1]!] = raw.startsWith('[') ? (JSON.parse(raw) as unknown) : raw;
  }
  return out;
}

const DOMAINS = ['orders', 'payments', 'fulfillment', 'notifications'];

describe('the two root memory files', () => {
  it('keeps the map short enough to pay for on every session', () => {
    expect(lines('CLAUDE.md')).toBeLessThan(40);
  });

  it('keeps the copy long enough to be worth measuring', () => {
    const fat = currentMode() === RootMode.Lean ? 'CLAUDE.fat.md' : 'CLAUDE.md';
    expect(lines(fat)).toBeGreaterThan(300);
  });

  it('starts in lean mode, so a fresh clone measures the map first', () => {
    expect(currentMode()).toBe(RootMode.Lean);
  });

  it('round trips fat then lean back to the same bytes', () => {
    const before = { lean: read('CLAUDE.md'), fat: read('CLAUDE.fat.md') };
    try {
      swap(RootMode.Fat);
      expect(read('CLAUDE.md')).toBe(before.fat);
      expect(read('CLAUDE.lean.md')).toBe(before.lean);
    } finally {
      swap(RootMode.Lean);
    }
    expect(read('CLAUDE.md')).toBe(before.lean);
    expect(read('CLAUDE.fat.md')).toBe(before.fat);
    expect(fs.existsSync(path.join(ROOT, 'CLAUDE.lean.md'))).toBe(false);
  });
});

describe('the subdirectory memory files', () => {
  it.each(DOMAINS)('src/%s has its own CLAUDE.md', (domain) => {
    const rel = path.join('src', domain, 'CLAUDE.md');
    expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
    expect(read(rel).trim().length).toBeGreaterThan(0);
  });

  it('names each domain in the root map, one line each', () => {
    const map = read('CLAUDE.md');
    for (const domain of DOMAINS) expect(map).toContain(`src/${domain}/`);
  });
});

describe('the rules files', () => {
  const RULES = ['.claude/rules/writing.md', 'src/orders/.claude/rules/money.md'];

  it.each(RULES)('%s parses and carries a paths key', (rel) => {
    const meta = frontmatter(rel);
    expect(Array.isArray(meta.paths)).toBe(true);
    expect((meta.paths as string[]).length).toBeGreaterThan(0);
    for (const glob of meta.paths as string[]) expect(typeof glob).toBe('string');
  });

  it('scopes the money rule to files that exist', () => {
    const meta = frontmatter('src/orders/.claude/rules/money.md');
    expect(meta.paths).toContain('src/**/money*.ts');
    expect(fs.existsSync(path.join(ROOT, 'src/orders/money.ts'))).toBe(true);
  });

  it('scopes the writing rule to markdown', () => {
    expect(frontmatter('.claude/rules/writing.md').paths).toContain('**/*.md');
  });
});
