# 07-commands

A command is something you invoke by name. A skill is something Claude reaches
for on its own. That is the whole difference.

## What you will see

Three commands run against a 50 issue backlog for an order processing service.
`/grab:next` hands you the same six issues every time. `/grab:complex` offers
three complex issues to choose between. `/grab:up-for-grabs` lists the work
anyone can pick up. All three end in a picker you can tick more than one box in.

There is nothing to set up. The backlog ships ready in `data/issues.json`,
nothing generates or seeds it, and nobody fixes anything here. Launch Claude
Code in this folder and run a command. That is the whole example.

## How it works

A markdown file under `.claude/commands/` becomes a slash command named after
the file. Claude Code finds it at launch and lists it in the `/` menu.

A subdirectory becomes a prefix. `.claude/commands/grab/next.md` is
`/grab:next`. That is why the three group together in the menu.

Four mechanisms are spread across those files.

- A line starting with `!` and holding a backtick command runs in the shell
  before Claude reads the prompt. Its output is pasted in place. The model never
  chooses to run it and never sees a version without it.
- `$1` is the first argument. `$ARGUMENTS` is everything typed after the command
  name. `/grab:up-for-grabs payments` sets `$1` to `payments`.
- Frontmatter carries `description`, `argument-hint`, `allowed-tools`, and
  `model`. `argument-hint` is what the `/` menu shows after the name. All three
  commands pin `model: sonnet`, because the script already did the thinking and
  the model is only rendering a picker.
- `allowed-tools` on all three includes `AskUserQuestion`, so a command can put
  a picker on screen.

The injection line in `next.md` is this:

```
!`node tools/issues.mjs next`
```

`tools/issues.mjs` reads `data/issues.json` and prints fixed width rows. The
selection lives in that script, so it happens before the model reads a token.
Three quick, two mid, one complex, lowest issue number first.

`data/issues.json` is denied to the Read tool in `.claude/settings.json`. Without
that rule, reading the raw JSON is the cheapest path and 50 issues land in the
transcript.

### The picker

Every grab command ends the same way. The script narrows 50 issues down to a
handful, and the model turns that handful into an `AskUserQuestion` call. The
command file says what the options are, what the labels and descriptions hold,
and that the question is multi select:

```
- Multi select. Set `multiSelect` to true, and phrase the question in the
  plural.
```

`multiSelect` is what lets you tick more than one box. A real morning is rarely
one issue, and a picker that stops at one forces a second round trip. The
command file is where that decision lives, so changing one line changes the
picker for good.

## Doing this against GitHub

`data/issues.json` is a stand in for a real tracker. These examples ship without
their own git repository, because an embedded repository makes the parent
repository stop tracking the folder. So the backlog lives in a file.

The commands do not change when the backlog is real. Only the source of the
rows changes.

### Before you start

Install the GitHub CLI and confirm it is authenticated against the repository
you want issues from:

```
gh auth status
gh issue list --state open --limit 5
```

If the second command prints rows, the injection line will print the same rows.
Run it from inside the repository, or add `--repo owner/name` to every call.

### Route one, no script at all

`gh` already filters, so the injection line does the whole job. Copy
`up-for-grabs.md` into your own repository and replace the injection line:

```
!`gh issue list --state open --label "help wanted" --limit 20`
```

Add `Bash(gh issue list:*)` to `allowed-tools` in the frontmatter:

```
---
description: List the issues anyone on the team can pick up
allowed-tools: Bash(gh issue list:*), AskUserQuestion
model: sonnet
---
```

Then add the same string to the `allow` list in `.claude/settings.json`, so the
command runs without a permission prompt in front of an audience:

```json
{
  "permissions": {
    "allow": ["Bash(gh issue list:*)"]
  }
}
```

The prompt below the injection line does not change at all. It still says one
option per issue, `multiSelect` true, print what was picked and stop.

To take the area argument with you, keep `argument-hint: [area]` and pass `$1`
through to a label or an assignee filter:

```
!`gh issue list --state open --label "$1" --limit 20`
```

### Route two, keep the script

Use this when the picking rule is more than a label filter. `/grab:next` mixes
three tiers into one list, and `gh` cannot express that in a single call.

`tools/issues.mjs` only needs a different `load()`. This:

```js
const issues = JSON.parse(fs.readFileSync(DATA, 'utf8'));
```

becomes this:

```js
const issues = JSON.parse(
  execFileSync('gh', ['issue', 'list', '--state', 'open', '--limit', '100',
    '--json', 'number,title,state,labels'], { encoding: 'utf8' })
);
```

Two details to get right after that.

- `gh --json` gives you `labels` as an array of objects, not strings. Map it to
  `i.labels = raw.labels.map((l) => l.name)` before anything else reads it.
- Tiers come from labels. `size/S`, `size/M`, and `size/L` is one common set.
  Derive `i.tier` from those where the script currently reads the field, and
  decide what an unlabelled issue counts as rather than letting it vanish.

There is no `area` field on a GitHub issue. Use a label prefix like
`area/payments`, or drop the column and the `/grab:up-for-grabs [area]`
argument with it.

The same swap works for GitLab with `glab issue list --output json`, and for
Jira with its CLI. The command file is the part that stays put.

## The prompt

```
/grab:next
```

## What to watch for

Run `/grab:next` twice. Six issues, the same six, in the same order. The rows
are identical because the shell output is fixed before the model starts.

Then ask for the same thing in plain English: "grab me a few issues to work on
today." Claude picks its own number, its own mix, and its own ordering, and it
picks differently the next time you ask.

Repeatability is the reason to write a command.

`npm test` holds that claim to code. `tests/issues.test.ts` renders `next`
twenty times and asserts the bytes never move.

## Running it

1. Launch Claude Code from inside this folder and run `/grab:next`. Nothing has
   to be seeded or reset first.
2. Tick more than one box in each question. The command prints every issue you
   picked and stops. Nothing is assigned.
3. Run `/grab:next` again and compare the two lists. Same six, same order.
4. Open the `/` menu. The three `grab:` commands group under one prefix, and
   `argument-hint` sits next to `/grab:up-for-grabs`.
5. Run `/grab:complex` to see the same picker over a different slice.
6. Run `/grab:up-for-grabs payments` to see `$1` reach the shell command.

Commands and skills get mixed up constantly. A command is invoked. A skill is
chosen. That one sentence is the whole example.

## Try next

- Add `.claude/commands/grab/mine.md` and watch it appear as `/grab:mine`. One
  file, one new command, no restart.
- Change the mix in `tools/issues.mjs` from three quick to five and rerun
  `/grab:next`. The command file does not change. The answer does.
- Flip `multiSelect` back to single select in one command file and run it. The
  picker changes shape, and no code changed.
- Drop `argument-hint` from `up-for-grabs.md` and open the `/` menu again. The
  hint is the only thing telling a user the command takes an area.
- Point `up-for-grabs.md` at `gh issue list` in a repository you own, following
  route one above. The command file barely changes.
