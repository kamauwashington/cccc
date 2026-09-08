---
name: board
description: Read and write the project message board. Use when asked to post a message, list recent messages, or search the board by keyword, author, or channel.
---

# board

The board lives in `tools/board.mjs`, a Node CLI over a local PGlite database.
There is no service to start and no port to open.

## Learn the tool the way a person would

```
node tools/board.mjs --help
```

That prints every subcommand and every flag in under twenty lines. Read it
first. Do not guess at flags, and do not read the source to find them.

## The three operations

```
node tools/board.mjs post "the deploy is green" --author alice --channel deploys
node tools/board.mjs list --channel deploys
node tools/board.mjs search backup
```

## Output rules

Every subcommand prints a short summary by default. That summary carries the
counts, the channel breakdown, and the newest five rows. For almost every
question, the summary is the answer.

`--json` returns the full payload. On a seeded board that is about 69,000
characters, which is past what the Bash tool keeps. Reach for it only when
something downstream reads the payload, and bound it:

```
node tools/board.mjs list --json --limit 20
node tools/board.mjs list --json > /tmp/board.json && jq '.returned' /tmp/board.json
```

A hook in `.claude/hooks/bash-output-guard.mjs` blocks the unbounded form. If
it fires, rewrite the command instead of working around the hook.

## If the board is empty

```
npm run seed
```
