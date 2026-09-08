---
title: Slash commands
section: Claude Code concepts
order: 4
summary: A command is something you invoke by name. A skill is something Claude reaches for on its own. That is the whole difference, and attendees mix them up every time.
facts:
  Lives at | `.claude/commands/<name>.md`
  Discovered | at launch, listed in the `/` menu
  Subdirectories | become a prefix. `db/seed.md` is `/db:seed`.
  Frontmatter | `description`, `argument-hint`, `allowed-tools`, `model`
  Shown here by | 07, 03, and every workspace
docs:
  Slash commands | slash-commands
  Command reference | commands
  Skills | skills
tabs:
  Mechanism | Three mechanisms in one file | Namespacing
  Why use one | Why write one at all | Commands against skills
  What breaks | What breaks
---

## Three mechanisms in one file

A markdown file under `.claude/commands/` becomes a slash command named after
the file. Example 07's `ship.md` uses all three of the moving parts.

**Arguments.** `$1` is the first argument. `$ARGUMENTS` is everything the user
typed after the command name. `/ship 1.4.0` sets `$1` to `1.4.0`.

**Shell injection.** A line starting with `!` and holding a backtick command
runs in the shell before Claude reads the prompt. Its output is pasted in
place. The model never chooses to run it and never sees a version without it.

```
!`cat fixtures/history.txt`
```

In a real project with a git repository that same line reads:

```
!`git log --oneline v1.3.0..HEAD`
```

**File references.** `@src/orders/service.ts` puts that file in the prompt
before the model starts. Every workspace's `/start` command uses `@PROMPT.md`
for exactly this.

**Frontmatter.** `description` and `argument-hint` are what the `/` menu shows.
`allowed-tools` narrows the tool set. `model` pins the model, which example 07
uses to run two mechanical commands on Haiku.

## Why write one at all

Repeatability. Run `/ship 1.4.0`, then reset, clear, and ask the same thing in
plain English. Claude does something reasonable both times. The plain English
run picks its own headings, its own ordering, and its own idea of which commits
matter, and two runs give two different files. The command produces the same
file every time, because the shell output and the file paths are fixed before
the model reads a single token.

Example 07 checks that claim in code. One test checks the file `/ship` wrote.
Another renders the same changelog twenty times and asserts the bytes never
move.

## Commands against skills

| Reach for | When |
| --- | --- |
| A slash command | You invoke it by name. You want the same result every time. |
| A skill | Claude decides it is relevant. You want it to apply without being asked. |

Example 03 shows the pair working together. `/sharpen` and `/concise` are three
line wrappers that point at a skill and pass `$ARGUMENTS` through. The skill is
still reachable on its own description when nobody types the command.

## Namespacing

`.claude/commands/db/seed.md` is `/db:seed`. One file, one new command, no
restart.

## What breaks

- **Dropping `argument-hint`.** The `/` menu stops telling anyone the command
  wants a version. It is the only affordance a user gets.
- **Expecting a command to be discovered.** It never fires on its own. If you
  want Claude to reach for it, that is a skill.
- **Injecting an unbounded command with `!`.** The output lands in the prompt
  before the model reads it. See [Context and output](#/context).
