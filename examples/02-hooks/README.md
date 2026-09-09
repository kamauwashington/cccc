# 02-hooks

A hook is a shell command the harness runs. `CLAUDE.md` is context the model may
follow. Same rule, two very different guarantees.

## What you will see

The same prompt runs three times. First the rule lives in `CLAUDE.md` and Claude
walks straight past it, then a hook blocks the write, then a second hook hands a
compiler error back and Claude fixes its own work.

## How it works

`.claude/settings.json` wires four hooks. Claude Code reads that file when it
launches, so a change there needs a restart.

| Hook | Event | File |
| --- | --- | --- |
| Keep noisy output out of context | `PreToolUse` on `Bash` | `.claude/hooks/bash-output-guard.mjs` |
| Guard the generated file | `PreToolUse` on `Write\|Edit` | `.claude/hooks/protect-generated.mjs` |
| Typecheck after a change | `PostToolUse` on `Write\|Edit\|Bash` | `.claude/hooks/typecheck-after-edit.mjs` |
| Verify and report | `Stop` | `.claude/hooks/complete.mjs` |

Each hook is a plain Node script. The payload arrives as JSON on stdin. Exit 2
is the one that matters: it blocks the call and sends stderr back to the model.
Every other exit code lets the call through.

The code under test is small. `src/schema.ts` is hand written and
`src/generated/db-types.ts` is written from it by `npm run codegen`.
`src/handlers.ts` switches over both the status union and the column union, and
both switches end in `assertNever`.

## Four hooks, three moments

**Before a shell command runs (`bash-output-guard.mjs`).** A bouncer for noisy
commands. It reads the command Claude is about to run and rejects it if the
output would flood the conversation: `curl` with no `-s` or `-o`, `cat` on a
file over 200 lines, a test run with no reporter flag, `npm install`. It does
not just say no, it hands back a rewrite to use instead. The command never runs,
so the noise never happens.

The rules stay conservative on purpose. The test rule reads `package.json`
first, and every workspace here already sets `"test": "vitest run
--reporter=dot"`, so a bare `npm test` goes through. A hook that fires on safe
commands trains people to turn hooks off.

Worth knowing: the terminal folding long output behind `ctrl+o to
expand` is only the display. The whole thing already went into context, and it
is stored in the session file, so one noisy command is paid again every time the
session continues.

**Before a file is written (`protect-generated.mjs`).** One rule: block any
write under `src/generated/`. `CLAUDE.md` already asks for this, but that is a
request the model reads and weighs. This is a shell command the harness runs
either way. The rejection names the correct path: edit `src/schema.ts`, run
`npm run codegen`. Rules persuade, hooks enforce. That is the example.

**Right after an edit or a codegen run (`typecheck-after-edit.mjs`).** Runs
`tsc --noEmit` and hands the compiler error straight back. This one is feedback,
not a block, because the edit already happened, and it means a broken edit gets
fixed inside the same turn instead of ten steps later. It stays cheap by doing
nothing most of the time: only `.ts` files under `src/` or `tests/`, plus any
Bash command containing `codegen`, which rewrites `src/generated/` without ever
calling `Write` or `Edit`.

**When the turn ends (`complete.mjs`).** The scorekeeper. Runs the `verify`
command from `reset.json`, counts files that differ from the `.pristine/`
snapshot, writes `RESULT.md`, prints one line, rings the bell. Three details
carry it: it always exits 0, because a non zero exit on `Stop` can block or loop
the model; it debounces on a size and mtime fingerprint, so a chatty session
does not run the suite six times; and it strips ANSI before reading the score,
because vitest still emits colour with `FORCE_COLOR=0`.

Two hooks prevent, one corrects, one reports. Exit 2 is the whole API for the
first three.

## The prompt

```
Add a status field to Message.
```

## What to watch for

Run the prompt three times, resetting between runs.

1. **Ask nicely.** Hooks off:
   `claude --settings '{"disableAllHooks": true}'`
   `CLAUDE.md` says never hand edit `src/generated/`. Claude edits it
   anyway, because that is the shortest path. The rule fails.
2. **Block.** Hooks on: `claude`. The `PreToolUse` hook exits 2 the moment
   Claude reaches for `src/generated/db-types.ts`. Watch the red line. Claude
   reads the reason, edits `src/schema.ts`, and runs `npm run codegen`. Nobody
   told it twice.
3. **Correct.** Right after codegen, the `PostToolUse` hook runs `tsc --noEmit`
   and feeds back one line:
   `src/handlers.ts(38,26): error TS2345: Argument of type '"status"' is not
   assignable to parameter of type 'never'.`
   Claude adds the missing `case 'status'` and moves on. A hook is also a
   feedback loop. That is the underrated half.

## Running it

1. Launch with hooks off, for the first pass only:
   `claude --settings '{"disableAllHooks": true}'`
2. Run `/start`. It resets the workspace, shows the starting state, and runs
   the prompt. Watch Claude edit the generated file anyway.
3. Run `/clear`, quit, and relaunch with plain `claude`.
4. Run `/start` again. The `PreToolUse` hook blocks the write, and the
   `PostToolUse` hook hands back the compiler error. That is passes two and
   three, in one run.
5. Read `RESULT.md`. The Stop hook writes it at the end of every pass.

What can go wrong. Version 2.1.263 has no flag for turning hooks off. Avoid
`--safe-mode`, which also drops `CLAUDE.md`, and the first pass needs that rule
loaded. Setting `"disableAllHooks": true` in `.claude/settings.local.json`
works too, and needs a restart. If Claude skips the generated file in the first
pass and does the right thing on its own, that is the honest result. The other
two passes still land.

Fallback. `npm run solution -- 02`.

## Try next

- Change the `PreToolUse` hook to exit 1 instead of 2. Claude never sees the
  message and the write goes through. Exit codes are the whole API.
- Add a `PreToolUse` hook on `Bash` that blocks `git commit` unless the tests
  passed in the last minute.
- Point `typecheck-after-edit.mjs` at `npm test` instead of `tsc`. Time it, then
  decide whether you want that on every edit.
