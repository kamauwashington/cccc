# 07-commands

This workspace demos slash commands. The files under `.claude/commands/` are the
whole lesson.

## Rules for this workspace

- Run `npm run typecheck` and `npm test` to check your work.
- `CHANGELOG.md` is written by `/ship`. Do not hand write it outside that command.
- `src/changelog/render.ts` exists for the repeatability test. `/ship` must not
  call it. `/ship` writes the file from the commit list the command injects.
- `fixtures/history.txt` stands in for `git log --oneline v1.3.0..HEAD`. These
  examples ship without their own git repository, so the history comes from a
  file.
- Never edit anything under `.pristine/`. That is the reset snapshot.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one. It is set in `.claude/settings.local.json`.
