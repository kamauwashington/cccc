---
title: MCP and the tool ladder
section: Claude Code concepts
order: 10
summary: Most tools do not need an MCP server. Reach for a script, then a skill, then a command, and write a server only when the tool leaves the repository. Every connected server ships its tool list into every session whether or not you call it.
facts:
  Configured in | `.mcp.json` at the workspace root
  Connects | at launch
  Cost when unused | its whole tool list, on every session
  Off for one session | `claude --strict-mcp-config`
  In this repository | no server, anywhere. That is the point.
docs:
  MCP | mcp
  Costs | costs
  CLI reference | cli-reference
  Skills | skills
tabs:
  The ladder | Reach for these in order | What example 05 does instead
  When MCP wins | Where a server earns its keep | Measure the standing cost
  What breaks | What breaks
---

## Reach for these in order

Stop at the first one that works.

| Reach for | When |
| --- | --- |
| Bash plus a script in the repository | Your own code in your own repository |
| A skill with a bundled script | The call needs procedure or context around it |
| A slash command with `!` injection | You invoke it, Claude does not |
| An MCP server | The tool leaves the repository. Remote systems, auth, or reuse across clients. |

Every example in this repository stops at the first row. There is no
`.mcp.json` in the repo, no server process, and nothing listening on a port.
That is not an omission. Ask a room what is running behind a tool call in
example 05 and most of them will say a server.

## What example 05 does instead

One message board, three questions, three scripts over the same 320 rows.

```term
  › What is on the board right now, and which channel is busiest?

  ● Bash(node tools/board.mjs stats)

    board  320 messages  6 channels  newest 2026-08-22

      deploys       59
      general       57
      incidents     57
```

```legend
The whole setup | Three scripts in `tools/`, a table in `CLAUDE.md` mapping each question to one of them, and an allow rule per script in `.claude/settings.json`.
The process | Starts, answers, exits. Nothing stays alive, so nothing costs anything between calls.
Cost when idle | Zero. A server's tool list is paid on every session whether you call it or not.
Reviewable | `--help` works, the output pipes into `jq`, and the person reviewing the pull request can run it.
Adding a tool | A file, a line in `CLAUDE.md`, an allow rule. The second and third script here cost exactly that each.
```

An MCP tool is none of those things. It needs a client to be discoverable, it
cannot be piped, and roughly two thirds of a hand written stdio server is
protocol plumbing rather than the thing you wanted.

## Where a server earns its keep

Three cases, and they are real.

- **Hosted services.** GitHub, Sentry, Linear, a database behind a VPN. The
  tool needs credentials and a network client. A shell script would be a worse
  version of software someone already wrote.
- **Internal APIs shared across teams.** One server, many repositories. The
  alternative is the same script copied into nine places.
- **Anything you also want in the Claude desktop app.** A CLI only exists where
  there is a shell. MCP is the portable answer.

The test is simple. If the tool leaves this repository, write a server. If it
lives here, write a script.

## Measure the standing cost

Every connected server ships its tool list into every session whether or not a
tool is called. Run `claude doctor` in a project that has one connected and
read the per session token cost of a server nobody called. Put that number on
screen rather than quoting one from a slide.

`claude --strict-mcp-config` starts a session with only the servers you name,
which is the quickest way to see what the connected ones were costing.

## What breaks

- **A server nobody calls.** It costs its tool list on every session, forever.
  `claude doctor` reports it.
- **Writing a server for your own repository's scripts.** You pay protocol
  plumbing, a process lifecycle, and a context tax for something Bash already
  did.
- **A skill or a `CLAUDE.md` that lists a tool's flags.** They drift. Point at
  `--help` instead, the same way a person would.
