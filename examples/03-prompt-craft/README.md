# 03-prompt-craft

Two skills that work on the conversation instead of on files. Take home. This
README is the whole lesson, no walkthrough needed.

## What you will see

Every other example in this repository ships a skill that edits code. These two
change no source file at all. They change how the work starts and how the
answer comes back.

You type something vague. Instead of guessing and writing 200 lines, Claude
stops and asks three questions. You answer in one line. Back comes the request
you meant, in two sentences.

You already know what the other version looks like.

## Run it

Launch Claude Code here and run one command.

```
/start
```

That resets the workspace, then sends the request in `PROMPT.md`, exactly as
written:

```
make the orders list paginated somehow, it is slow right now and the frontend
team keeps complaining. thanks
```

The `sharpen` skill fires on its own. Nobody types its name. Back comes the
request as a receipt, then a picker with three questions in it:

```
You asked: make the orders list paginated somehow, it is slow right now and
the frontend team keeps complaining. thanks

  Page size        > Caller passes one     A limit argument, default 25.
                     Fixed at 25           The function decides.

  Paging style     > Cursor                Stays correct when rows move.
                     Offset and limit      Simple. Can repeat or skip rows.

  Response shape   > Rows plus next token  The caller knows when to stop.
                     Bare rows             The caller guesses.
```

The questions come from the `AskUserQuestion` tool, so they arrive as a picker
and not as text. Arrow keys and enter, or pick "Other" and type your own. Every
question carries that escape hatch and the tool adds it on its own.

The receipt line puts the vague request and the questions in one frame, which is
the whole comparison. It is the one restatement `concise` allows.

Pick an option in each. What comes back is two sentences naming the exact
change to `listOrders` in `src/orders.ts`. No file is written. The vague
request went in and a precise one came out, which is the only thing this
example makes.

## How it works

Four files carry the example.

| File | Job |
| --- | --- |
| `.claude/skills/sharpen/SKILL.md` | The decision rule. Vague means ask, clear means answer. Three questions, one turn, no second round. |
| `.claude/skills/concise/SKILL.md` | The writing rules, and the four things to cut from an answer. |
| `CLAUDE.md` | Says a vague request goes through `sharpen` first. Backs up the skill description. |
| `src/orders.ts` | 137 orders and a `listOrders()` that hands back all of them. Read only. It is what the questions point at. |

Claude Code lists every `SKILL.md` name and `description` at launch and loads
the body only when one looks relevant. The `description` is the trigger, which
is what example 06 takes apart in detail. Read those two description lines
first. They are doing the routing.

`CLAUDE.md` backs the description up. Description matching alone fires most of
the time. The two together fire every time.

## What to watch for

**The questions are the feature.** The default move is to guess and write code.
Three questions cost ten seconds and remove the rewrite. The cap matters as
much as the questions. Three, in one turn, then it commits. A skill that asks
five questions across three turns is worse than one that guesses.

**Nothing gets built.** There is no code to review here and no suite to run.
Strip the writing out and what is left is the part that decides whether the
code would have been right. That part fits in two sentences.

**The skill picks a path, and it can pick the other one.** Paste something
clear, such as `add a limit argument to listOrders that defaults to 25`, and it
skips the questions and answers. Vague is the trigger, questions are the
response.

**The answer is short because a rule says so.** No summary of the conversation,
no walk through code, no offer to iterate. `concise` names those four things
and cuts them.

## Try next

- Delete the `description` line from `.claude/skills/sharpen/SKILL.md` and send
  the same request. The skill stops firing and Claude starts guessing. Put it
  back.
- Change the cap in `sharpen` from three questions to one. Watch which question
  it keeps. That tells you which unknown it thinks is most expensive.
- Add a rule to `concise` that bans the word "comprehensive". Send a request
  that invites it.
- Send a request that is vague in a way the questions cannot fix, such as
  `make it better`. Watch what it asks.
- Answer the three questions a different way and read the two sentences again.
  That is the diff this example has instead of a diff.
