---
title: CLAUDE.md
section: Claude Code concepts
order: 1
summary: Context, never enforcement. It loads at launch from the launch directory and every directory above it, and Claude may follow it or may not. That gap is the whole point of example 02.
facts:
  Lives at | `./CLAUDE.md` or `./.claude/CLAUDE.md`
  Loads | at launch, from the launch directory and upward
  Subdirectory files | on demand, when Claude reads a file in that folder
  Guarantee | none. It is context.
  Shown here by | 01, 02, 04, 08
docs:
  Memory and CLAUDE.md | memory
  Context window | context-window
  Hooks guide | hooks-guide
tabs:
  Mechanism | Context, never a wall | Where the files sit and when they load
  Writing it | Write a map, never a copy | The tell | When the big file wins
  What breaks | What breaks
---

## Context, never a wall

A hook is a shell command the harness runs. `CLAUDE.md` is context the model
may follow. Same rule, two very different guarantees.

Example 02 runs the same prompt three times to make that concrete. In beat one
the rule lives only in `CLAUDE.md`, and Claude edits the generated file anyway,
because that is the shortest path. The rule fails on stage. Then a hook blocks
the write and Claude reads the reason and does the right thing without being
told twice.

If a rule has to hold, write a [hook](#/hooks). If a rule is a fact about the
project, write it here.

## Where the files sit and when they load

| File | Loads |
| --- | --- |
| `CLAUDE.md` at the workspace root | At launch |
| `.claude/CLAUDE.md` | At launch |
| `CLAUDE.md` in a parent directory | At launch, concatenated in from the filesystem root down |
| `src/<domain>/CLAUDE.md` | When Claude reads a file in that folder |
| `.claude/rules/*.md` with a `paths` glob | When a tool call matches the glob |

Claude Code walks up, never down. A `CLAUDE.md` deeper in the tree is read
later, when a tool call touches a file in that folder. Progressive disclosure
is the default behaviour, and most people fight it by pushing everything up
into the root file. Example 04 measures what that costs.

Both `./CLAUDE.md` and `./.claude/CLAUDE.md` load. Verified with a probe holding
one of each. This repository puts the workspace file at the root.

## Write a map, never a copy

The root file should be a map of the project. It should not be a copy of the
project. Example 04 ships two versions of the same file, a 25 line map and a
470 line copy, and swaps between them with one script so the code, the tests,
and the subdirectory memory stay byte identical across both runs.

The built in `/doctor` trim check uses the same heuristic. It removes content
that can be derived from the codebase: directory layouts, dependency lists,
restated type definitions, file indexes. It keeps pitfalls, reasoning, and
conventions that differ from the defaults.

Read a candidate section and ask whether Claude could find it with one `ls` or
one `grep`. If yes, cut it.

## The tell

`CLAUDE.fat.md` in example 04 describes `OrderStatus` without a refunded
member. The moment the task lands, the fat file is wrong. The map is still
right, because it never claimed to know the enum members.

## When the big file wins

Give a task that spans four domains, such as an audit log entry for every
status change everywhere, and the fat file is the more reliable one. Everything
the task needs is already in context. The lean run has to discover four folders
first, and it can miss one.

Match the shape of the instructions to the shape of the task. Narrow task,
narrow root file, deep tree. Broad task, more up front.

## What breaks

- **A rule that has to hold, written here.** It fails when the shortest path
  disagrees with it. Beat one of example 02 is that failure on purpose.
- **A large root file.** It is paid on every session, whatever the task is.
  Exploration is paid once, and only when it is needed.
- **A parent `CLAUDE.md` you forgot about.** It loads. Run `/context` and read
  the Memory files line before you trust a session.
- **Two files that disagree.** Claude may pick either one. Example 01 shipped
  a version of this: the file said to read the skills that apply, and three
  cold runs loaded all three only twice. Changing the line to say read all
  three made it three for three.
