// The lesson, made testable. A hook is a shell command with an exit code, so it
// can be run straight from a test with a payload on stdin.

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = path.join(WS, '.claude', 'hooks', 'protect-generated.mjs');

function runHook(filePath: string) {
  const payload = {
    hook_event_name: 'PreToolUse',
    tool_name: 'Edit',
    tool_input: { file_path: path.join(WS, filePath) },
  };
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: WS,
  });
}

describe('protect-generated.mjs', () => {
  it('blocks a write under src/generated/ with exit code 2', () => {
    const res = runHook('src/generated/db-types.ts');
    expect(res.status).toBe(2);
    expect(res.stderr.trim().length).toBeGreaterThan(0);
    expect(res.stderr).toContain('npm run codegen');
  });

  it('lets a normal src/ write through with exit code 0', () => {
    const res = runHook('src/schema.ts');
    expect(res.status).toBe(0);
    expect(res.stderr.trim()).toBe('');
  });

  it('lets a test file write through', () => {
    const res = runHook('tests/handlers.test.ts');
    expect(res.status).toBe(0);
  });

  it('ignores a payload with no file path', () => {
    const res = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'ls' } }),
      encoding: 'utf8',
      cwd: WS,
    });
    expect(res.status).toBe(0);
  });
});
