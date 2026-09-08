---
title: Skills
section: Claude Code concepts
order: 2
summary: A folder holding a SKILL.md. Claude Code reads every skill's name and description at launch, and loads the body only when the work matches. The rules cost nothing until they are needed.
facts:
  Lives at | `.claude/skills/<name>/SKILL.md`
  Read at launch | name and description only
  Body loads | on demand, when the work matches
  Nesting | flat folders only. One level.
  Shown here by | 01, 03, 05, 06
docs:
  Skills | skills
  Memory and CLAUDE.md | memory
  Subagents | sub-agents
tabs:
  Mechanism | The mechanism | Split by owner, never by topic
  In this repo | Skills that work on the conversation | Pointing at a tool instead of describing it | Preloading into a subagent
  What breaks | What breaks
---

## The mechanism

Claude Code lists every `SKILL.md` name and description at launch and loads the
body only when one looks relevant. The description is the trigger. Everything
about how reliably a skill fires comes back to that one line.

A skill can carry more than one file. Example 01 puts the longer notes in a
`reference.md` behind the first skill, so the body stays short and the detail
is one read away.

## Split by owner, never by topic

Example 01 carries three skills for one prompt.

| Skill | Owns |
| --- | --- |
| `typescript-enum` | The const object plus union shape, naming, exhaustive switches |
| `postgres-enum` | The `CREATE TYPE` source of truth, the Drizzle `pgEnum`, the append only migration rule |
| `zod-schema` | Validation |

No skill mentions the other two, so each one has to be retrieved on its own
description. The prompt is `Make sure the code follows our standards.` It never
says "enum" and never names a file. Three owners show up in one run and nothing
in the prompt asked for any of them.

## Skills that work on the conversation

Every other example ships a skill that edits code. Example 03 ships two that
change no project file at all. `sharpen` turns a rough prompt into a five
section checklist. `concise` rewrites text until it passes the same rules the
CI linter enforces.

Both end the same way. Write the draft to a file, run a checker over it, fix
what it names, and answer only when the checker exits 0. The forcing function
is structural lint, never a model as a judge, because a judge scores the same
draft differently on two runs.

## Pointing at a tool instead of describing it

Example 05's `board` skill does not list the CLI flags. It tells Claude to run
`node tools/board.mjs --help`, the same way a person would. The skill carries
the procedure. The tool carries its own interface.

## Preloading into a subagent

Subagent frontmatter takes a `skills:` list, which hands the conventions over
instead of letting the agent search for them. Example 06 uses it on all four
agents, and removing the line is one of that example's suggested experiments.

## What breaks

- **A nested skill folder.** `skills/typescript/enum/SKILL.md` never loads.
  Skills have to be one flat folder each. Verified on 2.1.263 with a probe
  holding one nested and one flat skill. Only the flat one appeared.
- **A missing or vague description.** The skill stops firing. Example 06 ships
  an agent with the description `Helps with API stuff.` and the work gets done
  in the main thread instead.
- **Description matching alone, when you need every skill to open.** With
  example 01 split into three, three cold runs loaded all three only twice,
  with and without cross references between them. Naming the three in
  `CLAUDE.md` made it three for three. The code came out correct either way, so
  the tests never caught it. Only the transcript did.
- **A skill in `~/.claude/skills/` that contradicts the project.** No setting
  excludes it. See [Isolation and leakage](#/isolation).
