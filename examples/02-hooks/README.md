# 02-hooks

A hook is a shell command the harness runs when something happens. Events fire,
scripts run, and you can see what each one did.

## What you will see

One prompt, one run, hooks on the whole time. A file gets edited and a hook
runs a typecheck and hands the error back. The run ends and a hook writes the
score. Then one follow up asks for a hand edit to generated code, and a hook
refuses it before the file is touched.

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
both switches end in `assertNever`. Add a field and the compile breaks until a
case is added.

## The four hooks

**Before a shell command runs (`bash-output-guard.mjs`).** A bouncer for noisy
commands. It reads the command Claude is about to run and rejects it if the
output would flood the conversation: `curl` with no `-s` or `-o`, `cat` on a
file over 200 lines, a test run with no reporter flag, `npm install`. It does
not just say no, it hands back a rewrite to use instead. The command never runs,
so the noise never happens.

The rules stay conservative on purpose. The test rule reads `package.json`
first, and every workspace here already sets `"test": "vitest run
--reporter=dot"`, so a bare `npm test` goes through. Expect this hook to stay
quiet for a whole run. That is the design. A hook that fires on safe commands
trains people to turn hooks off.

Worth knowing: the terminal folding long output behind `ctrl+o to
expand` is only the display. The whole thing already went into context, and it
is stored in the session file, so one noisy command is paid again every time the
session continues.

**Before a file is written (`protect-generated.mjs`).** One rule: block any
write under `src/generated/`. `CLAUDE.md` already asks for this, and that is a
request the model reads and weighs. This is a shell command the harness runs
either way. The rejection names the correct path: edit `src/schema.ts`, run
`npm run codegen`. Rules persuade, hooks enforce.

**Right after an edit or a codegen run (`typecheck-after-edit.mjs`).** Runs
`tsc --noEmit` and hands the compiler error straight back. This one is feedback
rather than a block, because the edit already happened, and it means a broken
edit gets fixed inside the same turn instead of ten steps later. It stays cheap
by doing nothing most of the time: only `.ts` files under `src/` or `tests/`,
plus any Bash command containing `codegen`, which rewrites `src/generated/`
without ever calling `Write` or `Edit`.

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

Nobody types a hook command. Every one of these ran because an event fired.

1. **A tool call finished, so a typecheck ran.** Claude edits `src/schema.ts`
   and runs `npm run codegen`. `PostToolUse` fires on both and hands back one
   line:
   `src/handlers.ts(38,26): error TS2345: Argument of type '"status"' is not
   assignable to parameter of type 'never'.`
   Claude adds the missing `case 'status'` and moves on. A hook is a feedback
   loop. That is the underrated half.
2. **The turn ended, so the suite ran.** The `Stop` hook verifies, counts what
   changed against `.pristine/`, and writes `RESULT.md`. Open it. Nothing in the
   conversation asked for that file.
3. **A write was attempted, so it was refused.** Run `/followup-1`, which asks
   for a column straight in `src/generated/db-types.ts`. The `PreToolUse` hook
   exits 2 before the file is touched. Watch the red line. Claude reads the
   reason, goes to `src/schema.ts`, and runs `npm run codegen` instead. Nobody
   told it twice.
4. **The quiet one.** `bash-output-guard.mjs` most likely never fired. It is
   wired to the same `PreToolUse` event as the block, and every command in the
   run was already bounded. A hook that stays silent when nothing is wrong is
   working.

## Running it

1. Launch with `claude`. Hooks stay on the whole time.
2. Run `/start`. It resets the workspace, shows the starting state, and runs the
   prompt. Watch the compiler error come back after codegen.
3. Run `/followup-1` in the same session. Watch the write get blocked.
4. Read `RESULT.md`. The `Stop` hook writes it at the end of every turn.

What can go wrong. Settings are read at launch, so an edit to
`.claude/settings.json` or to any hook script needs a restart. If Claude reaches
for `src/generated/` during step 2 on its own, the block fires early and step 3
just confirms it.

Fallback. `npm run solution -- 02`.

## Try next

- Change the `PreToolUse` hook to exit 1 instead of 2. Claude never sees the
  message and the write goes through. Exit codes are the whole API.
- Ask Claude to fetch a URL with `curl` and no flags. That wakes the quiet
  hook up.
- Add a `PreToolUse` hook on `Bash` that blocks `git commit` unless the tests
  passed in the last minute.
- Point `typecheck-after-edit.mjs` at `npm test` instead of `tsc`. Time it, then
  decide whether you want that on every edit.
