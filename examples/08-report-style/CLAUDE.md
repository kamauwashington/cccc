# 08-report-style

An output style that ends every code turn with the same five headings, and a
checker that says whether a report actually followed them.

## The report contract

Done, Works, Doesn't work, Fixed, Suggestions. In that order, and nothing else.

- Drop any heading that has nothing under it. Never write a heading followed
  by "nothing" or "none".
- "Doesn't work" is about limits, scope, and unproven ground. It does not mean
  the build is broken.
- 200 words across all headings.
- No evidence in the body. Test names, stack traces, and line numbers live in
  the commit message.

The full wording is in `.claude/output-styles/report.md`. That file is the
style. This file is context. They say the same thing on purpose, and the test
suite compares them.

## Rules for this workspace

- `src/report-check.ts` is the file the prompt asks you to write.
- Run `npm run typecheck` and `npm test` to check your work.
- `tests/report-check.test.ts` sets the contract. The fixtures in `fixtures/`
  are the examples it checks against.
- Do not edit the tests, the fixtures, or `.claude/output-styles/report.md`.
  The checker has to match the style that ships.
- Never edit anything under `.pristine/`. That is the reset snapshot.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one. It is set in `.claude/settings.local.json`.
