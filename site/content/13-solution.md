---
title: .solution/
section: Repo staples
order: 4
summary: The proven fix for a starting state that ships broken. Every example has one. It is the fallback when a live run stalls, and it is what CI gates on.
facts:
  Lives at | `examples/NN-name/.solution/`
  Applied by | `npm run solution -- 06`
  Applies all | `npm run solution`
  May not contain | `tests/`, `vitest.config.ts`, `tsconfig.json`, `package.json`
  CI gate | `scripts/check-solutions.mjs`
docs:
  Permissions | permissions
  Hooks reference | hooks
tabs:
  Why it exists | Why every red state needs one | A solution has to earn its green
  Using it | As a live fallback | Keeping Claude out of it
  What breaks | What breaks
---

## Why every red state needs one

Every example ships broken, so `npm test` at the repository root is red on a
fresh clone. A red starting state with no proven fix is just a broken
repository. `.solution/` is the proof that the red state is solvable.

```bash
npm run solution          # apply every solution. Everything goes green.
npm test                  # every workspace passes
npm run reset             # back to the broken starting state
```

`npm run check:solutions` does that round trip automatically and is what CI
gates on.

## A solution has to earn its green

The check refuses any solution that ships an edited `tests/`,
`vitest.config.ts`, `tsconfig.json`, or `package.json`. It refuses them up
front, and it re-compares those paths against the snapshot after the run.
Changing a test to make a test pass is caught, never trusted.

The rule is short. A solution changes `src/`. The tests are the forcing
function, so editing the config is how a run cheats, and reset has to undo it.
That is also why `package.json` and `vitest.config.ts` sit in every `restore`
list in [reset.json](#/reset-json).

## As a live fallback

If a demo stalls in front of the room, apply the solution and keep talking.

```bash
npm run solution -- 06
```

The finished files land, the tests go green, and the diff is worth walking
through out loud. Example 06 in particular is timed around a p90 wall clock, so
having a one command exit is part of the plan rather than an admission.

## Keeping Claude out of it

Workspace `CLAUDE.md` says never read anything under `.solution/`. The settings
also deny the Read tool. Neither of those stops Bash.

```
permissions.deny entries like Read(./.solution/**) do not stop Bash.
With the rules loaded, cat and sed read the file.
```

That was verified on 2.1.263. Keeping a demo run out of `.solution/` needs a
PreToolUse hook on Bash. Deny rules govern which tools Claude may call. They do
not govern what a called tool can reach.

## What breaks

- **A solution that edits the tests.** Caught twice by
  `check-solutions.mjs`, up front and after the run.
- **Assuming a deny rule is a wall.** It is a tool level rule. Bash walks
  around it. See [Hooks](#/hooks) for the enforcement that actually holds.
- **Leaving a solution applied.** `npm run reset` puts the starting state back.
  Run it before you commit anything.
