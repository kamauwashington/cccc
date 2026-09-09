# 05-tools-and-output

A message board. Three scripts in `tools/` read it, one per question.

| Question | Tool |
| --- | --- |
| what is on the board | `tools/board.mjs` |
| who is posting | `tools/people.mjs` |
| when it was busy | `tools/activity.mjs` |

## Rules for this workspace

- Answer any question about the board by running one of those three. Pick the
  one that matches the question. Run it with no arguments to see its commands.
- Never read `data/board.json`. That file is the tool's business. 320 rows of
  JSON in the transcript is the thing this example exists to avoid.
- Answer from what the tool printed. The headline carries the counts and the
  rows carry the detail, so nothing needs to be recounted.
- A bucket marked `partial` in `activity.mjs` covers days outside the data.
  Say so rather than reading it as a quiet stretch.
- Never edit anything under `.pristine/`. That is the reset snapshot.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one. It is set in `.claude/settings.local.json`.
