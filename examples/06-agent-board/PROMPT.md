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
