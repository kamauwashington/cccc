---
title: The three rules
section: Getting started with Claude
order: 4
summary: Launch from inside the example folder. Reset between runs. Read PROMPT.md before you type anything. Every failure mode in this repository comes from breaking one of these.
docs:
  Settings and where they live | settings
  Memory and CLAUDE.md | memory
  Interactive mode | interactive-mode
tabs:
  The three rules | 1. Launch Claude Code from inside the example folder | 2. Reset between runs | 3. Read PROMPT.md before you type anything
  What breaks | What breaks when you skip one
---

## 1. Launch Claude Code from inside the example folder

```bash
cd examples/01-ts-conventions
claude
```

`.claude/settings.json` is read from the directory you launch in. It is never
inherited from a parent. Launching from the repository root gives you none of
the example's configuration and all of the wrong context.

This one rule is the backbone of the whole repository. It is why every
workspace carries a complete copy of its own settings, its own
`tsconfig.json`, and its own hooks. The duplication is required and intended.
`scripts/verify.mjs` checks that every workspace still has the full skeleton.

`CLAUDE.md` works the other way around. Claude Code loads memory from the
launch directory and from every directory above it, so a file at the
repository root reaches every example. That is why the root `CLAUDE.md` holds
writing rules and layout rules and nothing that would change a demo.

## 2. Reset between runs

```bash
npm run reset -- 01
```

Reset is copy based, from that workspace's [.pristine/](#/pristine) snapshot.
It does not use git, which is the point. Two of the files that have to go are
gitignored: the auto memory under `.claude/memory/` and the `RESULT.md` the
Stop hook writes.

Inside a session, `/rewind` is faster. It rolls code and conversation back
together, so the model does not remember the previous attempt. Then run
`/clear`.

A demo may only change files Claude Code does not read at startup.
`settings.json`, `skills/`, `commands/`, and `hooks/` stay untouched during a
run, so `/reset` then `/clear` works without restarting the CLI.

## 3. Read PROMPT.md before you type anything

Each workspace has one prompt, written out verbatim in
[PROMPT.md](#/prompt-md). Paste it as is the first time. Change it on the
second run and watch what moves.

## What breaks when you skip one

| Skipped | What you see |
| --- | --- |
| Rule 1 | Skills never load. Hooks never fire. The run looks like plain Claude Code and the lesson is invisible. |
| Rule 2 | The model remembers the previous attempt and goes straight to the answer. The retrieval story disappears. |
| Rule 3 | You paste a sharper prompt than the one the example was built around, and the example proves nothing. |
