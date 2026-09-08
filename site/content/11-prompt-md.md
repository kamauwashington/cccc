---
title: PROMPT.md
section: Repo staples
order: 2
summary: One prompt per workspace, written out verbatim, with no headings and no alternatives. The presenter pastes it straight in. It is the control variable for the whole example.
facts:
  Lives at | `examples/NN-name/PROMPT.md`
  Contains | the prompt text and nothing else
  Also reachable as | `/start`
  Longest one | example 06, a fan out brief
docs:
  Slash commands | slash-commands
  Common workflows | common-workflows
tabs:
  The rule | The rule | /start reads it for you
  Using it | The second run is the lesson
  What breaks | What breaks
---

## The rule

The file holds the prompt. No headings, no explanation, no alternatives. If a
reader has to choose which line to paste, the example has two variables and
proves nothing.

Most of them are one line.

```
Make sure the code follows our standards.
```

That is example 01, in full. It never says "enum" and it never names a file.
`CLAUDE.md` plus three skill descriptions carry the whole retrieval. The prompt
is deliberately weak so the configuration has to do the work.

## /start reads it for you

Every workspace ships this command, straight from the template.

```markdown
---
description: Run this example's prompt exactly as written in PROMPT.md
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

Do exactly what the following prompt says. Nothing more.

@PROMPT.md
```

The `@PROMPT.md` reference pulls the file into the prompt before the model
starts. See [Slash commands](#/commands) for how `@` and `!` differ.

## The second run is the lesson

Paste it as is the first time. Then change one thing and watch what moves.
Every example README ends with a "Try next" section that names the change worth
making.

## What breaks

- **Sharpening the prompt without saying so.** A tighter prompt gets a better
  answer, and the example stops demonstrating retrieval. That is a real result
  and worth saying out loud, and it is a different demo.
- **A prompt that names the file.** Example 01 falls apart the moment the
  prompt says "priority.ts". The skill is no longer doing the finding.
- **Editing PROMPT.md mid session.** `/start` reads it at invocation, so the
  change lands, and the run is no longer comparable to the last one. Reset
  first.
