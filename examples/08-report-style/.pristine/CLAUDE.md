# 08-report-style

An output style changes the shape of every answer in a session. This workspace
ships two of them so you can see the same work arrive two ways.

## The build

A small Express API that serves static data. `src/catalog.ts` holds the data
and ships complete. `PROMPT.md` has the route list. The workspace starts
green, so the demo is the answer coming back, not a repair.

- Build `src/server.ts` and nothing else.
- Do not change `src/catalog.ts`, the tests, or the config.
- No database, no file reads, no new dependency. Express is already installed
  at the repository root.
- Confirm with `npm run typecheck`. Do not start a server. Nothing calls the
  routes, so they stay unproven, and the report has to say so.

## The styles

- `.claude/output-styles/report.md` has five headings: Done, Works, Doesn't
  work, Fixed, Suggestions. Drop any heading with nothing under it.
- `.claude/output-styles/terse.md` is one line, no headings.

`.claude/settings.json` sets `"outputStyle": "report"`, so `report` is already
on at launch.

## Rules for this workspace

- `/start` resets the folder and runs `PROMPT.md`. `/start -terse` runs the
  same prompt in the other style.
- `src/server.ts` is deleted on reset. Everything else is restored.
- Never edit anything under `.pristine/`. That is the reset snapshot.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. It is set in `.claude/settings.local.json`.
