# 05-tools-and-output

A message board CLI, an MCP server that does the same three things, and a hook
that blocks the noisy form of the command.

## Output discipline, in order of payoff

1. Design the output of any tool in this repository. A CLI prints three lines
   by default. Everything else sits behind `--json` or `--verbose`.
2. Filter in the shell before the output exists. `curl -s`,
   `git status --porcelain`, `npm test -- --reporter=dot`, `jq -r`,
   `2>/dev/null`, `| head -20`.
3. Redirect to a file and read a slice of it.
   `cmd > /tmp/out.json 2>&1 && jq '.summary' /tmp/out.json`. The full output
   is still there if you need it.
4. Ask for the exit code when that is all that matters.
   `npm test > /dev/null 2>&1 && echo PASS || echo FAIL`.
5. Send noisy work to a subagent. A subagent has its own context window and
   only its summary comes back. That is the right answer for reading logs and
   for triaging test failures.

## Rules for this workspace

- `tools/board.mjs` is the tool. Run `node tools/board.mjs --help` to learn it.
- The board seeds itself on first open. `npm run seed` wipes and refills it.
- Run `npm run typecheck` and `npm test` to check your work.
- `tests/output-discipline.test.ts` sets the contract. Default output stays
  under 15 lines per subcommand and `--json` stays opt in.
- Never edit anything under `.pristine/`. That is the reset snapshot.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one. It is set in `.claude/settings.local.json`.
