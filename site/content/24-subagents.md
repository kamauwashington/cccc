---
title: Subagents
section: Claude Code concepts
order: 5
summary: One markdown file per agent. The frontmatter sets the model, the effort, the tools, the skills, and the permission mode. The body is that agent's system prompt. Each one gets its own context window.
facts:
  Lives at | `.claude/agents/<name>.md`
  Read | at launch. A change needs a restart.
  Frontmatter | `name`, `description`, `model`, `effort`, `skills`, `tools`, `disallowedTools`, `permissionMode`, `hooks`, `color`
  Effort takes | `low`, `medium`, `high`, `xhigh`, `max`
  Shown here by | 06
docs:
  Subagents | sub-agents
  Hooks reference | hooks
  Permissions | permissions
  CLI reference | cli-reference
tabs:
  Invoking one | Four ways to invoke one | The description is the trigger
  Speed | Fan out in one turn | Cheap visibility | Own context window
  What breaks | What breaks
---

## Four ways to invoke one

1. **Automatic.** Claude reads the `description` field and decides. Contextual,
   and it misses often.
2. **Name it in a sentence.** "Have cottonmouth write the spec." Reliable.
3. **`@agent-cottonmouth`.** Guarantees which agent runs.
4. **`claude --agent sidewinder`, or the `agent` key in settings.** The whole
   session runs as that agent.

Say the third one out loud, because people get it wrong. `@agent-cottonmouth`
controls which agent runs. It does not control the prompt that agent receives.
Claude still writes the task prompt itself, from your whole message. The
mention is never a direct pipe into the subagent.

## The description is the trigger

Example 06 ships one agent with the description `Helps with API stuff.` Run the
prompt and Claude writes the OpenAPI document itself in the main thread. Swap
that one line for `Writes OAS 3.1 specs. Use PROACTIVELY when adding or
changing endpoints.`, reset, and run the same prompt. The agent gets the job.
Nothing else about it changed.

## Fan out in one turn

Dispatching every producer in a single turn is the single biggest speed lever.
Two sequential rounds doubles the wall clock. Example 06 sends four agents at
once and the prompt says so explicitly, because the model sometimes splits the
dispatch across two turns anyway.

The rest of that example's speed list, in order of payoff:

1. One fan out, no second round.
2. Orchestrator at `effort: low`. Dispatch and assembly need no deep reasoning.
3. Cap the output in every agent prompt. Give a number.
4. Remove discovery work. Exact paths, `skills:` frontmatter, tight `tools:`
   allowlists, target files pre created so the work is an edit rather than a
   search followed by a write.
5. Push work down a tier. Anything Haiku can do, Haiku does.
6. No tests inside the agents. The Stop hook runs the suite once at the end.
7. Ignore warm up. A second run is no faster than the first. Measured at 4.6s
   then 5.1s in example 06, slowest last.

Personality is output tokens, and output tokens are wall clock time. Each agent
in example 06 prints one line in character, under ten words, then emits its
file. The limit is in the agent prompt on purpose.

## Cheap visibility

The coloured line per agent is not the model talking. A hook on `SubagentStart`
and `SubagentStop` reads the numbers out of the session transcript, prints the
line, and appends a row to `TRANSCRIPT.md`. It costs zero model tokens.

## Own context window

A subagent has its own context window and only its summary comes back. That is
the right answer for reading logs, triaging test failures, and any command
whose full output you do not need. Example 05 suggests pointing a subagent at
a 69,000 character JSON dump and asking it for the three busiest channels. The
dump lands in the subagent's window and one sentence comes back to yours.

## What breaks

- **A review agent in the same fan out as the writers.** It reads the three
  files while the others are still writing, so its review can name a file that
  was empty a second ago. That is the price of a single fan out, and it is
  worth saying out loud.
- **One permission prompt.** It kills an unattended run. Put every command the
  agents need in `permissions.allow`, and set `permissionMode: acceptEdits` in
  each agent's frontmatter.
- **An auto compact mid run.** Start the segment on a fresh session.
- **Editing `.claude/agents/` mid session.** Claude Code read the folder at
  launch. Run `/agents` after a swap, and restart the CLI if the old
  description is still there.
- **Building a slide around the fastest run.** Time the whole thing ten times
  and build around the p90. The fastest run is the one you will not get on
  stage.
