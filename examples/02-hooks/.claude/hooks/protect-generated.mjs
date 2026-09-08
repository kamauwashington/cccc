#!/usr/bin/env node
// PreToolUse hook on Write and Edit. Runs before the file is touched.
//
// `CLAUDE.md` already asks Claude not to hand edit src/generated/. That
// is context. The model reads it and may still take the shortest path. This
// file is a shell command the harness runs every time, whether or not the model
// agrees.
//
// Exit 2 blocks the call and hands stderr back to the model. Claude reads the
// reason and takes the correct path. Any other exit code lets the write happen.
//
// The rule is one line: block writes under src/generated/, allow everything
// else.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(HERE, '..', '..');
const PROTECTED = 'src/generated';

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin());
  } catch {
    process.exit(0); // cannot parse, do not block
  }

  const target = payload.tool_input && payload.tool_input.file_path;
  if (typeof target !== 'string' || !target.trim()) process.exit(0);

  // file_path arrives absolute, but treat a relative one as workspace relative.
  const rel = path.relative(WS, path.resolve(WS, target)).split(path.sep).join('/');
  if (rel !== PROTECTED && !rel.startsWith(PROTECTED + '/')) process.exit(0);

  process.stderr.write(
    'Blocked. ' + rel + ' is generated code.\n\n' +
      'src/generated/ is written by `npm run codegen` from src/schema.ts. A hand\n' +
      'edit here is overwritten the next time codegen runs.\n\n' +
      'Do this instead:\n' +
      '  1. Edit src/schema.ts.\n' +
      '  2. Run `npm run codegen`.\n\n' +
      'This hook is .claude/hooks/protect-generated.mjs. It runs before the write,\n' +
      'so nothing was changed.\n'
  );
  process.exit(2); // 2 blocks the call and passes this text to the model
}

main();
