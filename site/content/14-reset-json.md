---
title: reset.json
section: Repo staples
order: 5
summary: The manifest in every workspace. It says which paths get restored from the snapshot, which get deleted outright, how to verify the result, and what to run afterwards.
facts:
  Lives at | `examples/NN-name/reset.json`
  Read by | `scripts/reset.mjs` and `scripts/snapshot.mjs`
  Keys | `restore`, `delete`, `verify`, `postReset`
  Checked by | `scripts/verify.mjs`
docs:
  Settings | settings
  Hooks reference | hooks
tabs:
  The manifest | The shape | What each key does
  The rules | The two lists do different jobs | Why config files are in the restore list
  What breaks | What breaks
---

## The shape

```json
{
  "restore": [
    "src",
    "tests",
    "package.json",
    "tsconfig.json",
    "vitest.config.ts",
    "CLAUDE.md",
    ".claude/memory"
  ],
  "delete": [
    "RESULT.md",
    "TRANSCRIPT.md",
    "dist",
    ".claude/.complete-state.json"
  ],
  "verify": "npm run typecheck && npm test",
  "postReset": "node ../../scripts/setup.mjs"
}
```

## What each key does

| Key | Job |
| --- | --- |
| `restore` | Paths copied back from [.pristine/](#/pristine). The same list is what `snapshot.mjs` captures, so the two can never disagree. |
| `delete` | Paths removed outright. Supports `*` and `**`. This is for files the starting state must not have. |
| `verify` | The command the Stop hook runs to decide whether the work is done. Without it the completion signal stays quiet. |
| `postReset` | Run inside the workspace after the restore. Every example points it at `setup.mjs`, which rewrites the generated local settings. |

## The two lists do different jobs

`restore` and `delete` are not interchangeable. A path in `restore` with no
snapshot entry is left alone and warned about, because a missing entry is
usually a stale snapshot rather than a file that should not exist. Deleting it
would be destructive and surprising. A file that must never survive a reset
belongs in `delete`.

Auto memory is handled outside both lists. `reset.mjs` always wipes
`.claude/memory/` and puts the `.gitkeep` back, whether or not the manifest
mentions it. It is the one thing `/rewind` will not clear.

## Why config files are in the restore list

`package.json` and `vitest.config.ts` sit in every `restore` list. The tests are
the forcing function, so editing the config is how a run cheats, and reset has
to undo it. See [.solution/](#/solution) for the other half of that rule.

## What breaks

- **Adding an npm script, then running it before snapshotting.**
  `package.json` is in the restore list, so the script's own reset strips it
  back out of the live file. The next snapshot then captures the stripped
  version. Snapshot first.
- **A `restore` list with no `verify` command.** `verify.mjs` warns. The Stop
  hook has nothing to run, so the completion signal never fires.
- **Forgetting a new generated file in `delete`.** It survives the reset and
  the next run starts from a state nobody meant.
