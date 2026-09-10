---
title: Slash commands
section: Claude Code concepts
order: 4
summary: A command is something you invoke by name. A skill is something Claude reaches for on its own. That is the whole difference, and attendees mix them up every time.
facts:
  Lives at | `.claude/commands/<name>.md`
  Discovered | at launch, listed in the `/` menu
  Subdirectories | become a prefix. `grab/next.md` is `/grab:next`.
  Frontmatter | `description`, `argument-hint`, `allowed-tools`, `model`
  Shown here by | 07, and every workspace's `/start`
docs:
  Slash commands | slash-commands
  Command reference | commands
  Skills | skills
tabs:
  Mechanism | Four mechanisms across three files | Namespacing
  Why use one | Why write one at all | A command can ask a question | Commands against skills
  What breaks | What breaks
---

## Four mechanisms across three files

A markdown file under `.claude/commands/` becomes a slash command named after
the file. Example 07 spreads four mechanisms across `grab/next.md`,
`grab/complex.md` and `grab/up-for-grabs.md`.

**Shell injection.** A line starting with `!` and holding a backtick command
runs in the shell before Claude reads the prompt. Its output is pasted in
place. The model never chooses to run it and never sees a version without it.

```
!`node tools/issues.mjs next`
```

That script reads `data/issues.json`, picks today's six issues, and prints
fixed width rows. The selection happens before the model reads a token.

**Arguments.** `$1` is the first argument. `$ARGUMENTS` is everything typed
after the command name. `/grab:up-for-grabs payments` sets `$1` to `payments`,
and the script filters on it.

**File references.** `@src/orders.ts` puts that file in the prompt before the
model starts.

**Frontmatter.** `description` and `argument-hint` are what the `/` menu shows.
`allowed-tools` narrows the tool set, and here it is
`Bash(node tools/issues.mjs:*)` plus `AskUserQuestion`. `model` pins the model:
all three of example 07's commands pin `model: sonnet`, because the script
already did the thinking and the model is only rendering a picker.

## Namespacing

`.claude/commands/grab/next.md` is `/grab:next`. One file, one new command, no
restart. It is also why the three group together in the `/` menu, which is the
only organising affordance a command author gets.

## Why write one at all

Repeatability. Run `/grab:next`, then reset, clear, and ask the same thing in
plain English. Claude does something reasonable both times. The plain English
run picks its own six issues, its own ordering, and its own idea of which ones
count as quick, and two runs give two different lists. The command produces the
same list every time, because the shell output and the file paths are fixed
before the model reads a single token.

Example 07 checks that claim in code. Its suite asserts the backlog is 50
issues split 21 quick, 18 mid and 11 complex, and that every grab view prints
the same bytes on every run. If that test goes red, the example has lost its
point.

## A command can ask a question

`allowed-tools` includes `AskUserQuestion`, so the last thing a command does
can be a picker rather than a paragraph.

```term
  Quick                                    Bigger

  ▸ [x] #118  retry header dropped         ▸ [ ] #104  split the settle job
    [ ] #131  wrong currency symbol          [x] #109  idempotency keys
    [x] #142  timeout log is unreadable      [ ] #126  backfill the ledger
```

The script narrows 50 issues to a handful. The command file says what the
options are, what the labels and descriptions carry, and that the question is
multi select. Nothing is assigned and no work starts: it is a picking exercise,
which is what makes it safe to run in front of a room.

## Commands against skills

| Reach for | When |
| --- | --- |
| A slash command | You invoke it by name. You want the same result every time. |
| A skill | Claude decides it is relevant. You want it to apply without being asked. |

Example 03 is the other half of the pair. It ships two skills and no commands
at all, so the only way either one fires is its description. Example 07 ships
three commands and no skills, so nothing fires unless you type it. Put the two
examples side by side and the distinction stops being a definition.

## What breaks

- **Dropping `argument-hint`.** The `/` menu stops telling anyone the command
  takes an area to filter on. It is the only affordance a user gets.
- **Expecting a command to be discovered.** It never fires on its own. If you
  want Claude to reach for it, that is a skill.
- **Injecting an unbounded command with `!`.** The output lands in the prompt
  before the model reads it. Example 07 injects a script that prints rows it
  designed. See [Context and output](#/context).
- **Letting the model do the picking.** The script narrows the list, the model
  renders it. Swap those and the command stops being repeatable.
