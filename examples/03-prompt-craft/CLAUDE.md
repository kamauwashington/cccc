# 03-prompt-craft

Two skills that work on the conversation instead of on files.

## Rules for this workspace

- A request that arrives vague goes through the `sharpen` skill first. Open
  with a one line `You asked:` receipt that quotes the request word for word,
  then ask up to three questions with the `AskUserQuestion` tool and stop
  there. Do not write the questions out as a numbered list. Do not guess and do
  not start the work.
- Once the answers are in, build the smallest thing that satisfies them. One
  file is usually enough.
- Run the `concise` skill over the answer before it goes out. What you built,
  in a sentence or two. No restatement, no walk through the code.
- `src/orders.ts` is the only file this example asks you to change.
- Run `npm run typecheck` and `npm test` to check your work.
- Never edit anything under `.pristine/`. That is the reset snapshot.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one. It is set in `.claude/settings.local.json`.
