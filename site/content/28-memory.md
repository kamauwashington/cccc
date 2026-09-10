---
title: Auto memory
section: Claude Code concepts
order: 9
summary: Notes Claude writes for itself and reloads next session. Every workspace here redirects it into the workspace folder, so it is visible on disk and easy to wipe. It is the one thing rewind does not clear.
facts:
  Redirected to | `examples/NN-name/.claude/memory/`
  Set by | `autoMemoryDirectory` in `.claude/settings.local.json`
  Value must be | absolute, or start with `~/`
  Default in the examples | off, through `"autoMemoryEnabled": false`
  Wiped by | `npm run reset`, always, listed or not
docs:
  Memory and CLAUDE.md | memory
  Settings reference | settings-reference
tabs:
  Mechanism | Why it is redirected | The line in every workspace CLAUDE.md
  Resetting | Reset always clears it
  What breaks | What breaks
---

## Why it is redirected

By default auto memory lives under the user's config directory, keyed off the
git repository. For a demo that is the wrong place twice over. It is invisible,
and every example shares one repository, so they would share one memory
directory.

`scripts/setup.mjs` writes an absolute `autoMemoryDirectory` per workspace, so
each example gets its own folder inside itself. You can open it, read it, and
delete it.

The value has to be absolute or start with `~/`. A relative path is ignored,
which is the reason the file is generated per machine rather than committed.

## The line in every workspace CLAUDE.md

```
Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one.
```

That second sentence is a workaround. There is a known report that the system
prompt still names the default path even when the setting is honoured. One line
in the workspace `CLAUDE.md` settles it.

## Reset always clears it

`reset.mjs` wipes `.claude/memory/` whether or not `reset.json` lists it, then
puts the `.gitkeep` back so the folder matches the snapshot. Without the
placeholder, the completion hook counts the empty directory as a changed file
on every run.

This is also why reset is copy based rather than git based. Auto memory is
gitignored, so `git checkout` would leave it in place and the next run would
start remembering the last one.

## What breaks

- **Relying on `/rewind` between runs.** It rolls code and conversation back
  together, and it leaves auto memory alone. Use `npm run reset` between
  sessions.
- **A relative `autoMemoryDirectory`.** Silently ignored.
- **Putting it in project scope and assuming it holds.** Whether project scope
  is honoured is contested across doc versions. This repository uses local
  scope, which works either way.
