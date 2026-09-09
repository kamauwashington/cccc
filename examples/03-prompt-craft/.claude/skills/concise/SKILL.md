---
name: concise
description: Enforce the repository writing rules on any text before it is shown. No em dashes, no "not X, but Y", plain words, short sentences, no filler openers. Work to be done ships under a "The Plan" heading with an estimate per bullet. Use when writing or editing a README, a comment, a commit message, a summary, or any answer that ships.
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

## The Plan block

An answer that says what will be built ships under one heading, so it reads as
a deliverable instead of more chat.

```
## The Plan 🚀
```

The heading and the rocket stay the same every time. That is what makes the
answer findable in a scrollback.

Under it, one bullet per piece of work.

- Say what changes. Name the file, the type, or the function it touches.
- End with a rough estimate. `~15 min` is enough. Round to five minutes.
- Three to seven bullets. Merge the small ones.

Then one line for the defaults you picked. Then one line for anything you did
not do, and why.

## What to cut first

These four eat most of the length in a normal answer.

- The restatement of what was asked.
- A walk through code that is already on screen.
- A list of the options you considered and rejected.
- The offer to keep going.

A one line `You asked:` receipt is the exception. It quotes the request before
you challenge it, so it earns its line. A paragraph explaining the request back
to the person who wrote it does not.

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
