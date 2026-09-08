# 03-prompt-craft

Two skills that work on the conversation instead of on files, plus the plain
code that checks what they produce.

## Rules for this workspace

- A request that arrives rough, vague, or buried in words goes through the
  `sharpen` skill first. Do not start the work it describes. Turn it into the
  five section block, then stop.
- The `/before` command is the one exception. It suspends the rule above on
  purpose so the room can see what the workspace looks like with the skill off.
  Follow that command as written.
- Run the `concise` skill on the block before you hand it back. The block is an
  answer that ships, so the writing rules apply to it.
- Save the block to `OUTPUT.md` at the workspace root. That file is what
  `tests/output.test.ts` reads.
- Run `npm run typecheck` and `npm test` to check your work.
- `OUTPUT.md` is the only file this example asks you to change. Leave `src/`
  alone. The checkers already pass their own tests.
- The tests and the fixtures are the spec. Do not edit either one to make a
  test pass.
- The banned phrase list in `src/concise-check.ts` has to match the one in
  `scripts/lint-prose.mjs` at the repository root. Same patterns, same labels,
  same fixes, same order.
- Never edit anything under `.pristine/`. That is the reset snapshot.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one. It is set in `.claude/settings.local.json`.
