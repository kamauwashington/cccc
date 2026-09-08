---
title: Output styles
section: Claude Code concepts
order: 6
summary: A style file augments the system prompt, so it shapes every answer for the whole session without being repeated in the conversation. It shapes output. It does not enforce output.
facts:
  Lives at | `.claude/output-styles/<name>.md`
  Switched on by | `"outputStyle"` in `.claude/settings.json`
  Frontmatter | `name` and `description`. The `name` has to match the setting.
  Switch in session | `/output-style`, which writes the choice back to settings
  Personal scope | `~/.claude/output-styles/` applies to every project
  Shown here by | 08
docs:
  Output styles | output-styles
  Settings | settings
  Memory and CLAUDE.md | memory
tabs:
  Mechanism | The mechanism | What example 08 sets
  In context | Against the other three mechanisms | The honest part
  What breaks | What breaks
---

## The mechanism

The body of the style file augments the system prompt. It applies to every turn
in the session and never appears in the conversation. Frontmatter carries a
`name` and a `description`, and the picker reads the `name`, which has to match
the `outputStyle` value in settings or the style will not list.

## What example 08 sets

Every code turn ends with the same five headings.

```
Done.          What changed. One line per unit of work.
Works.         What is green and verified, with the number.
Doesn't work.  What is out of scope, unproven, blocked, or missing.
Fixed.         Yes or no, per item. Never imply a partial fix.
Suggestions.   What to do next. One line each.
```

Two rules carry most of the weight. Drop any heading that has nothing under it,
because a heading followed by "nothing" is worse than no heading. And "Doesn't
work" is about limits, scope, and unproven ground. A report that says "Works. 18
tests pass" and then "Doesn't work. It does not compile" is arguing with itself.

## Against the other three mechanisms

| Reach for | When | Applies to |
| --- | --- | --- |
| An output style | Change the shape of every answer | Every turn in the session |
| `CLAUDE.md` | Facts and rules about this repository | Every turn, mixed with everything else |
| A skill | Procedure for one kind of task | Loaded when the task matches |
| A slash command | Something you invoke by name | The turn you invoke it |

The style and `CLAUDE.md` both land in front of the model on every turn. The
difference is switchability. `/output-style default` turns the style off for one
question and back on for the next. Editing `CLAUDE.md` mid session does not work
that way.

## The honest part

A style shapes output. It does not enforce output. The model follows it most of
the time and drifts on the edges. Example 08's style says it does not apply to
prose, so a documentation question should come back as a sentence. Whether that
holds is one of the things the example asks you to check with your own eyes.

That drift is why the checker in example 08 exists as code and never as a
second paragraph of instructions. The exercise and the style are the same
contract, written twice. The style asks a model for it. The checker proves it.

## What breaks

- **A `name` that does not match the setting.** `/output-style` never lists the
  project style.
- **A personal style in `~/.claude/output-styles/`.** It competes with the
  project one. Check that folder is empty before a demo.
- **Editing the style without editing the checker.** Example 08's suite
  compares `src/report-check.ts` against the shipped style file, including
  running the style's own worked example through the checker. The suite turns
  red, which is intended.
