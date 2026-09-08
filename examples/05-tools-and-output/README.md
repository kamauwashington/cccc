# 05-tools-and-output

You control the surface between the shell and the context window. This example
is about what a tool should be, and then about how much it should say.

## What you will see

A message board CLI whose `list` command dumps every row, and a test suite that
refuses to accept that. You give each subcommand a short default, put the full
payload behind `--json`, and watch a hook block the noisy command before its
output ever reaches the context window.

## How it works

`tools/board.mjs` is a plain Node CLI over PGlite, a Postgres build that runs in
process and stores data in a directory. `src/board-db.mjs` holds the queries.
`mcp/server.mjs` serves the same three operations over MCP stdio, hand written
with no SDK, so you can read the whole protocol in one sitting.

Claude finds the CLI through `.claude/skills/board/SKILL.md`, which loads on
demand when a request sounds like the board. The skill does not list the flags.
It tells Claude to run `node tools/board.mjs --help`, the same way a person
would. `.claude/hooks/bash-output-guard.mjs` is a `PreToolUse` hook on Bash. It
runs before the command and exits 2 to block it.

## The prompt

```
Give every subcommand in tools/board.mjs a short default output and put the full payload behind --json, then make npm test pass.
```

## The demo

Three lines. No setup: the board fills itself the first time you open it.

```
node tools/board.mjs list | wc -c        # before: 34,080
```

Paste the prompt above, let Claude work, then:

```
node tools/board.mjs list | wc -c        # after: about 700
node tools/board.mjs list --json | wc -c # the full payload is still there
```

Same information for the task at hand. Two orders of magnitude in tokens.

Then let Claude try the noisy command on its own. The hook fires, Claude reads
the message, and rewrites its own command to `--limit 20` or a pipe into `jq`.
That is the moment: Claude correcting itself with no turn from you.

## Speaker notes

`wc -c` is the honest measure and needs no UI. If you want the number in
Claude's own terms, run `/context` before and after the naive command instead.
The Bash tool trims that output to 30,000 characters by dropping the middle, so
what lands is about 8,000 tokens for a result nobody can fully read.

The board seeds itself on first open, 320 deterministic messages, about seven
seconds once. `npm run seed` still exists to wipe and refill it deliberately,
and `BOARD_NO_AUTOSEED=1` keeps an empty board empty if you want to show the
starting state.

In the starting state the noisy command is a bare `node tools/board.mjs list`.
That is the point of the exercise. A tool with no output design gives you no way
to ask it for less.

The MCP server is configured in `.mcp.json` and connects at launch. Run
`claude doctor` and read the per session token cost of a server nobody called.
Put that number on screen. To turn the server off for a session, launch with
`claude --strict-mcp-config`.

## Try next

- Add a `channels` subcommand. Write the test for its default output first, then
  the code. Notice which one was easier to write.
- Raise `MAX_DEFAULT_LINES` in `tests/board-cli.ts` from 15 to 200 and watch the
  suite stop protecting you. That constant is the whole contract.
- Point a subagent at `node tools/board.mjs list --json` and ask it for the three
  busiest channels. The 69,000 characters land in the subagent's window and one
  sentence comes back to yours.

## Half one: most tools do not need an MCP server

Reach for these in order. Stop at the first one that works.

| Reach for | When |
| --- | --- |
| Bash plus a script in the repository | Your own code in your own repository |
| A skill with a bundled script | The call needs procedure or context around it |
| A slash command with `!` injection | You invoke it, Claude does not |
| An MCP server | The tool leaves the repository. Remote systems, auth, or reuse across clients. |

### The same three operations, two ways

Measured with `wc -l`, and again with blank lines and comments stripped. The
CLI column is the finished tool. The file you start with is 113 lines, because
the output design is the part that is missing.

| | `tools/board.mjs` | `mcp/server.mjs` |
| --- | --- | --- |
| Lines in the file | 178 | 212 |
| Lines of code | 142 | 164 |
| Of which is protocol plumbing | 0 | 120 (43 schema, 77 JSON-RPC) |
| Shared core in `src/board-db.mjs` | 91 lines, used by both | same file |
| Process lifecycle | starts, answers, exits | starts with Claude Code, stays alive |
| Context cost when unused | zero | the `tools/list` payload, about 1,263 characters |
| Discoverable by a human | `--help` | needs a client |
| Works in a shell pipeline | yes | no |

The last two rows matter more than the line counts. A CLI is testable with
`spawnSync`, greppable, pipeable into `jq`, and runnable by the person reviewing
the pull request. An MCP tool is none of those things.

The context number is the one to take seriously. Every connected server ships
its tool list into every session whether or not a tool is called. Run
`claude doctor` to see the real per session cost on this machine.

### Where MCP earns its keep

Three cases, and they are real.

- **Hosted services.** GitHub, Sentry, Linear, a database behind a VPN. The
  tool needs credentials and a network client. A shell script would be a worse
  version of software someone already wrote.
- **Internal APIs shared across teams.** One server, many repositories. The
  alternative is the same script copied into nine places.
- **Anything you also want in Claude Desktop.** A CLI only exists where there is
  a shell. MCP is the portable answer.

The test is simple. If the tool leaves this repository, write a server. If it
lives here, write a script.

## Half two: output discipline

Facts to state plainly, because most people have never been told them.

- The Bash tool captures about 30,000 characters of output by default. Past that
  it keeps the head and the tail and drops the middle.
- `BASH_MAX_OUTPUT_LENGTH` raises the cap to at most 150,000. Treat it as a
  ceiling. There are open reports that large outputs get saved to a file and
  previewed anyway, so raising it does not fix the problem.
- The terminal folds long output behind a "ctrl+o to expand" line. That is only
  the display. The whole thing already went into context.
- Tool output is stored in the session file. It gets reloaded every time the
  session continues, so one noisy command is paid many times.
- One `curl` that returns 30,000 characters is roughly 8,000 tokens. Three of
  them force a compaction.

### The five rules, in order of payoff

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
other four ask a person or a model to remember something. Rule 1 changes what is
possible.

### The forcing function

`tests/output-discipline.test.ts` asserts that the default output of every
subcommand is under 15 lines, that none of them print JSON unasked, and that
`--json` still returns every row. `tests/hook-rule.test.ts` spawns the hook with
a JSON payload on stdin and checks the exit code, including ten commands that
must **not** be blocked. False positives are the failure mode that kills hooks.

## Files

| Path | Purpose |
| --- | --- |
| `tools/board.mjs` | The CLI. This is the file the prompt asks you to fix. |
| `tools/seed.mjs` | `npm run seed`. 320 deterministic messages. |
| `src/board-db.mjs` | Schema and queries. Shared by the CLI and the server. |
| `mcp/server.mjs` | The same three operations over MCP stdio, no SDK. |
| `.mcp.json` | Connects the server at launch, so `claude doctor` has something to report. |
| `.claude/skills/board/SKILL.md` | Points Claude at `--help` instead of listing flags. |
| `.claude/hooks/bash-output-guard.mjs` | Blocks the unbounded form of the command. |
