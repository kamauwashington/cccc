# 04-progressive

Workspace scoped memory. This file and the root `CLAUDE.md` both load at
launch. This one holds the demo mechanics. The root one describes the app.

## Rules for this workspace

- The root `CLAUDE.md` is swapped by `swap.mjs`. Run `/mode-lean` or
  `/mode-fat` (or `npm run lean` / `npm run fat`), then `/clear`, so the new
  file is read. The mode commands only set up a run. `/start` runs the prompt.
- Never edit `CLAUDE.md` or `CLAUDE.fat.md` while measuring a run. Changing
  either one mid comparison makes the numbers meaningless.
- Run `npm run typecheck` and `npm test` to check your work.
- Never edit anything under `.pristine/`. That is the reset snapshot.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one. It is set in `.claude/settings.local.json`.
