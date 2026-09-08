# 03-prompt-craft

Two skills that work on the conversation instead of on files. Take home. This
README is the whole lesson, no presenter needed.

## What you will see

Every other example in this repository ships a skill that edits code. These two
change no source file at all. They change the answer you get back.

Type something rough and `sharpen` fires on its own. It turns the request into a
five section checklist instead of starting the work. `concise` then rewrites
that checklist until it passes the same rules the CI linter enforces. You can
also call either one by hand, `/sharpen <text>` or `/concise <text>`.

## Run it

```
npm start
```

That resets the workspace and shows the starting state. One test fails.
`OUTPUT.md` ships as a copy of the rough request in `PROMPT.md`, so the checkers
report five missing sections.

Then launch Claude Code here and run the two halves back to back.

```
/before
```

That answers the same rough request with the skill switched off. `Skill` is
missing from the command's `allowed-tools`, so `sharpen` cannot fire, and the
command suspends the workspace rule that would have called it. You get a normal
prose write up in `OUTPUT.md`. The two checkers run over it and print what is
wrong, five sections missing. The Stop hook runs the suite and the line comes
back red.

```
/start
```

Same prompt, skill on. `sharpen` fires on its own, rewrites the request as the
five section block, checks the draft against both checkers, and writes the block
over `OUTPUT.md`. The Stop hook line comes back green and `npm test` shows 26
passed.

Two runs, one file, one pair of checkers. The difference on screen is the whole
lesson.

`/start` never asks you a question, and that is deliberate. `PROMPT.md` is
bloated, so the decision rule at the top of the skill says rewrite it. Run
`/rough` to see the other branch. That one sends a request too vague to answer,
so three questions come back instead of a block. Answer them and the block
follows.

## How it works

Six files carry the example.

| File | Job |
| --- | --- |
| `.claude/commands/before.md` | The same prompt with `Skill` left out of `allowed-tools`. The before half. |
| `.claude/skills/sharpen/SKILL.md` | Decision rule first. Ambiguous means ask, bloated means rewrite. |
| `.claude/skills/concise/SKILL.md` | The five writing rules and the banned phrase list. |
| `src/sharpen-check.ts` | Counts the five sections, looks for a testable success criterion, counts words. |
| `src/concise-check.ts` | Counts lines, measures the bullet ratio, matches the banned list. |
| `tests/output.test.ts` | Runs both checkers over `OUTPUT.md`. This is the red one. |

Claude Code lists every `SKILL.md` name and `description` at launch and loads
the body only when one looks relevant. The `description` is the trigger, which
is what example 06 takes apart in detail. Read those two description lines
first, they are doing the routing.

The `CLAUDE.md` in this folder backs the description up. It says a rough request
goes through `sharpen` first. Description matching alone fires most of the time.
The two together fire every time.

The `/sharpen` and `/concise` commands in `.claude/commands/` are three line
wrappers. They point at the skill and pass `$ARGUMENTS` through. `/rough` is the
same wrapper with the vague request in `fixtures/prompt-rough.txt` baked in.
`/before` is the odd one. It leaves `Skill` out of its `allowed-tools` so the
skill cannot fire at all.

Each skill ends the same way. Write the draft to `.tmp/draft.txt`, run
`npx tsx src/cli.ts sharpen .tmp/draft.txt`, fix what it names, answer only when
the command exits 0.

## What to watch for

The forcing function is structural lint, never a model as a judge. A judge would
score the same draft differently on two runs, and a rule you cannot reproduce is
not a rule. `sharpenCheck` and `conciseCheck` are plain functions over a string.
Same input, same findings, every time.

Watch the second thing too. The banned list in `src/concise-check.ts` matches
`scripts/lint-prose.mjs` at the repository root line for line. The skill is the
half that runs while the text is being written. The linter is the machine half
that gates CI. A test in `tests/concise-check.test.ts` reads the linter and
fails if the two lists drift apart.

Watch the third thing. `sharpen` runs `concise` over its own draft before it
answers, so a tight checklist written in bloated prose still fails. One skill
calls the other.

## Speaker notes

Run `/before` first, every time. On its own, `/start` prints a finished block
and the room has nothing to compare it to. `/before` gives them the comparison,
in the same file, judged by the same two checkers.

`.claude/settings.json` denies reads of `.solution/`. Without that line the
finished block sits in the workspace and the run can copy it.

The trap is editing `src/` to make the red test pass. The checkers are already
correct and their 25 tests prove it. The only file the run should touch is
`OUTPUT.md`.

The second trap is doing the work the prompt describes. `PROMPT.md` asks for
pagination on an orders endpoint. There is no orders endpoint in this workspace.
The job is to sharpen the request, not to satisfy it.

If the fixtures leave a rule ambiguous, the limits are named as exported
constants: 400 words, 40 lines, 70 percent bullets.

## Try next

- Run `/rough`, or `/sharpen make the orders endpoint faster`, and count the
  questions. The cap is three, asked once. Then run `/start` and watch the same
  skill skip the questions entirely.
- Open `.claude/commands/before.md` and read the `allowed-tools` line. That is
  the whole off switch. Drop `Skill` from any command and the skills stop
  firing inside it.
- Add a sixth rule to `concise`, such as a cap on sentence length. Add the
  fixture first, then the check.
- Delete the `description` line from `.claude/skills/sharpen/SKILL.md` and paste
  a rough request. The skill stops firing and Claude starts the work instead.
  Put it back.
