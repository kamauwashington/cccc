---
title: Your first session
section: Getting started with Claude
journey: true
order: 2
summary: Twenty minutes, one terminal, one real project. Install it, point it at code you already have, and spend the time finding out what the thing does before you trust it with work.
facts:
  Takes about | 20 minutes
  You need | a terminal, an account, and a project folder
  Verified against | `2.1.267`
  Terminal panes | two are real, the rest are [approximations](#/captures)
docs:
  Quickstart | quickstart
  Authentication | authentication
  Permission modes | permission-modes
  Interactive mode | interactive-mode
tabs:
  Install | Pick a channel
  First run | Open a project, then type one word | See which model you are on | Ask for something that reads a lot and says little
  Modes | Start in Auto and step down | How much you get asked
  Context and usage | See what you just spent | Check the meter | Wipe it and look again
  Subagents | Send three out at once
  Getting out | Stopping it | Leaving
  What breaks | What breaks
---

## Pick a channel

```switch
[macOS and Linux]
$ brew install --cask claude-code
[Windows]
> winget install Anthropic.ClaudeCode
[No package manager]
$ curl -fsSL https://claude.ai/install.sh | bash
```

```legend
Any platform | The installer script covers macOS, Linux and WSL, and needs nothing installed first.
Want a window | The Claude desktop app carries the same thing under its Code tab.
Check it took | `claude --version`
```

```callout Ask before you install on a work machine
Many organizations ship their own build, pin a version, or route billing
through a workspace account. Ask there first. The rest of this page still
applies either way.
```

## Open a project, then type one word

```term
$ cd ~/code/some-project
$ claude
```

```legend
Use a real project | Claude reads the folder you start it in. A blank directory gives it nothing to work with, and every step after this one depends on there being something to read.
Nothing to hand | `git clone https://github.com/kamauwashington/CCCC` then `cd CCCC` gives you one.
Size | Ten to twenty files is plenty. A huge repository makes the first run slow and the output hard to read.
```

```capture:startup
~ % claude

      Claude Code v2.1.267
      Opus 5 (1M context) with high effort · Claude Max
      ~/your-project

  › Try "how do I log an error?"

  ▸▸ auto mode on (shift+tab to cycle) · ← 1 agent
```

```legend
Line 1 | The version. Nothing on this page is true for every version, which is why it is pinned at the top.
Line 2 | The model, the effort level, and the account paying for the turn.
Line 3 | The folder you started in. That is the whole of what Claude can see.
Bottom bar | The permission mode. Step 3 is about that line.
```

```callout The first run signs you in
Your browser opens and you sign in there. If it does not open, press `c` to
copy the URL. If the browser hands you a code, paste it back at the prompt.
With `ANTHROPIC_API_KEY` set, sign in is skipped and you approve that key
instead.
```

## See which model you are on

```capture:model
  › /model

  Select model
  Switch between Claude models. Your pick becomes the default
  for new sessions.

  › 1. Default (recommended) ✓  Opus 5 with 1M context
    2. Opus (1M context)        Opus 5 with 1M context
    3. Fable                    Fable 5.1 · Most capable
    4. Sonnet                   Sonnet 5 · Efficient for routine tasks
    5. Haiku                    Haiku 4.5 · Fastest for quick answers

  ● High effort (default) ←/→ to adjust

  Enter to set as default · s to use this session only · Esc to cancel
```

```legend
Enter | Sets your pick as the default for new sessions.
s | Uses it for this session only.
← and → | Move the effort slider, which is separate from the model.
```

## Ask for something that reads a lot and says little

```term
> Read every file in this folder and tell me in one sentence
  what this project is for.

  ● Read README.md (214 lines)
  ● Read package.json (38 lines)
  ● Read src/index.ts (402 lines)
  ● Read ... 11 more files

  It is a command line tool that turns changelogs into release notes.
```

```legend
Went in | Fourteen files. Several thousand lines.
Came out | One sentence.
The lesson | You pay for the reading, not the answer. A short reply is no evidence that a turn was cheap.
Next step | Shows you that number.
```

## Start in Auto and step down

```term
  ▸▸ auto mode on (shift+tab to cycle)
  ▸  plan mode on (shift+tab to cycle)
  ▸  accept edits on (shift+tab to cycle)
  ▹  manual · asks before every change
```

```legend
Do this now | Start in Auto, watch what it reaches for, then keep pressing `Shift` and `Tab` down to Manual and feel how often it stops.
```

## How much you get asked

Press `Shift` and `Tab` together to cycle. The bottom bar always names where
you are.

| In the picker | In settings | What it does |
| --- | --- | --- |
| Manual | `default` | Asks before anything that changes a file or runs a command |
| Edit automatically | `acceptEdits` | Edits files without asking, still asks for the rest |
| Plan | `plan` | Works out an approach and shows it before touching anything |
| Auto | `auto` | Gets on with it, with background safety checks |

```callout Two more that are deliberately off the cycle
`dontAsk` allows only what you have already approved. `bypassPermissions`
checks nothing. Both are set with `--permission-mode` at launch, so nobody
lands in them by pressing a key twice.
```

## See what you just spent

```capture:context
  › /context
  ⎿  Context Usage

     ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁   Opus 5 (1M context)
     ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   claude-opus-5[1m]
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   126.8k/1m tokens (12.7%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   Estimated usage by category
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛁ System prompt: 3.4k (0.3%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛁ System tools: 22.9k (2.3%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛁ Skills: 2.8k (0.3%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛁ Messages: 96.7k (9.7%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛶ Free space: 840.2k (84.0%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛝ ⛝ ⛝ ⛝ ⛝   ⛝ Autocompact buffer: 33k (3.3%)
```

```legend
The grid | One cell per slice of the window. Filled is spent, hollow is free, and the tail is the buffer kept back for auto-compaction.
Messages | Everything the conversation has accumulated, and that is where the files you just read landed. It went from nothing to 96.7k in one turn.
Why it matters | When the window fills, the model stops being able to see the thing you are asking about.
```

## Check the meter

```capture:usage
  Settings  Status  Config  [ Usage ]  Stats

  Current session
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 3% used
  Resets 9:20am

  Current week (all models)
  ██████████████████████████░░░░░░░░░░░░░░ 65% used
  Resets Sep 13 at 5pm

  Current week (Fable)
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0% used
  Resets Sep 13 at 5pm

  What's contributing to your limits usage?
  Approximate, based on local sessions on this machine — does not
  include other devices or claude.ai

  53% of your usage was while 4+ sessions ran in parallel
   All sessions share one limit. If you don't need them all at
   once, queueing uses it more evenly.

  12% of your usage was at >150k context
   Longer sessions are more expensive even when cached. /compact
   mid-task, /clear when switching to new tasks.

  Skills            % of usage      Subagents      % of usage
  /start                    3%      start                  2%
  /reset                    3%
  /sharpen                  1%

  d to day · w to week · Esc to cancel
```

```legend
`/context` | This conversation. Can the model still see what it needs?
`/usage` | Your account. How close are you to the ceiling, and what put you there.
Three ceilings | A session window, a weekly allowance across all models, and a separate weekly one for Fable.
Keep these two | Parallel sessions all draw on the same limit, and long context costs more per turn even when it is cached.
```

## Wipe it and look again

```capture:clear-context
  › /clear
  › /context
  ⎿  Context Usage

     ⛁ ⛁ ⛁ ⛁ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   Opus 5 (1M context)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   claude-opus-5[1m]
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   30.1k/1m tokens (3%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   Estimated usage by category
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛁ System prompt: 3.4k (0.3%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛁ System tools: 22.9k (2.3%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛁ Skills: 2.8k (0.3%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛁ Messages: 8 tokens (0.0%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   ⛶ Free space: 936.9k (93.7%)
     ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛝ ⛝ ⛝ ⛝ ⛝   ⛝ Autocompact buffer: 33k (3.3%)
```

```legend
Messages | Eight tokens. Everything that prompt read is gone, and the window is back to the prompt, the tools and the skills.
`/compact` | The gentler version. Summarises the conversation instead of dropping it.
`/rewind` | Goes backwards, rolling code and conversation together to an earlier point.
```

## Send three out at once

Still in the project you opened in step 2. A subagent gets its own context
window, and only its summary comes back to yours.

```capture:fanout
  › Using three subagents in parallel, have one summarise the README,
    one list the dependencies, and one count the files by type. Then
    give me a single table of what they found.

  ▸▸ auto mode on (shift+tab to cycle) · ← 1 agent · ↓ to manage

  ● main
  ○ general-purpose  Summarize the README    10s · ↓ 24.3k tokens
  ○ general-purpose  List dependencies        7s · ↓ 26.1k tokens
  ○ general-purpose  Count files by type      5s · ↓ 24.1k tokens
```

```legend
Where | The same project. The three of them need a README and a package file to go at, which is why step 2 said not to use a blank directory.
Went out | 74.5k tokens of reading, in three context windows that are not yours.
Came back | One table. Your `/context` grows by the table, not by the reading.
Press ↓ | Opens the agent manager, which is where those three lines come from.
The catch | Asking plainly is a request, not a guarantee. Claude may decide to do the work itself in one thread. `/subtask` spawns one for certain, and named agents in `.claude/agents/` are the reliable version — see [Subagents](#/subagents).
```

## Stopping it

The habit from every other terminal program is wrong here.

| Key | What it does |
| --- | --- |
| `Esc` | Stops the response in flight. Whatever it already did is kept. |
| `Ctrl` and `C` | Interrupts a running operation. With nothing running it clears what you have typed. |
| `Ctrl` and `C` twice | Quits. |
| `Esc` twice | Opens rewind, on an empty prompt. |

```callout Read the first two rows again
`Ctrl` and `C` is not how you stop an answer you regret. `Esc` is.
```

## Leaving

```term
> /exit
```

```legend
Also | `Ctrl` and `D` twice.
Nothing is lost | A session can be picked up again, and `/rewind` reaches back into one you are still inside.
```

## What breaks

- **Starting in an empty folder.** Claude reads the directory you launch it
  in. With nothing there, every prompt on this page has nothing to work with.
- **Running four sessions at once to go faster.** They all draw on one
  weekly limit, and `/usage` will tell you how much of yours went that way.
- **Reading a short answer as a cheap turn.** The reading is the cost. Run
  `/context` after a big exploration and the grid says so.
- **Reaching for `Ctrl` and `C` to stop a response.** It clears your input
  instead, and a second press quits the session.
- **Staying in Auto on a repository that matters.** Auto is for finding out
  what the tool does. Step down before you point it at work you care about.
- **Expecting a plain prompt to fan out.** Three subagents in parallel is a
  request. A named agent, or `/subtask`, is the version that holds.
- **Installing on a work machine without asking.** Many organizations pin a
  version or route billing through a workspace account.
