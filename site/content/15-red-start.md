---
title: Red is the starting state
section: Repo staples
order: 6
summary: A fresh clone fails npm test. That is the design. Every example ships broken so there is something for one prompt to fix, and something a test can check when it is fixed.
facts:
  Root `npm test` | red on a fresh clone, by design
  CI gates on | `scripts/check-solutions.mjs`
  Green in one command | `npm run solution`
  Back to red | `npm run reset`
docs:
  Common workflows | common-workflows
  Costs | costs
tabs:
  The claim | The claim | The eight do not start red the same way
  How it is checked | Why CI cannot just run the tests | The forcing functions are real code
  What breaks | What breaks
---

## The claim

An example that starts green has nothing to demonstrate. The lesson in every
folder is that a configured Claude Code session closes a gap a plain one would
not. So the gap has to exist on disk before the run, and a test has to be able
to say when it closed.

## The eight do not start red the same way

| Red on | Examples |
| --- | --- |
| Typecheck | 01, 04, 06 |
| Tests only | 03, 05, 07, 08 |
| Nothing. Starts green. | 02 |

Example 02 is the exception on purpose. Its demo is about hooks firing rather
than about fixing code, so the workspace ships working and the beats are about
what the harness does when the model reaches for the wrong file.

`/start` inside a workspace shows the first red signal before it runs the
prompt. It shells out to `scripts/start.mjs`, which always exits 0, because a
non zero exit makes npm print seven lines of its own error block over the
output.

## Why CI cannot just run the tests

Root `npm test` is red by design, so it is useless as a gate. CI runs
`scripts/check-solutions.mjs` instead. That applies each
[.solution/](#/solution), verifies the workspace, then resets it. A red
starting state and a proven fix, checked on every push.

## The forcing functions are real code

The red state is never a hand written failure message. Each example uses a
mechanism that cannot be argued with.

- `erasableSyntaxOnly` in `tsconfig.json` makes the TypeScript `enum` keyword a
  compile error, so example 01 cannot be answered with an enum.
- `expectTypeOf` assertions that only hold for a union type, checked by
  `tsc --noEmit` rather than at runtime.
- A PGlite test that runs `CREATE TYPE ... AS ENUM`, reads the `pg_enum`
  catalog, and diffs the labels against the TypeScript values array.
- A test that reads `scripts/lint-prose.mjs` and fails when the banned phrase
  list in example 03 drifts away from it.
- A test that renders the same changelog twenty times and asserts the bytes
  never move.

## What breaks

- **Reading a red test run as a broken clone.** It is the expected result. Say
  so in the README, which this repository does, and say it on stage.
- **Fixing the red state by editing the test.** Caught by
  `check-solutions.mjs`, which re-diffs `tests/` against the snapshot after a
  solution runs.
- **A model as a judge instead of a checker.** A judge scores the same draft
  differently on two runs, and a rule you cannot reproduce is not a rule.
  Example 03 uses plain functions over a string for exactly this reason.
