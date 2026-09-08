---
title: MCP and the tool ladder
section: Claude Code concepts
order: 10
summary: Most tools do not need an MCP server. Reach for a script, then a skill, then a command, and write a server only when the tool leaves the repository. Every connected server ships its tool list into every session whether or not you call it.
facts:
  Configured in | `.mcp.json` at the workspace root
  Connects | at launch
  Cost when unused | the `tools/list` payload, about 1,263 characters in example 05
  Off for one session | `claude --strict-mcp-config`
  Shown here by | 05
docs:
  MCP | mcp
  Costs | costs
  CLI reference | cli-reference
  Skills | skills
tabs:
  The ladder | Reach for these in order | The same three operations, two ways
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

## The same three operations, two ways

Example 05 implements one message board twice, once as a CLI and once as an MCP
stdio server with no SDK, so the whole protocol is readable in one sitting.

| | `tools/board.mjs` | `mcp/server.mjs` |
| --- | --- | --- |
| Lines in the file | 178 | 212 |
| Lines of code | 142 | 164 |
| Of which is protocol plumbing | 0 | 120 |
| Shared core | `src/board-db.mjs`, 91 lines, used by both | same file |
| Process lifecycle | starts, answers, exits | starts with Claude Code, stays alive |
| Context cost when unused | zero | the tool list payload |
| Discoverable by a human | `--help` | needs a client |
| Works in a shell pipeline | yes | no |

The last two rows matter more than the line counts. A CLI is testable with
`spawnSync`, greppable, pipeable into `jq`, and runnable by the person reviewing
the pull request. An MCP tool is none of those things.

## Where a server earns its keep

Three cases, and they are real.

- **Hosted services.** GitHub, Sentry, Linear, a database behind a VPN. The
  tool needs credentials and a network client. A shell script would be a worse
  version of software someone already wrote.
- **Internal APIs shared across teams.** One server, many repositories. The
  alternative is the same script copied into nine places.
- **Anything you also want in Claude Desktop.** A CLI only exists where there
  is a shell. MCP is the portable answer.

The test is simple. If the tool leaves this repository, write a server. If it
lives here, write a script.

## Measure the standing cost

Every connected server ships its tool list into every session whether or not a
tool is called. Run `claude doctor` and read the per session token cost of a
server nobody called. Put that number on screen rather than quoting one from a
slide.

## What breaks

- **A server nobody calls.** It costs its tool list on every session, forever.
  `claude doctor` reports it.
- **Writing a server for your own repository's scripts.** You pay protocol
  plumbing, a process lifecycle, and a context tax for something Bash already
  did.
- **A skill that lists the tool's flags.** They drift. Example 05's skill tells
  Claude to run `--help` instead.
