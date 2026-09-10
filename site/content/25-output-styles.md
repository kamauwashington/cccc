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
  Switch for one turn | an argument the command reads, like example 08's `/start -terse`
  Personal scope | `~/.claude/output-styles/` applies to every project
  Shown here by | 08
docs:
  Output styles | output-styles
  Settings | settings
  Memory and CLAUDE.md | memory
tabs:
  Mechanism | The mechanism | Two styles, one prompt
  In context | Against the other three mechanisms | The honest part
  What breaks | What breaks
---

## The mechanism

The body of the style file augments the system prompt. It applies to every turn
in the session and never appears in the conversation. Frontmatter carries a
`name` and a `description`, and the picker reads the `name`, which has to match
the `outputStyle` value in settings or the style will not list.

## Two styles, one prompt

Example 08 builds a small catalog API and hands it back twice. The work does
not change. The shape does.

```term
  /start -report                    /start -terse
  ──────────────────────────────    ──────────────────────────────
  Done. Built src/server.ts with    src/server.ts serves the six
  six routes.                       routes and typecheck is clean.
  Works. Typecheck clean,           No request has been made
  4 tests green.                    against them yet.
  Doesn't work. Nothing calls
  the routes. They are unproven.
  Suggestions. Add a smoke test
  before wiring a client.
```

```legend
`report.md` | Five fixed headings: Done, Works, Doesn't work, Fixed, Suggestions. Drop any heading with nothing under it.
`terse.md` | One line. Two if the second carries a fact the first cannot. No headings, no preamble, no offer to help.
On at launch | `"outputStyle": "report"` in `.claude/settings.json`, so the report shape is on before anyone types.
The heading that earns its keep | The build compiles, so it would be easy to call it done. "Doesn't work" is what makes the answer admit the routes were never called.
```

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
the time and drifts on the edges. It drifts most on turns that do
not look like work, which is why example 08 asks you to put a follow-up
question in after `/start` and watch whether the shape holds.

The other half of the honesty is scope. `/start -terse` changes one turn.
`/output-style terse` changes the session and writes the choice back to
`.claude/settings.json`, where it stays until someone changes it again.

## What breaks

- **A `name` that does not match the setting.** `/output-style` never lists the
  project style.
- **A personal style in `~/.claude/output-styles/`.** It competes with the
  project one. Check that folder is empty before a demo.
- **Editing a style mid session and expecting it to take.** Styles are read at
  launch. Example 08's own experiment, deleting the empty heading rule from
  `report.md`, says to restart the CLI, because a reset alone does not undo it.
- **Reading a green build as a finished one.** The style is what makes an
  answer name what is unproven. Nothing in the test suite does that job.
