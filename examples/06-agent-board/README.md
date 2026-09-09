# 06-agent-board

Subagents. Four of them, dispatched in one fan out, each with its own model,
its own tools, and its own skills.

## What you will see

One prompt sends four named agents out at once, and four coloured lines come
back with the model, the elapsed time, and the token count for each. The files
they wrote turn a failing test suite green.

## How it works

`.claude/agents/` holds one markdown file per agent. Claude Code reads that
folder at launch. The frontmatter sets the model, the reasoning effort, the
tools, the skills to preload, and the permission mode. The body is that agent's
system prompt.

The `ts-conventions` skill bans the TypeScript `enum` keyword and asks for a
`const` object plus a union type under the same name, the same rule example 01
teaches. `erasableSyntaxOnly` in `tsconfig.json` enforces it mechanically, so
an agent that reaches for `enum` fails the typecheck.

The coloured line is not the model talking. `.claude/hooks/subagent-line.mjs`
runs on `SubagentStart` and `SubagentStop`, reads the numbers out of the session
transcript, prints the line, and appends a row to `TRANSCRIPT.md`. It costs zero
model tokens.

The database is PGlite, real Postgres compiled to WebAssembly, running inside
the Node process. `CREATE TYPE ... AS ENUM` works and `pg_enum` is there to read
back, with no Docker and no ports. The Express app takes the client as an
argument, so a test hands over its own.

Tests use an in memory database and throw it away. To keep one between runs and
poke at it, point `BOARD_DATA_DIR` at a folder. `npm run dev` defaults to
`.tmp/board`, which is gitignored.

Launch the session as Bill:

```bash
cd examples/06-agent-board
claude --model opus --effort low
```

## The prompt

```
The agent board needs its design artifacts. Fan out to all four subagents in
one turn. Send every Task in a single message so they run at the same time.

- copperhead writes `src/schema/messages.ts`
- cottonmouth writes `openapi/messages.openapi.json`
- black-mamba writes `src/routes/messages.ts`
- sidewinder reads those three files and writes `REVIEW.md`

Every one of those files already exists. Each agent carries its own
instructions, its own skills, and its own conventions. Give each agent its
output path and one sentence of context. Do not restate the field list, the
status codes, or the schema names.

Do none of this work yourself. Do not read the files first. Do not run the
tests, the Stop hook runs them once.

When all four return, print one table with agent, file, and line count. Then
stop.
```

## What to watch for

Cottonmouth ships with the description `Helps with API stuff.` Run the prompt
and Claude writes the OAS document itself in the main thread. Then run
`npm run sharpen`, which swaps that one line for `Writes OAS 3.1 specs. Use
PROACTIVELY when adding or changing endpoints.` Reset, run the same prompt, and
Cottonmouth gets the job. Nothing else about the agent changed. The description
is the trigger.

## Running it

1. Warm the machine first. Run `npm ci` and one throwaway run. A cold start
   distorts every measurement here.
2. Launch from inside this folder with `claude --model opus --effort low`.
3. Run `/start`. It resets the workspace first. Four coloured lines come back
   as the agents finish, one per agent, with the model and the token count.
4. When the run ends, read `RESULT.md`, then `git diff --stat`, then open
   `openapi/messages.openapi.json`.

`git diff --stat` needs the repository initialised. If it is not, skip it.
`RESULT.md` already carries the changed file count.

The final wording of the joke in the header is still open. See
`docs/decisions.md`.

What can go wrong. Claude sometimes dispatches the four agents over two turns,
which doubles the wall clock. A first line that lands alone is the lesson about
fan out. Sidewinder reads the three files while the other three are still
writing, so its review can name a file that was empty a second ago. That is the
price of a single fan out.

Fallback. `npm run solution -- 06` copies the finished files in.

## Try next

- Move Sidewinder to a second turn and time the difference. A real review costs
  you a full round trip.
- Drop Copperhead to `model: haiku` with `effort: low` and see if the schema
  still lands. Then push Cottonmouth down a tier and watch where it breaks.
- Delete the `skills:` lines from one agent and watch it search the workspace
  for the conventions it used to be handed.
- Launch with `claude --agent sidewinder` and try to get it to edit a file.

## The agents

Bill is the main session. Bill is an orchestrator, so Bill has no file.

| Agent | Role | Model | Effort | Skills |
| --- | --- | --- | --- | --- |
| Bill | orchestrator, the main session | opus | low | ts-conventions, api-design |
| Copperhead | schemas, DTO types, `pgEnum` | haiku | low | ts-conventions, json-schema |
| Cottonmouth | the OAS 3.1 document | sonnet | medium | oas-3-1, api-design |
| Black Mamba | route handlers | sonnet | low | express-conventions |
| Sidewinder | reviewer, read only tools | sonnet | low | ts-conventions |

Sidewinder has no Edit tool and no Bash tool. It holds Write so it can leave
`REVIEW.md`, and a `PreToolUse` hook declared in its own frontmatter blocks
every write whose target is not that file. Per agent hooks are shown on
Sidewinder only.

