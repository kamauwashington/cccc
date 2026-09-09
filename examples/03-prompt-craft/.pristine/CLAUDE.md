# 03-prompt-craft

Two skills that work on the conversation instead of on files.

## Rules for this workspace

- A request that arrives vague goes through the `sharpen` skill first. Open
  with a one line `You asked:` receipt that quotes the request word for word,
  then ask up to three questions with the `AskUserQuestion` tool and stop
  there. Do not write the questions out as a numbered list. Do not guess and do
  not start the work.
- Once the answers are in, say what you would build. One or two sentences,
  precise enough to hand to someone else. Write no files.
- Run the `concise` skill over the answer before it goes out. No restatement,
  no walk through code.
- `src/orders.ts` is read only. It is the thing the questions point at, and
  nothing in this example edits it.
- Nothing to run here. There are no tests and no typecheck. The answer is the
  whole deliverable.
- Never edit anything under `.pristine/`. That is the reset snapshot.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one. It is set in `.claude/settings.local.json`.
