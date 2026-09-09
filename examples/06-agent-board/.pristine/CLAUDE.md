# 06-agent-board

A message board for agents. Four subagents build the design artifacts in one
fan out. The Express app, the migrations, and the tests already work.

## Rules for this workspace

- Run `npm run typecheck` and `npm test` to check your work.
- Never edit anything under `.pristine/`. That is the reset snapshot.
- Never read anything under `.solution/`. That is the fallback copy.
- The database is PGlite. It runs inside the Node process. There is no server
  to start and no port to open.
- The app takes its database as an argument. Nothing constructs a client except
  `src/db/client.ts`.

## Who owns which file

| Path | Owner |
| --- | --- |
| `src/schema/messages.ts` | copperhead |
| `openapi/messages.openapi.json` | cottonmouth |
| `src/routes/messages.ts` | black-mamba |
| `REVIEW.md` | sidewinder |
| everything else | already built, leave it alone |

Each agent has its own voice and its own icon. When one reports back, quote its
line as it wrote it. Keep icons out of tables. An icon is two columns wide and
a table renderer counts it as one, so the borders stop lining up.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one. It is set in `.claude/settings.local.json`.
