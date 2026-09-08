#!/usr/bin/env node
// PreToolUse hook attached to Sidewinder in its own frontmatter, and to no
// other agent. Blocks any write whose target is not REVIEW.md.
//
// Sidewinder already has no Edit tool. This hook covers the one writing tool it
// does have, so the reviewer cannot quietly fix what it was asked to review.
//
// Exit 2 blocks the call and hands the message back to the model.

import fs from 'node:fs';
import path from 'node:path';

let payload;
try {
  payload = JSON.parse(fs.readFileSync(0, 'utf8'));
} catch {
  process.exit(0); // cannot parse, do not block
}

const target = payload && payload.tool_input && payload.tool_input.file_path;
if (typeof target !== 'string' || path.basename(target) === 'REVIEW.md') {
  process.exit(0);
}

process.stderr.write(
  'Blocked. Sidewinder writes REVIEW.md and nothing else.\n' +
    'Attempted target: ' +
    target +
    '\n\n' +
    'Report the problem as a bullet in REVIEW.md. Another agent owns that file.\n' +
    'This rule lives in .claude/hooks/review-only.mjs, wired from the hooks block\n' +
    'in .claude/agents/sidewinder.md.\n'
);
process.exit(2);
