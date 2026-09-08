---
name: concise
description: Enforce the repository writing rules on any text before it is shown. No em dashes, no "not X, but Y", plain words, short sentences, no filler openers. Use when writing or editing a README, a comment, a commit message, a summary, or any prose that ships.
---

# concise

Five rules. They apply to every README, code comment, SKILL.md, commit message,
and chat answer that ships.

1. **No em dashes.** No en dashes either. Use a period, a comma, or parentheses.
2. **No "not X, but Y".** Say the thing directly. Drop the half that is wrong
   and keep the half that is right.
3. **Plain language.** Write "runs before the tool call" instead of "intercepts
   the invocation lifecycle". Assume the reader is skimming on a projector.
4. **Short sentences.** One idea each. Break a long one in two.
5. **No filler openers.** Start with the fact.

## The banned list

This list is a copy of the one in `scripts/lint-prose.mjs` at the repository
root. The linter gates CI. This skill catches the same thing while the text is
still being written. When one list changes, change the other.

```
em dash                     Use a period, a comma, or parentheses.
en dash                     Use a hyphen or the word "to".
it is worth noting          Delete it.
it's worth noting           Delete it.
Importantly (line opener)   Delete it.
it should be noted          Delete it.
needless to say             Delete it.
in today's world            Delete it.
delve into                  Use "look at" or "read".
leverage / leverages        Use "use".
at the end of the day       Delete it.
not X, but Y                Say the thing directly.
```

## Shape

Two more limits, so an answer stays an answer.

- 40 content lines. Past that, write a file and link to it.
- 70 percent bullets. A page of bullets is a list wearing a coat. Some of them
  are sentences.

Fenced code blocks do not count. Sample text can hold anything.

## Quoting a banned phrase on purpose

Put a marker on the line directly above it. In markdown:

```
<!-- prose-lint-ignore -->
The rule bans "delve into" everywhere.
```

In a source comment, use `// prose-lint-ignore`. The line below is a live
example, so the word survives the linter:

<!-- prose-lint-ignore -->
Never write "at the end of the day" in a README.

## Check your own work before you answer

Write the draft to `.tmp/draft.txt`, then run:

```
npx tsx src/cli.ts concise .tmp/draft.txt
```

It prints the line number for every hit and exits 1. Fix each one and run it
again. Return the text only after the command exits 0.

The checker is plain code in `src/concise-check.ts`. It holds the same banned
list, skips fenced blocks, and honors the ignore marker. No model grades this,
so the same draft gets the same answer every time.
