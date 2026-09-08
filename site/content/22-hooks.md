---
title: Hooks
section: Claude Code concepts
order: 3
summary: A shell command the harness runs at a fixed lifecycle event. It fires whether or not the model agrees. Exit code 2 blocks the call and hands stderr back to the model, which makes a hook a feedback loop as well as a wall.
facts:
  Wired in | `.claude/settings.json`, and subagent frontmatter
  Scripts live at | `.claude/hooks/*.mjs`
  Payload arrives | as JSON on stdin
  Exit 2 | blocks the call, sends stderr to the model
  Any other exit | lets the call through
  Shown here by | 02, 05, 06, and every workspace
docs:
  Hooks guide | hooks-guide
  Hooks reference | hooks
  Settings | settings
  Permissions | permissions
tabs:
  Mechanism | Exit codes are the whole API | The wiring
  In this repo | What a hook does in this repository | The underrated half | Per agent hooks
  Limits | A hook where a deny rule cannot reach
  What breaks | What breaks
---

## Exit codes are the whole API

Each hook is a plain Node script. The payload arrives as JSON on stdin. Exit 2
is the one that matters: it blocks the call and sends stderr back to the model.
Every other exit code lets the call through.

Change a blocking hook to exit 1 and Claude never sees the message and the
write goes through. That is one of example 02's suggested experiments, and it
is the fastest way to understand the contract.

## The wiring

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node .claude/hooks/complete.mjs" }] }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "node .claude/hooks/bash-output-guard.mjs" }]
      }
    ]
  }
}
```

Claude Code reads `.claude/settings.json` when it launches, so a change there
needs a restart. That is why a demo may only change files Claude Code does not
read at startup.

## What a hook does in this repository

| Job | Event | Where |
| --- | --- | --- |
| Guard a file the model must not hand edit | `PreToolUse` on `Write` and `Edit` | 02 |
| Hand a compiler error back so Claude fixes its own work | `PostToolUse` on `Write`, `Edit`, `Bash` | 02 |
| Block an unbounded command before its output exists | `PreToolUse` on `Bash` | every workspace |
| Verify the work and write `RESULT.md` | `Stop` | every workspace |
| Print a coloured line per subagent, at zero model tokens | `SubagentStart`, `SubagentStop` | 06 |
| Block every write whose target is not one file | `PreToolUse`, declared in one agent's own frontmatter | 06 |

## The underrated half

Blocking is the obvious use. Feeding information back is the better one. In
example 02, right after codegen, a `PostToolUse` hook runs `tsc --noEmit` and
returns one line.

```
src/handlers.ts(38,26): error TS2345: Argument of type '"status"' is not
assignable to parameter of type 'never'.
```

Claude adds the missing case and moves on. Nobody took a turn.

## A hook where a deny rule cannot reach

`permissions.deny` governs which tools Claude may call. Entries like
`Read(./.solution/**)` do not stop Bash, so `cat` and `sed` still read the file.
Keeping a run out of a protected folder needs a PreToolUse hook on Bash.

Deny rules also do not stop a file from auto loading into context. They are
about tool calls.

## Per agent hooks

Subagent frontmatter can declare its own hooks. Example 06 shows this on the
reviewer only: it holds Write so it can leave `REVIEW.md`, and a PreToolUse
hook blocks every write whose target is not that file.

## What breaks

- **False positives.** The failure mode that kills hooks is blocking something
  legitimate. Example 05's hook test spawns the hook with a JSON payload on
  stdin and checks ten commands that must not be blocked.
- **A hook on every edit that runs the full suite.** Time it before you commit
  to it. Example 05 suggests pointing the typecheck hook at `npm test` and then
  deciding whether you still want it.
- **Editing settings mid session.** Claude Code read the file at launch.
  Restart the CLI.
- **Turning hooks off with the wrong flag.** On 2.1.263 there is no
  `--disable-all-hooks`. Use `claude --settings '{"disableAllHooks": true}'`.
  Avoid `--safe-mode`, which also disables `CLAUDE.md`, skills, and commands.
- **Assuming a payload field exists.** The `SubagentStop` payload documents
  `agent_type`, `agent_id`, and `last_assistant_message`, with no model, token,
  or duration fields. Example 06's hook derives those from the session
  transcript instead.
