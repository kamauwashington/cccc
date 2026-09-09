---
title: Repository scripts
section: Scripts
order: 1
summary: Ten scripts under scripts/. Setup and reset run automatically. Verify, preflight, prose lint, and check solutions are the gates. Go, start, and solution are for the stage.
facts:
  Live at | `scripts/*.mjs`
  Shared helpers | `scripts/lib.mjs`
  Run in CI | `verify`, `lint-prose`, `check-solutions`
  Run by npm | `setup` through `postinstall`, `reset` through `postReset`
docs:
  Common workflows | common-workflows
  CLI reference | cli-reference
tabs:
  The table | The table
  The gates | The gates | The stage helpers
  What breaks | What breaks
---

## The table

| Command | What it does |
| --- | --- |
| `npm run setup` | Writes the generated `settings.local.json` in every workspace |
| `npm run reset -- 02` | Restores one workspace from its `.pristine/` snapshot |
| `npm run reset` | Restores every workspace |
| `npm run snapshot` | Refreshes a `.pristine/` snapshot from the current files |
| `npm run verify` | Checks the root `.claude/` is bare and every workspace has the skeleton |
| `npm run preflight` | Pre talk checks. Run this before you go on stage. |
| `npm run lint:prose` | Fails on em dashes and banned phrases |
| `npm run go 02` | Optional. Changes into a workspace and launches Claude Code. |
| `npm run solution -- 06` | Copies in the reference solution if a live run stalls |
| `npm run solution` | Applies every solution, so the whole repository goes green |
| `npm run check:solutions` | Applies each solution, verifies it, then resets |
| `npm run build` | Builds this site into `dist/index.html` |
| `npm run publish:web` | Copies the build into the publish repository and commits it |

## The gates

**`verify.mjs`** does two checks and only two. The root `.claude/` holds
`settings.json` and nothing else, and every workspace has the skeleton files
from the template. It also refuses an absolute path in a committed
`settings.json`, and it catches a workspace still carrying the template's
placeholder package name, which would make npm refuse to run anything.

It must never flag repeated content between workspaces. The duplication is
required by the tool, since settings do not inherit. It is also the point.

**`lint-prose.mjs`** scans every markdown file and every code comment. It fails
on em dashes, en dashes, and a short list of banned phrases. Fenced code blocks
are skipped, since they hold sample text. Three suppressions exist for the
places that quote a banned phrase on purpose.

```
<!-- prose-lint-ignore -->        markdown, applies to the next line
<!-- prose-lint-ignore-file -->   markdown, applies to the whole file
// prose-lint-ignore              source comment, applies to the next line
```

The rules it enforces live in three places, and all three have to agree: the
root `CLAUDE.md`, this script, and the `concise` skill in example 03. A test in
example 03 reads this script and fails when the two lists drift apart.

**`check-solutions.mjs`** is what CI gates on, because root `npm test` is red by
design. It applies each `.solution/`, verifies the workspace, then resets. It
refuses a solution that ships an edited `tests/`, `vitest.config.ts`,
`tsconfig.json`, or `package.json`, and it re-diffs those against the snapshot
after the run.

## The stage helpers

**`start.mjs`** is what the `/start` command calls inside a workspace, through
the `start` npm script. It resets, shows the first red signal, and stops. It
always exits 0, because a non zero exit makes npm print seven lines of its own
error block over the output.

**`go.mjs`** changes into a workspace and launches Claude Code. It was kept and
deliberately made loud: it prints the exact `cd` command it is about to run
before it runs it, because typing `cd examples/02-hooks && claude` by hand
teaches the launch directory rule better than a script that hides it.

**`solution.mjs`** copies a workspace's `.solution/` over the live files. With
no argument it greens the whole repository.

## What breaks

- **Running `snapshot.mjs` after a demo.** It bakes the solution into the
  starting state.
- **Adding an npm script and testing it before snapshotting.** `package.json`
  is in every restore list, so the script's own reset strips it back out.
- **Expecting root `npm test` to pass.** It is red by design. See
  [Red is the starting state](#/red-start).