Each agent prints one line in character, under ten words, and then emits its
file. That limit is in the agent prompt on purpose. Personality is output
tokens and output tokens are wall clock time.

## Four ways to invoke an agent

1. **Automatic.** Claude reads the `description` field and decides. It is
   contextual and it misses often. This is the one the sharpen demo is about.
2. **Name it in a sentence.** "Have cottonmouth write the spec." Reliable.
3. **`@agent-cottonmouth`.** Guarantees which agent runs.
4. **`claude --agent sidewinder`, or the `agent` key in settings.** The whole
   session runs as that agent.

Worth stating plainly: `@agent-cottonmouth` controls WHICH agent runs. It does not
control the prompt that agent receives. Claude still writes the task prompt
itself, from your whole message. People assume the mention is a direct pipe
into the subagent. It is not.

## Speed, in order

1. **One fan out, no second round.** Dispatch every producer in a single turn,
   then assemble. Two sequential rounds doubles the wall clock.
2. **Orchestrator at `effort: low`.** Dispatch and assembly need no deep
   reasoning.
3. **Cap the output in every agent prompt.** "Emit the file only. No
   commentary." Give a number. Three endpoints of OAS 3.1 is about 140 lines of
   JSON, so the prompt says 140.
4. **Remove discovery work.** Exact paths in the prompt. `skills:` frontmatter
   preloads the conventions instead of letting Claude search for them. Tight
   `tools:` allowlists. The target files are pre created, so the work is an
   edit and never a search followed by a write.
5. **Push work down a tier.** Anything Haiku can do, Haiku does.
6. **No tests inside the agents.** The Stop hook runs the suite once at the end.
7. **Warm start.** Run `npm ci` and one throwaway run before a timed run.

## Unattended safety

- Every command the agents need is in `permissions.allow` in
  `.claude/settings.json`. One permission prompt stops the run.
- `permissionMode: acceptEdits` in each agent's frontmatter.
- Start the segment on a fresh session, so an auto compact does not fire in the
  middle of the run.
- The Stop hook writes `RESULT.md` and rings the terminal bell.
- When the run ends, three commands, in this order:

```bash
cat RESULT.md
git diff --stat
$EDITOR openapi/messages.openapi.json
```

- `git diff --stat` needs the repository initialised. If it is not, skip that
  beat. `RESULT.md` already carries the changed file count.
- If the run stalls: `npm run solution -- 06`.

## Verify before the talk

Checked against Claude Code 2.1.263. Confirm on the presentation version.

- Confirmed on 2.1.263: `name`, `description`, `model`, `effort`, `skills`,
  `tools`, `disallowedTools`, `permissionMode`, `hooks`, and `color` are all
  valid subagent frontmatter fields. `effort` takes `low`, `medium`, `high`,
  `xhigh`, `max`.
- Confirmed on 2.1.263: `SubagentStart` and `SubagentStop` are both real hook
  event names, and `--agent <name>` is a real CLI flag with a matching `agent`
  key in settings.
- Not confirmed: the `SubagentStop` payload documents `agent_type`, `agent_id`,
  and `last_assistant_message`, and no model, token, or duration fields. The
  hook derives those from the session transcript, so check that the coloured
  line still shows a model and a token count and does not print `unknown` or
  `?`. Run `npm run reset -- 06`, run the prompt, and look.
- Not confirmed: whether `npm run sharpen` is picked up without restarting the
  CLI. Claude Code reads `.claude/agents/` at launch. Run `/agents` after the
  swap. If Cottonmouth still reads "Helps with API stuff", restart the CLI.

## Measure this

Time the whole run, wall clock, ten times. Build the slide around the p90 and
never around the fastest run. The fastest run is the one you will not get on
stage. If the p90 will not fit under about 60 seconds, cut scope. Drop
Sidewinder first, then drop the `limit` parameter from the spec.

## Files

| Path | Purpose |
| --- | --- |
| `src/db/client.ts` | Builds a PGlite. Ships working. |
| `src/db/migrate.ts` | The table, the enum, and the `pg_enum` reader. Ships working. |
| `src/app.ts` | Express 5 skeleton. Takes the database as an argument. Ships working. |
| `src/schema/messages.ts` | Copperhead writes this. |
| `src/routes/messages.ts` | Black Mamba writes this. |
| `openapi/messages.openapi.json` | Cottonmouth writes this. |
| `REVIEW.md` | Sidewinder writes this. |
| `.claude/agents/*.md` | One file per agent. |
| `.claude/skills/*/SKILL.md` | Preloaded by the `skills:` frontmatter. |
| `.claude/hooks/subagent-line.mjs` | The coloured line and `TRANSCRIPT.md`. |
| `.claude/hooks/review-only.mjs` | Wired from Sidewinder's own frontmatter. |
| `tools/sharpen.mjs` | Swaps Cottonmouth's description. `npm run sharpen`. |
| `.solution/` | The fallback copy. `npm run solution -- 06`. |
