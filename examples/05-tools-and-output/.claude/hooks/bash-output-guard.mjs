#!/usr/bin/env node
// PreToolUse hook on Bash. Runs before the command does.
//
// The Bash tool captures roughly 30,000 characters of output. Past that it
// keeps the head and the tail and drops the middle. 30,000 characters is about
// 8,000 tokens. Three of those force a compaction.
//
// Two things people miss:
//   1. The terminal folds long output behind a "ctrl+o to expand" line. That is
//      only the display. The whole thing already went into context.
//   2. Tool output is stored in the session file. It gets reloaded every time
//      the session continues, so one noisy command is paid many times.
//
// Exit 2 blocks the call and sends stderr back to the model, so Claude rewrites
// the command itself. Any other exit code lets the command through.
//
// Keep the rule list short and keep false positives near zero. A hook that
// fires on safe commands trains people to turn hooks off.

import fs from 'node:fs';

const CAT_LINE_LIMIT = 200;

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

// A limiter is anything that bounds what comes back.
function hasLimiter(cmd) {
  return /\|\s*(head|tail|jq|wc|grep|rg|sed|awk|cut|sort|uniq|column)\b/.test(cmd) || /(^|\s)>\s*\S/.test(cmd) || /\d>\s*\S/.test(cmd) || /\|\s*&?\s*$/.test(cmd);
}

// Split on separators so each piece is judged on its own.
function segments(cmd) {
  return cmd
    .split(/&&|\|\||;|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function countLines(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').length;
  } catch {
    return 0;
  }
}

// A package.json script can already bound its own output. Every workspace here
// defines "test": "vitest run --reporter=dot", so blocking a bare `npm test`
// would be a false positive. Check the script before firing.
function scriptIsAlreadyQuiet(name) {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const script = pkg.scripts && pkg.scripts[name];
    if (!script) return false;
    return /--reporter[= ]|--silent\b|>\s*\/dev\/null/.test(script);
  } catch {
    return false;
  }
}

const RULES = [
  {
    name: 'curl',
    test: (s) =>
      /(^|\s)curl(\s|$)/.test(s) &&
      !/\s-[a-zA-Z]*s/.test(s) &&
      !/\s--silent\b/.test(s) &&
      !/\s-[a-zA-Z]*o(\s|$)/.test(s) &&
      !/\s--output\b/.test(s) &&
      !hasLimiter(s),
    message:
      'curl with no -s and no -o. The progress meter and the whole body land in context.\n' +
      'Rewrite as one of:\n' +
      '  curl -s URL | jq -r \'.field\'\n' +
      '  curl -s -o /tmp/out.json URL && jq \'.summary\' /tmp/out.json',
  },
  {
    name: 'cat',
    test: (s) => {
      const m = s.match(/^cat\s+(?!-)([^\s|>]+)\s*$/);
      if (!m) return false;
      return countLines(m[1]) > CAT_LINE_LIMIT;
    },
    message:
      'cat on a file longer than ' + CAT_LINE_LIMIT + ' lines. The whole file goes into context.\n' +
      'Rewrite as one of:\n' +
      '  sed -n \'1,80p\' FILE\n' +
      '  grep -n \'pattern\' FILE | head -20\n' +
      'Or use the Read tool, which pages.',
  },
  {
    name: 'test-runner',
    test: (s) =>
      /(^|\s)(npm|pnpm|yarn)\s+(run\s+)?test\b/.test(s) &&
      !/--reporter[= ]/.test(s) &&
      !/--silent\b/.test(s) &&
      !scriptIsAlreadyQuiet('test') &&
      !hasLimiter(s),
    message:
      'A test run with no reporter flag prints every passing test name.\n' +
      'Rewrite as one of:\n' +
      '  npm test -- --reporter=dot\n' +
      '  npm test > /dev/null 2>&1 && echo PASS || echo FAIL\n' +
      'Use the second form when the exit code is all you need.',
  },
  {
    // Added for this workspace. `node tools/board.mjs list --json` prints about
    // 69,000 characters. The Bash tool keeps 30,000 of that, so the middle is
    // dropped and the context bill is paid anyway. The default form of the same
    // command is under 800 characters and answers the same question.
    //
    // The rule stays narrow on purpose. It fires only on this repository's own
    // tool, only on the two dumping subcommands, and only when nothing bounds
    // the result. A `--limit`, a pipe, or a redirect all pass.
    name: 'board-dump',
    test: (s) =>
      /(^|\s)node\s+(\.\/)?tools\/board\.mjs\s+(list|search)\b/.test(s) &&
      /--(json|verbose)\b/.test(s) &&
      !/--limit[=\s]+\d+/.test(s) &&
      !hasLimiter(s),
    message:
      'board --json with no limiter returns every row. That is about 69,000 characters,\n' +
      'roughly 17,000 tokens, and the Bash tool will drop the middle of it.\n' +
      'Rewrite as one of:\n' +
      '  node tools/board.mjs list\n' +
      '  node tools/board.mjs list --json --limit 20\n' +
      '  node tools/board.mjs list --json > /tmp/board.json && jq \'.returned\' /tmp/board.json\n' +
      'The default summary already carries the counts, the channels, and the newest five.',
  },
  {
    name: 'noisy-install',
    test: (s) => /(^|\s)(npm|pnpm|yarn)\s+(ci|install|i)\b/.test(s) && !hasLimiter(s),
    message:
      'A package install prints hundreds of lines and none of them matter.\n' +
      'Rewrite as:\n' +
      '  npm ci > /tmp/install.log 2>&1 && echo INSTALL_OK || tail -20 /tmp/install.log',
  },
];

function main() {
  const raw = readStdin();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0); // cannot parse, do not block
  }

  if (payload.tool_name !== 'Bash') process.exit(0);
  const cmd = payload.tool_input && payload.tool_input.command;
  if (typeof cmd !== 'string' || !cmd.trim()) process.exit(0);

  for (const seg of segments(cmd)) {
    for (const rule of RULES) {
      let hit = false;
      try {
        hit = rule.test(seg);
      } catch {
        hit = false;
      }
      if (hit) {
        process.stderr.write(
          'Blocked by the output discipline hook (rule: ' + rule.name + ').\n\n' +
            rule.message +
            '\n\nThis hook is in .claude/hooks/bash-output-guard.mjs. It runs before the\n' +
            'command, so the output never reaches the context window.\n'
        );
        process.exit(2); // 2 blocks the call and passes this text to the model
      }
    }
  }

  process.exit(0);
}

main();
