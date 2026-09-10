---
title: Context and output
section: Claude Code concepts
order: 11
summary: You control the surface between the shell and the context window. One noisy command is roughly 8,000 tokens, it is stored in the session file, and it is paid again every time the session continues.
facts:
  Bash output captured | about 30,000 characters by default
  Past the cap | head and tail kept, middle dropped
  Raise it with | `BASH_MAX_OUTPUT_LENGTH`, to at most 150,000
  Inspect with | `/context`
  Shown here by | 05 for output, 04 for startup
docs:
  Context window | context-window
  Costs | costs
  Hooks reference | hooks
  Subagents | sub-agents
tabs:
  The facts | Facts most people have never been told | The five rules, in order of payoff
  Measuring | Measure it yourself | The startup half
  What breaks | What breaks
---

## Facts most people have never been told

- The Bash tool captures about 30,000 characters of output by default. Past
  that it keeps the head and the tail and drops the middle.
- `BASH_MAX_OUTPUT_LENGTH` raises the cap to at most 150,000. Treat it as a
  ceiling. There are open reports that large outputs get saved to a file and
  previewed anyway, so raising it does not fix the problem.
- The terminal folds long output behind a "ctrl+o to expand" line. That is only
  the display. The whole thing already went into context.
- Tool output is stored in the session file. It is reloaded every time the
  session continues, so one noisy command is paid many times.
- One `curl` that returns 30,000 characters is roughly 8,000 tokens. Three of
  them force a compaction.

## The five rules, in order of payoff

1. **Design the output of any tool in this repository.** A CLI prints three
   lines by default. Everything else sits behind `--json` or `--verbose`.
2. **Filter in the shell before the output exists.** `curl -s`,
   `git status --porcelain`, `npm test -- --reporter=dot`, `jq -r`,
   `2>/dev/null`, `| head -20`.
3. **Redirect to a file and read a slice of it.**
   `cmd > /tmp/out.json 2>&1 && jq '.summary' /tmp/out.json`. The full output is
   still there if Claude needs it.
4. **Ask for the exit code when that is all that matters.**
   `npm test > /dev/null 2>&1 && echo PASS || echo FAIL`.
5. **Send noisy work to a subagent.** A subagent has its own context window and
   only its summary comes back. This is the right answer for reading logs and
   for triaging test failures.

Rule 1 is first because it is the only one that works while you are asleep. The
other four ask a person or a model to remember something. Rule 1 changes what
is possible.

## Measure it yourself

Example 05 is the one to run for the output half. Ask the board question, watch
the tool print a headline and a handful of rows, and note what did not happen:
320 rows of JSON sat in `data/board.json` the whole time and none of them
entered the conversation.

```term
  node tools/board.mjs stats

  board  320 messages  6 channels  newest 2026-08-22

    deploys       59
    general       57
    incidents     57
```

```legend
The headline | Carries the counts, so nothing has to be recounted downstream.
The rows | Fixed width, newest first, capped by the tool rather than by the model.
The rule that makes it stick | `Read(./data/**)` is denied in `.claude/settings.json`. Without it, reading the raw JSON is the cheapest path.
Take the number | Run `/context` before and after. If `/context` is missing on the machine, `wc -c` on the raw file makes the same point with no UI.
```

## The startup half

Everything loaded at launch is paid on every session, whatever the task is.
That is `CLAUDE.md` and every parent copy of it, unconditional rules files,
skill names and descriptions, and every connected MCP server's tool list.
Exploration is paid once, and only when it is needed.

Example 04 is the measurement for that half. Two versions of one root file, a
401 line description of every domain against a 32 line map, with byte identical
code underneath. `/mode-fat` and `/mode-lean` swap which one is live, `/clear`
makes the new one load, and `/context` is where the difference shows up. Ten
runs per mode, median on the slide, because a single run of an agent is close
to a coin flip.

## What breaks

- **Quoting a token number you did not measure today.** Counts move between
  model versions and between runs. Every measurement in this repository comes
  with an instruction to take it again.
- **Raising the output cap instead of designing the tool.** The cap is a
  ceiling, and the output is still stored and reloaded.
- **Reading the "ctrl+o to expand" fold as a saving.** It is display only.
