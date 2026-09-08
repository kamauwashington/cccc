---
name: sharpen
description: Turn a rough, vague, or bloated request into a five section checklist (goal, constraints, output format, success criteria, what to avoid). Use whenever a request arrives loose enough that a finished answer is hard to picture, and whenever the user asks to sharpen, tighten, clean up, or write up a prompt before running it.
---

# The decision rule, before anything else

Read the request once and pick one of two paths.

- **Ambiguous.** You cannot tell what a finished answer looks like. Ask.
- **Bloated.** You can tell what it wants, and it is buried in words. Rewrite it
  and do not ask.

When both look true, it is bloated. Rewrite.

## If you ask

Three questions, maximum. All three in one turn, as a numbered list. Nothing
else in that turn.

There is never a second round. When the answers come back, write the prompt with
what you have. Guess the rest and record the guess inside `Constraints`.

Ask first, check second. The checker run at the bottom of this file happens
after the answers arrive, never in the same turn as the questions.

## The output

One fenced block. Nothing before it and nothing after it. No greeting, no
summary of what you changed, no offer to iterate. This rule covers the text you
write. Tool calls are not text, so the checker runs below still happen.

The block holds these five headings, in this order, with content under each:

```
Goal: one sentence. What the finished work is.

Constraints:
- Anything that limits the solution. Files, versions, style, scope.

Output format: what comes back. A diff, a file, a table, a list.

Success criteria: how anyone checks it. Name a number, a command to run,
or a file path. "It works well" is not a criterion.

What to avoid:
- The wrong turns you can see coming.
```

Keep the whole block under 400 words. A longer prompt is a design document.

## Save a copy

The block is the answer, so it goes in the chat. Write the same block to
`OUTPUT.md` at the workspace root as the last thing you do. Write the five
sections only. No fence markers, no heading above them, no note about what
changed. `tests/output.test.ts` reads that file and runs both checkers over it.

## Check your own work before you answer

Write the draft to `.tmp/draft.txt`, then run both checks:

```
npx tsx src/cli.ts sharpen .tmp/draft.txt
npx tsx src/cli.ts concise .tmp/draft.txt
```

Each one prints findings and exits 1 when something is wrong. Fix what they name
and run them again. Return the block only after both exit 0.

`sharpen` counts the five sections, looks for a testable success criterion, and
counts words. `concise` applies the repository writing rules to the same text. A
sharpened prompt has to pass both, so a tight checklist written in bloated prose
still fails.

Both checkers are plain code in `src/`. No model grades this, so the same draft
gets the same answer every time.

## Worked example

Rough input:

```
make the orders endpoint paginated somehow, it is slow right now and the
frontend team keeps complaining
```

That one is ambiguous. Page size, cursor style, and response shape are all
unknown, so ask three questions. `fixtures/prompt-good.txt` shows what the
answer turns into.
