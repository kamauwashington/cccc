// The forcing function.
//
// These tests say one thing. The default output of every subcommand stays
// small, and the full payload stays behind a flag. They keep the tool honest
// as it grows, which is the only way output discipline survives contact with
// a second contributor.

import { beforeAll, describe, expect, it } from 'vitest';
import { board, lines, looksLikeJson, MAX_DEFAULT_LINES, MAX_HELP_LINES, type Run } from './board-cli.js';

const SUBCOMMANDS: Array<{ name: string; args: string[] }> = [
  { name: 'list', args: ['list'] },
  { name: 'search', args: ['search', 'backup'] },
  { name: 'post', args: ['post', 'a message from the test suite'] },
];

const defaults = new Map<string, Run>();

beforeAll(() => {
  for (const cmd of SUBCOMMANDS) defaults.set(cmd.name, board(cmd.args));
}, 120000);

describe('default output', () => {
  for (const cmd of SUBCOMMANDS) {
    it(`${cmd.name} exits clean`, () => {
      const run = defaults.get(cmd.name)!;
      expect(run.stderr).toBe('');
      expect(run.status).toBe(0);
    });

    it(`${cmd.name} prints fewer than ${MAX_DEFAULT_LINES} lines`, () => {
      const run = defaults.get(cmd.name)!;
      expect(lines(run.stdout).length).toBeLessThan(MAX_DEFAULT_LINES);
    });

    it(`${cmd.name} does not print JSON without being asked`, () => {
      const run = defaults.get(cmd.name)!;
      expect(looksLikeJson(run.stdout)).toBe(false);
      expect(run.stdout).not.toContain('"messages"');
      expect(run.stdout).not.toContain('"created_at"');
    });
  }

  it('list summarises instead of dumping every row', () => {
    const run = defaults.get('list')!;
    expect(run.stdout.length).toBeLessThan(1500);
    expect(run.stdout).toMatch(/\d+ messages/);
  });
});

describe('--json is opt in', () => {
  it('list --json returns every row', () => {
    const run = board(['list', '--json']);
    expect(run.status).toBe(0);
    const parsed = JSON.parse(run.stdout);
    expect(Array.isArray(parsed.messages)).toBe(true);
    expect(parsed.messages.length).toBeGreaterThan(300);
    expect(parsed.messages[0]).toHaveProperty('created_at');
  }, 60000);

  it('list --json is more than ten times the default size', () => {
    const short = defaults.get('list')!.stdout.length;
    const full = board(['list', '--json']).stdout.length;
    expect(full).toBeGreaterThan(short * 10);
  }, 60000);

  it('search --json returns every match', () => {
    const run = board(['search', 'backup', '--json']);
    const parsed = JSON.parse(run.stdout);
    expect(parsed.query).toBe('backup');
    expect(parsed.matched).toBe(parsed.messages.length);
    expect(parsed.messages.length).toBeGreaterThan(5);
  }, 60000);

  it('post --json returns the inserted row', () => {
    const run = board(['post', 'json post from the test suite', '--json']);
    const parsed = JSON.parse(run.stdout);
    expect(parsed.posted.body).toBe('json post from the test suite');
    expect(typeof parsed.total).toBe('number');
  }, 60000);

  it('--verbose adds the database path on top of the payload', () => {
    const run = board(['list', '--verbose', '--limit', '5']);
    const parsed = JSON.parse(run.stdout.split('\nelapsed')[0]);
    expect(parsed.database).toContain('test-board');
    expect(parsed.messages.length).toBe(5);
  }, 60000);
});

describe('--help', () => {
  it(`is at most ${MAX_HELP_LINES} lines`, () => {
    const run = board(['--help']);
    expect(run.status).toBe(0);
    expect(run.stdout.split('\n').length).toBeLessThanOrEqual(MAX_HELP_LINES);
  });

  it('names every subcommand and the escape hatch', () => {
    const help = board(['--help']).stdout;
    for (const word of ['post', 'list', 'search', '--json', '--verbose', '--limit']) {
      expect(help).toContain(word);
    }
  });

  it('runs without touching the database', () => {
    const run = board(['--help']);
    expect(run.stdout).not.toContain('messages in all channels');
  });
});
