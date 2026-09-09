# 07-commands

This workspace demos slash commands. The files under `.claude/commands/` are the
whole lesson.

## Rules for this workspace

- `data/issues.json` is the backlog for a fictional order processing service.
  Read it with `node tools/issues.mjs`. Never open the JSON directly, because
  50 issues of it lands in the context window and none of it is readable.
- `node tools/issues.mjs` with no argument prints its own usage.
- Nobody works these issues. This example is about picking, so stop once the
  issues are picked. Write no code and change no files.
- Run `npm run typecheck` and `npm test` to check your work.
- Never edit anything under `.pristine/`. That is the reset snapshot.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one. It is set in `.claude/settings.local.json`.
