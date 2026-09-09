# 08-report-style

Every other example changes what Claude does. This one changes how Claude
hands the work back.

## The point

`/start` shows the prompt, runs it, and the answer comes back in a shape you
chose. That is the whole example.

The prompt builds a small Express API over static data. It is there so the
answer has something to report on. One prompt, two styles, two shapes.

```
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

Same work. Same prompt. The style decided everything else.

Read the "Doesn't work" heading again. The build compiles, so it would be easy
to call it done. The style is what makes the answer admit the routes were
never called.

## The build

`PROMPT.md` asks for a catalog API in `src/server.ts`:

| Route | Answer |
| --- | --- |
| `GET /health` | `{ "status": "ok", "service": "catalog" }` |
| `GET /api/categories` | Every category |
| `GET /api/products` | Every product |
| `GET /api/products?category=tools` | That category, or `[]` |
| `GET /api/products/:id` | One product, or 404 |
| Anything else | 404 `{ "error": "not_found" }` |

`src/catalog.ts` ships complete with six products in three categories.
Express is already installed at the repository root, so there is nothing to
add. The workspace starts green. `tests/catalog.test.ts` holds the data
honest and stays off screen.

## How it works

A style file in `.claude/output-styles/` is appended to the system prompt, so
it applies to every turn in the session without being repeated in the
conversation. `.claude/settings.json` sets `"outputStyle": "report"`, which is
why `report` is already on when you launch.

Two styles ship here:

| File | Shape |
| --- | --- |
| `.claude/output-styles/report.md` | Done, Works, Doesn't work, Fixed, Suggestions |
| `.claude/output-styles/terse.md` | One line, no headings |

## Running it

Launch Claude Code from inside this folder, then:

1. `/start`. It resets the folder, builds the API, and answers in the session
   style (`report`).
2. `/start -terse`. Same prompt, same build, one line back.
3. `/start -report`. The headings return.

`/start` resets the workspace every time, so run it as often as you like. If
the answers start echoing each other, run `/clear` first.

The flag on `/start` changes one turn. `/output-style terse` changes the
session, and writes the choice back to `.claude/settings.json`.

## What to watch for

Ask a follow-up question after `/start`, without any flag. The style is still
on. It is on for every turn until you switch it, which is the difference
between a style and a one-off instruction.

A style shapes output. It does not enforce output. The model follows it most
of the time and drifts on the edges, usually on turns that do not look like
work.

## How it compares

| Reach for | When | Applies to |
| --- | --- | --- |
| An output style | Change the shape of every answer | Every turn in the session |
| `CLAUDE.md` | Facts and rules about this repository | Every turn, mixed with everything else |
| A skill | Procedure for one kind of task | Loaded when the task matches |
| A slash command | Something you invoke by name | The turn you invoke it |

The style and `CLAUDE.md` both land in front of the model on every turn. The
difference is switchability. `/output-style default` turns this off for one
question and back on for the next. Editing `CLAUDE.md` mid session does not
work that way.

## Try next

- Write a third style and switch to it mid conversation. Watch how much of the
  answer was format all along.
- Delete the "drop any empty heading" rule from `report.md`, then restart the
  CLI and run `/start` again. Count how often "Doesn't work. Nothing." comes
  back. That one line is why the rule is in there. The style is read at
  launch, so a reset alone does not undo the edit.
- Hand the build to a subagent, then ask for the report. The tool calls stay
  in the subagent and only the shaped answer reaches you.
- Move a style file to `~/.claude/output-styles/` and launch from a different
  project. The shape follows you.

## Files

| Path | Purpose |
| --- | --- |
| `src/catalog.ts` | The static data. Ships complete. |
| `tests/catalog.test.ts` | CI backstop over the data. Off screen. |
| `.claude/output-styles/report.md` | The five-heading style. |
| `.claude/output-styles/terse.md` | The one-line style. |
| `.claude/settings.json` | Sets `outputStyle` to `report`. |
| `.claude/commands/start.md` | Resets and applies the flag. |
| `PROMPT.md` | The route list. |
