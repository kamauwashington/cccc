---
title: .pristine/
section: Repo staples
order: 3
summary: The reset snapshot. A plain copy of the workspace in its starting state, one per example, sitting inside the workspace it belongs to. Reset copies these files back over the live ones.
facts:
  Lives at | `examples/NN-name/.pristine/`
  Written by | `scripts/snapshot.mjs`
  Read by | `scripts/reset.mjs`
  Contains | exactly the paths in the `restore` list of `reset.json`
  Read and Edit | denied in `.claude/settings.json`
docs:
  Permissions | permissions
  Settings | settings
tabs:
  Why it exists | Why it exists | Why it lives inside each workspace
  Working with it | Refreshing it | Claude is kept out of it
  What breaks | What breaks
---

## Why it exists

Reset has to put a workspace back to a known starting state between runs. Git
cannot do that job here for two reasons.

1. Two of the files that must go are gitignored. Auto memory under
   `.claude/memory/` and the `RESULT.md` the Stop hook writes are both
   invisible to `git checkout`.
2. The examples ship without their own git repository. An embedded repository
   makes the parent repository stop tracking that folder's contents.

So reset is copy based. `.pristine/` is the copy.

## Why it lives inside each workspace

A single folder at the repository root would be smaller. Per workspace keeps
each folder independently copyable, which is the whole take home goal. An
attendee can copy `examples/02-hooks/` out on its own and `npm run reset` still
works.

## Refreshing it

Change the live files, then snapshot on purpose.

```bash
node scripts/snapshot.mjs 02
node scripts/snapshot.mjs --all
```

`snapshot.mjs` wipes `.pristine/`, copies in every path from the `restore` list
in [reset.json](#/reset-json), and writes a `README.md` inside the snapshot
saying what the folder is.

## Claude is kept out of it

Every workspace denies both tools on the folder.

```json
{
  "permissions": {
    "deny": ["Read(./.pristine/**)", "Edit(./.pristine/**)"]
  }
}
```

That covers the Read and Edit tools. It does not cover Bash. With the workspace
rules loaded, `cat` and `sed` still read the file. Keeping a run out of a
protected folder needs a PreToolUse hook on Bash, which is what
[.solution/](#/solution) uses.

## What breaks

- **Editing files under `.pristine/` while working on an example.** The next
  reset restores your edit and the starting state is quietly wrong.
- **Snapshotting after a demo.** It bakes the solution into the starting state.
  The example goes green on a fresh clone and the lesson is gone.
- **A `restore` entry with no snapshot.** Reset warns and leaves the live file
  alone rather than deleting it, because a missing entry is usually a stale
  snapshot. `scripts/verify.mjs` fails the build on the same condition.
- **Adding a new npm script and testing it before snapshotting.** `package.json`
  is in every `restore` list, so the script's own reset strips it back out of
  the live file. Snapshot first.
