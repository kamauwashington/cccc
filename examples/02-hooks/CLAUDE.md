# 02-hooks

A tiny message schema with a code generator in front of it.

## Rules for this workspace

- `src/schema.ts` is the source of truth. Everything under `src/generated/` is
  written by `npm run codegen`.
- Never hand edit anything in `src/generated/`. Edit `src/schema.ts` and run
  `npm run codegen`.
- Run `npm run typecheck` and `npm test` to check your work.
- Never edit anything under `.pristine/`. That is the reset snapshot.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one. It is set in `.claude/settings.local.json`.
