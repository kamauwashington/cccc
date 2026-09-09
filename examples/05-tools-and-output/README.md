# 05-tools-and-output

A tool is a script in your project. That is the whole example. There are
three of them here, one per question.

## What you will see

You type a question. Claude runs `tools/board.mjs`, reads what it printed, and
answers. No server is running. There is no MCP config, no protocol, and no
plugin. The tool is 120 lines of plain Node in this folder.

## Run it

Launch Claude Code here. The whole run is three commands in order, one per
question. Start with the first.

```
/start
/followup-1
/followup-2
```

`/start` resets the workspace, shows the starting state, then sends the
question in `PROMPT.md`:

```
What is on the board right now, and which channel is busiest?
```

Claude runs the tool. You see the call happen:

```
node tools/board.mjs stats

board  320 messages  6 channels  newest 2026-08-22

  deploys       59
  general       57
  incidents     57
  support       54
  random        51
  hiring        42
```

Then it answers in a sentence. 320 messages sat in `data/board.json` the whole
time and none of them entered the conversation.

## The format is the point

Every command prints the same three part shape.

```
line 1   the headline. What was asked, and how many matched.
line 2   blank
rest     fixed width rows, newest first
```

```
board list  channel=deploys  showing 3 of 59

  #317    2026-08-22  deploys     chen      the rate limiter is green again...
  #313    2026-08-22  deploys     bo        the search index needs a second...
  #303    2026-08-21  deploys     dara      the nightly backup needs a seco...
```

The headline carries the count, so nothing has to be recounted. The rows carry
the detail. You designed that shape, so you decided what Claude sees.

Try the other two:

```
node tools/board.mjs list --channel incidents --limit 3
node tools/board.mjs search backup --limit 3
```

To run the example a second time, `/reset` and then `/clear`, so the
conversation forgets the previous attempt. `/start` refuses to re-run into a
session that already holds one.

## Ask two more

Same session, no reset needed. Two more commands, one per question:

```
/followup-1
/followup-2
```

They send these, word for word:

```
Who posts the most here, and what do they spend their time on?
Has the board cooled off, or is it still busy?
```

Type the questions yourself instead if you prefer. The commands only save the
typing, and neither of them names a tool.

Neither one reaches for `board.mjs`. The first hits `tools/people.mjs`:

```
node tools/people.mjs top --limit 4

board people  all channels  8 authors  320 messages  showing 4 of 8

  chen        48   support 10  deploys 9  hiring 9
  dara        44   deploys 9  support 9  general 8
  alice       43   random 14  general 10  incidents 8
  eli         42   general 8  incidents 8  hiring 7
```

The second hits `tools/activity.mjs`:

```
node tools/activity.mjs weeks

board activity  by=week  all channels  320 messages  showing 4 of 4 weeks

  2026-08-17    88  ####################      partial
  2026-08-10   103  ########################
  2026-08-03   104  ########################
  2026-07-27    25  ######                    partial
```

Each command allows all three scripts, so the pick is still Claude's. What
maps the question to the tool is the table in `CLAUDE.md`, not the command.

Three questions, three scripts, same 320 rows, same three part shape. Nothing
changed except what got summarised. That is the move to copy: when a new
question needs a different summary, write a second script rather than widening
the first one until it prints everything.

Note the `partial` marks. The board only spans 22 days, so the weeks at each
end are stubs. Without that word the bottom row reads as a quiet week, and
Claude would have no way to know better. Say what the number does not cover.

## How it works

Five files, and that is the entire setup. The last two rows are the whole
cost of the two extra questions.

| File | Job |
| --- | --- |
| `tools/board.mjs` | What is on the board. Reads `data/board.json`, prints the format. |
| `tools/people.mjs` | Who is posting. Same data, summarised by author. |
| `tools/activity.mjs` | When it was busy. Same data, summarised by week or day. |
| `CLAUDE.md` | Maps each question to its tool, and says never to read the JSON. |
| `.claude/settings.json` | Allows `Bash(node tools/*.mjs:*)` per tool and denies reads of `data/`. |

Copy that pattern for any script you already have. A tool is a script, a line
in `CLAUDE.md`, and an allow rule. Adding the second and third tool here cost
exactly those three things each.

## What to watch for

**Nothing is running.** People assume a tool means a server or an MCP endpoint.
Ask the room what is listening on a port here. Nothing is.

**The deny rule does the teaching.** `Read(./data/**)` is in
`.claude/settings.json`. Without it, reading the JSON is the path of least
resistance and 320 rows land in the transcript.

**The output is a design decision.** Print everything and every call costs
thousands of tokens. Print a headline and five rows and the same question gets
answered for a fraction of that. The full data never went anywhere.

## Try next

- Delete the rule from `CLAUDE.md` and ask again. Watch what it reaches for.
- Add a `--json` flag that prints the raw rows, then ask a question that needs
  it. Two shapes, one tool, the caller picks.
- Ask something none of the three answer, like "who replied to chen". Watch it
  pick the closest tool and tell you what it cannot see. A missing summary is a
  script you have not written yet.
- Point the same pattern at a script you already have at work.
