#!/usr/bin/env node
// Swaps Cottonmouth's `description` between vague and sharp, then swaps back.
//
//   npm run sharpen
//
// The description field is the trigger for automatic delegation. Nothing else
// in the file changes. Same agent, same model, same skills, same prompt from
// the presenter. Only this one line moves, and the routing changes with it.
//
// Claude Code reads .claude/agents/ at launch. Run `/agents` after the swap to
// confirm the new text is loaded. Restart the CLI if it is stale.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(WS, '.claude', 'agents', 'cottonmouth.md');

const VAGUE = 'Helps with API stuff.';
const SHARP =
  'Writes OAS 3.1 specs. Use PROACTIVELY when adding or changing endpoints.';

const text = fs.readFileSync(FILE, 'utf8');
const line = text.match(/^description:\s*(.+)$/m);

if (!line) {
  console.error('sharpen: no description line in ' + path.relative(WS, FILE));
  process.exit(1);
}

const current = line[1].trim();
const next = current === SHARP ? VAGUE : SHARP;
const label = next === SHARP ? 'SHARP' : 'VAGUE';

fs.writeFileSync(FILE, text.replace(/^description:\s*.+$/m, 'description: ' + next), 'utf8');

console.log('cottonmouth description is now ' + label);
console.log('  ' + next);
console.log('');
console.log('Run /agents in Claude Code to confirm it reloaded.');
