// CI backstop. It stays off screen during the demo.
//
// Two claims the README makes, held to code:
//   1. The backlog is 50 issues split 21 quick, 18 mid, 11 complex.
//   2. Every grab view prints the same bytes on every run.
//
// The second one is the reason to write a command instead of asking. If this
// suite ever goes red on the repeatability test, the example has lost its
// point.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { NEXT_MIX, type Issue } from '../src/issue';

const WS = path.resolve(__dirname, '..');
const DATA = path.join(WS, 'data', 'issues.json');

function issues(): Issue[] {
  return JSON.parse(fs.readFileSync(DATA, 'utf8')) as Issue[];
}

function run(...args: string[]): string {
  return execFileSync('node', ['tools/issues.mjs', ...args], { cwd: WS, encoding: 'utf8' });
}

function bodyRows(out: string): string[] {
  return out.split('\n').slice(2).filter((line) => line.trim().length > 0);
}

describe('the backlog', () => {
  it('holds 50 open issues', () => {
    const all = issues();
    expect(all).toHaveLength(50);
    expect(all.every((i) => i.state === 'open')).toBe(true);
  });

  it('splits 21 quick, 18 mid, 11 complex', () => {
    const all = issues();
    const count = (tier: string) => all.filter((i) => i.tier === tier).length;
    expect(count('quick')).toBe(21);
    expect(count('mid')).toBe(18);
    expect(count('complex')).toBe(11);
  });

  it('gives every issue a unique number', () => {
    const numbers = issues().map((i) => i.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});

describe('the output shape', () => {
  it('prints a headline, a blank line, then rows', () => {
    for (const view of [['summary'], ['next'], ['complex'], ['up-for-grabs']]) {
      const lines = run(...view).split('\n');
      expect(lines[0]!.length).toBeGreaterThan(0);
      expect(lines[1]).toBe('');
      expect(lines[2]!.startsWith('  ')).toBe(true);
    }
  });
});

describe('grab next', () => {
  it('returns three quick, two mid, and one complex', () => {
    const rows = bodyRows(run('next'));
    expect(rows).toHaveLength(6);
    for (const [tier, n] of NEXT_MIX) {
      expect(rows.filter((r) => r.includes(' ' + tier + ' '))).toHaveLength(n);
    }
  });

  it('returns the same bytes twenty times running', () => {
    const first = run('next');
    for (let i = 0; i < 19; i++) expect(run('next')).toBe(first);
  });
});

describe('grab complex', () => {
  it('offers exactly three choices, all complex', () => {
    const rows = bodyRows(run('complex'));
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.includes('complex'))).toBe(true);
  });
});

describe('grab up-for-grabs', () => {
  it('returns only issues labelled up-for-grabs', () => {
    const rows = bodyRows(run('up-for-grabs'));
    expect(rows).toHaveLength(11);
    expect(rows.every((r) => r.includes('up-for-grabs'))).toBe(true);
  });

  it('filters on the area argument', () => {
    const rows = bodyRows(run('up-for-grabs', 'payments'));
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.includes('payments'))).toBe(true);
  });

  it('treats an unfilled argument as no filter', () => {
    expect(run('up-for-grabs', '$1')).toBe(run('up-for-grabs'));
  });
});
