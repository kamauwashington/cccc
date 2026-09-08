// The hook is a program, so it gets tested like one. Feed it the JSON payload
// Claude Code would feed it and check the exit code.
//
// Exit 2 blocks the command and hands the message back to the model.
// Exit 0 lets it through.
//
// The false positive cases matter more than the blocking case. A hook that
// fires on safe commands teaches people to turn hooks off.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { WORKSPACE } from './board-cli.js';

const HOOK = path.join(WORKSPACE, '.claude', 'hooks', 'bash-output-guard.mjs');

function guard(command: string): { status: number; stderr: string } {
  const res = spawnSync('node', [HOOK], {
    cwd: WORKSPACE,
    encoding: 'utf8',
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
  });
  return { status: res.status ?? -1, stderr: res.stderr ?? '' };
}

describe('board-dump rule blocks', () => {
  const blocked = [
    'node tools/board.mjs list --json',
    'node tools/board.mjs search backup --json',
    'node ./tools/board.mjs list --verbose',
    'node tools/board.mjs list --channel deploys --json',
  ];

  for (const cmd of blocked) {
    it(cmd, () => {
      const run = guard(cmd);
      expect(run.status).toBe(2);
      expect(run.stderr).toContain('board-dump');
    });
  }
});

describe('board-dump rule lets safe forms through', () => {
  const allowed = [
    'node tools/board.mjs list',
    'node tools/board.mjs search backup',
    'node tools/board.mjs post "hello"',
    'node tools/board.mjs --help',
    'node tools/board.mjs list --json | head -20',
    'node tools/board.mjs list --json --limit 20',
    'node tools/board.mjs list --json --limit=20',
    'node tools/board.mjs list --json > /tmp/board.json',
    'node tools/board.mjs list --json | jq -r ".returned"',
    'node tools/seed.mjs',
  ];

  for (const cmd of allowed) {
    it(cmd, () => {
      expect(guard(cmd).status).toBe(0);
    });
  }
});

describe('the rules that shipped with the template still work', () => {
  it('blocks a bare curl', () => {
    expect(guard('curl https://example.com/api').status).toBe(2);
  });

  it('allows curl with -s and a filter', () => {
    expect(guard("curl -s https://example.com/api | jq -r '.id'").status).toBe(0);
  });

  it('ignores tool calls that are not Bash', () => {
    const res = spawnSync('node', [HOOK], {
      cwd: WORKSPACE,
      encoding: 'utf8',
      input: JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'x' } }),
    });
    expect(res.status).toBe(0);
  });
});
