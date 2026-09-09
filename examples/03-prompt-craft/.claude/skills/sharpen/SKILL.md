---
name: sharpen
description: Ask before building when a request is too vague to act on. Use whenever a request arrives loose, rough, or underspecified, so that a finished answer is hard to picture. Ask up to three questions, wait for the answers, then build the smallest thing that satisfies them.
---

# The decision rule, before anything else

Read the request once and pick one of two paths.

- **Vague.** You cannot picture what a finished answer looks like. Ask.
- **Clear enough.** You can picture it. Build it. Do not ask.

When you are on the fence, ask. A wrong guess costs more than a question.

## If you ask

Open with the request itself, on one line:

```
You asked: <the request, word for word>
```

That line is a receipt. It puts the request and the questions in one frame, so
the person can see what you heard. Quote it exactly. Do not tidy it up, do not
fix the spelling, and do not summarize it.

Then ask with the `AskUserQuestion` tool. Do not write the questions out as a
numbered list in your reply. The tool draws a picker, so the answer is two
keystrokes instead of a paragraph, and it always carries an "Other" row for
typing something you did not offer.

Three questions, maximum. All of them in one `AskUserQuestion` call, never one
call after another. Nothing else in that turn, and no first draft of the answer.

Each question needs:

- A `header` of twelve characters or less. It shows as a chip, so `Storage`
  works and `Where should this get stored` does not.
- Two to four `options`. Name the real choices. Skip the option nobody picks.
- A `label` of one to five words, and a `description` that names the trade off.
  The description is what makes the pick obvious to someone who has not thought
  about it yet.

Never add an "Other" option yourself. The tool adds one.

Ask about what changes the shape of the code. Skip anything you can pick
yourself and mention later.

The shape, on an unrelated request. Someone asks you to clean up old records:

```
header: Delete style
  Soft delete        Flag the rows and keep them. Reversible.
  Hard delete        Remove them. Frees space, no undo.

header: Trigger
  On a schedule      A nightly job. Nobody has to remember it.
  On demand          A command someone runs. Predictable timing.

header: Cutoff
  Fixed at 90 days   One rule, nothing to configure.
  Caller passes it   An argument, defaulting to 90 days.
```

Three unknowns, each one changing what gets written. None of them is a question
you could answer yourself and mention later.

There is never a second round. When the answers come back, build with what you
have. Pick the rest yourself and say which defaults you took.

## Then build

Build the smallest thing that satisfies the answers. One file when one file
does it. No new dependencies, no config, no scaffolding for a future request.

Leave the rest of the workspace alone.

## The answer

Short. What you built, in one or two sentences, and any default you picked that
the questions did not cover. Run the `concise` skill over it before it goes out.

Do not restate the code. It is on screen already. Do not offer to iterate, do
not list what you considered, and do not summarize the conversation.
