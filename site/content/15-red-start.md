---
title: Red is the starting state
section: Repo staples
order: 6
summary: A fresh clone fails npm test. That is the design. The examples about fixing code ship broken, so there is something for one prompt to fix and something a test can check when it is fixed. The ones about how the harness behaves ship working.
facts:
  Root `npm test` | red on a fresh clone, by design
  CI gates on | `scripts/check-solutions.mjs`
  Green in one command | `npm run solution`
  Back to red | `npm run reset`
docs:
  Common workflows | common-workflows
  Costs | costs
tabs:
  The claim | The claim | They do not all start red the same way
  How it is checked | Why CI cannot just run the tests | The forcing functions are real code
  What breaks | What breaks
---

## The claim

An example about fixing code has nothing to demonstrate if it starts green. The
gap has to exist on disk before the run, and a test has to be able to say when
it closed. That is why a fresh clone fails root `npm test`.

Not every example is about fixing code. Some are about what the harness does,
and those ship working on purpose. Read the split below before you read a green
run as a workspace that already had its prompt run against it.

## They do not all start red the same way

| Starts | Examples | Because |
| --- | --- | --- |
| Red on `tsc --noEmit` | 01, 04, 06 | There is code to write, and the compiler says when it is written |
| Green | 02, 03, 05, 07, 08 | The lesson is what the harness does, not what the code does |

Verified by typechecking each `.pristine/` snapshot rather than the working
tree, because a workspace someone has already run is not the starting state.

The green half is not a softer version of the exercise. Example 02 ships
working so the beats are about hooks firing when the model reaches for the
wrong file. Example 03 ships no test suite at all: its two skills work on the
conversation. Example 05 answers questions about a board nobody is asking you
to fix. Example 07 hands you a backlog and assigns nothing. Example 08 builds
against a suite that is already green, so the only thing that changes between
runs is the shape of the answer.

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
- A test that spawns a hook with a payload on stdin and asserts what it blocks
  and what it lets through, in example 02.
- A test that renders every grab view repeatedly and asserts the bytes never
  move, in example 07. If that one goes red, the command has stopped being
  repeatable, which is the whole reason to write one.

## What breaks

- **Reading a red test run as a broken clone.** It is the expected result. Say
  so in the README, which this repository does, and say it on stage.
- **Fixing the red state by editing the test.** Caught by
  `check-solutions.mjs`, which re-diffs `tests/` against the snapshot after a
  solution runs.
- **Reading a green example as one that already ran.** Five of them ship green
  on purpose. `npm run reset` is still the way to be sure.
