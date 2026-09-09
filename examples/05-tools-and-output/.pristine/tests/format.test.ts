// Backstop for the output contract. Not part of the demo.
//
// The README quotes 320 messages and 6 channels, and it shows a headline, a
// blank line, then indented rows. These tests hold the tool to both.

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parseBoardOutput, showingCount } from '../src/format';

const WS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = path.join(WS, 'tools', 'board.mjs');

function board(...args: string[]): string {
  return execFileSync('node', [TOOL, ...args], { cwd: WS, encoding: 'utf8' });
}

describe('board tool output', () => {
  it('stats reports the counts the README quotes', () => {
    const { headline, rows } = parseBoardOutput(board('stats'));
    expect(headline).toContain('320 messages');
    expect(headline).toContain('6 channels');
    expect(rows).toHaveLength(6);
  });

  it('list uses the headline, blank line, rows shape', () => {
    const { headline, rows } = parseBoardOutput(board('list', '--limit', '3'));
    expect(showingCount(headline)).toEqual({ shown: 3, total: 320 });
    expect(rows).toHaveLength(3);
    for (const r of rows) expect(r.startsWith('  #')).toBe(true);
  });

  it('list filters by channel and says so in the headline', () => {
    const { headline, rows } = parseBoardOutput(board('list', '--channel', 'deploys', '--limit', '3'));
    expect(headline).toContain('channel=deploys');
    expect(showingCount(headline).total).toBe(59);
    for (const r of rows) expect(r).toContain('deploys');
  });

  it('search reports how many matched, not just what it shows', () => {
    const { headline, rows } = parseBoardOutput(board('search', 'backup', '--limit', '2'));
    const { shown, total } = showingCount(headline);
    expect(shown).toBe(2);
    expect(total).toBeGreaterThan(shown);
    expect(rows).toHaveLength(2);
  });

  it('search says so plainly when nothing matches', () => {
    const { headline, rows } = parseBoardOutput(board('search', 'zzzznotathing'));
    expect(showingCount(headline)).toEqual({ shown: 0, total: 0 });
    expect(rows).toEqual(['  no matches']);
  });

  it('stays small, so a call costs little', () => {
    expect(board('stats').length).toBeLessThan(400);
    expect(board('list', '--limit', '5').length).toBeLessThan(700);
  });
});

const PEOPLE = path.join(WS, 'tools', 'people.mjs');
const ACTIVITY = path.join(WS, 'tools', 'activity.mjs');

function people(...args: string[]): string {
  return execFileSync('node', [PEOPLE, ...args], { cwd: WS, encoding: 'utf8' });
}

function activity(...args: string[]): string {
  return execFileSync('node', [ACTIVITY, ...args], { cwd: WS, encoding: 'utf8' });
}

describe('people tool output', () => {
  it('top keeps the headline, blank line, rows shape', () => {
    const { headline, rows } = parseBoardOutput(people('top', '--limit', '3'));
    expect(headline).toContain('320 messages');
    expect(showingCount(headline)).toEqual({ shown: 3, total: 8 });
    expect(rows).toHaveLength(3);
  });

  it('top ranks busiest first', () => {
    const { rows } = parseBoardOutput(people('top'));
    const counts = rows.map((r) => Number(r.trim().split(/\s+/)[1]));
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('top scopes to a channel and totals only that channel', () => {
    const { headline, rows } = parseBoardOutput(people('top', '--channel', 'incidents', '--limit', '3'));
    expect(headline).toContain('channel=incidents');
    expect(headline).toContain('57 messages');
    for (const r of rows) expect(r).toContain('incidents');
  });

  it('who breaks one author out by channel', () => {
    const { headline, rows } = parseBoardOutput(people('who', 'chen'));
    expect(headline).toContain('author=chen');
    expect(showingCount(headline).shown).toBe(rows.length);
  });

  it('who says so plainly when the author is unknown', () => {
    const { headline, rows } = parseBoardOutput(people('who', 'zzzznotaperson'));
    expect(showingCount(headline)).toEqual({ shown: 0, total: 0 });
    expect(rows).toEqual(['  no matches']);
  });
});

describe('activity tool output', () => {
  it('weeks keeps the headline, blank line, rows shape', () => {
    const { headline, rows } = parseBoardOutput(activity('weeks'));
    expect(headline).toContain('by=week');
    expect(headline).toContain('320 messages');
    expect(showingCount(headline).shown).toBe(rows.length);
  });

  it('buckets run newest first', () => {
    const { rows } = parseBoardOutput(activity('days', '--limit', '5'));
    const keys = rows.map((r) => r.trim().split(/\s+/)[0]);
    expect(keys).toEqual([...keys].sort().reverse());
  });

  it('marks a bucket that runs past the edge of the data', () => {
    const { rows } = parseBoardOutput(activity('weeks'));
    expect(rows.filter((r) => r.endsWith('partial'))).toHaveLength(2);
  });

  it('never marks a whole day partial', () => {
    const { rows } = parseBoardOutput(activity('days', '--limit', '22'));
    expect(rows.some((r) => r.endsWith('partial'))).toBe(false);
  });

  it('leaves no trailing whitespace on a row', () => {
    for (const r of parseBoardOutput(activity('days', '--limit', '5')).rows) {
      expect(r).toBe(r.replace(/\s+$/, ''));
    }
  });

  it('stays small, so a call costs little', () => {
    expect(people('top').length).toBeLessThan(500);
    expect(activity('weeks').length).toBeLessThan(500);
  });
});
