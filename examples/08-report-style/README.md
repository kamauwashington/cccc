# 08-report-style

Every other example changes what Claude does. This one changes how Claude
hands the work back.

## What you will see

A workspace where Claude ends every code turn with the same five headings,
because `.claude/output-styles/report.md` is switched on. You never ask for
the format. It arrives with the first answer and it is still there on the
twentieth.

## The five headings

```
Done.          What changed. One line per unit of work.
Works.         What is green and verified, with the number.
Doesn't work.  What is out of scope, unproven, blocked, or missing.
Fixed.         Yes or no, per item. Never imply a partial fix.
Suggestions.   What to do next. One line each.
```

Two rules carry most of the weight.

**Drop any heading that has nothing under it.** A heading followed by
"nothing" is worse than no heading. A clean run reports Done and Works, and
that is a complete report.

**"Doesn't work" is about limits.** It is the place for the case you did not
cover, the caller you left alone, the thing that will surface again next pass.
A report that says "Works. 18 tests pass" and then "Doesn't work. It does not
compile" is arguing with itself. If the build is broken, that belongs under
Works, as the number that is red.

## How it works

`.claude/output-styles/report.md` is the whole feature. Frontmatter carries a
`name` and a `description`. The body augments the system prompt, so it applies
to every turn in the session without being repeated in the conversation.

`.claude/settings.json` sets `"outputStyle": "report"`, which is why the style
is already on when you launch. `/output-style` switches it in session and
writes the choice back to settings. A style file in `~/.claude/output-styles/`
is available in every project. One in `.claude/output-styles/` belongs to the
project, which is what this workspace uses.

## The prompt

```
Implement src/report-check.ts so that npm test passes.
```

`src/report-check.ts` is a stub that throws. Finished, it takes a report as a
string and answers whether the report followed the contract. Seven passes:
preamble, per section rules, heading order, missing Done, evidence, and
length. 23 tests, and 21 of them start red.

The exercise and the style are the same contract, written twice. The style
asks a model for it. The checker proves it.

## What to watch for

Run these yourself, in this order.

1. Launch Claude Code here and ask anything about the code. The five headings
   show up with no instruction from you.
2. Run `/output-style default` and ask the same question. Prose comes back.
3. Run `/output-style report` and ask again. The headings return.
4. Ask a documentation question, such as "what does the README say the prompt
   is". The style says it does not apply to prose, so a sentence comes back
   instead of five headings. Watch whether that holds.

Step 4 is the honest part of this example. A style shapes output. It does not
enforce output. The model follows it most of the time and drifts on the edges,
which is why the checker exists as code and not as a second paragraph of
instructions.

## Speaker notes

The comparison to draw on screen.

| Reach for | When | Applies to |
| --- | --- | --- |
| An output style | Change the shape of every answer | Every turn in the session |
| `CLAUDE.md` | Facts and rules about this repository | Every turn, mixed with everything else |
| A skill | Procedure for one kind of task | Loaded when the task matches |
| A slash command | Something you invoke by name | The turn you invoke it |

The style and `CLAUDE.md` both land in front of the model on every turn. The
difference is switchability. `/output-style default` turns this off for one
question and back on for the next. Editing `CLAUDE.md` mid session does not
work that way.

If `/output-style` is missing on the machine, check the version. This was
built against 2.1.263 and the setting is `outputStyle` in
`.claude/settings.json` either way.

## Try next

- Write a second style called `terse` that answers in one line and no
  headings. Switch between them mid conversation and watch how much of the
  answer was format all along.
- Delete the "drop any empty heading" rule from the style, then ask for a
  report on a clean run. Count how often "Doesn't work. Nothing." comes back.
  That one line is why the rule is in there.
- Point the checker at a real answer. Copy a report Claude gave you into
  `.tmp/report.txt` and run it through `reportCheck`. The findings are the
  gap between the style and what arrived.
- Move the style file to `~/.claude/output-styles/` and launch from a
  different project. The report follows you.

## Files

| Path | Purpose |
| --- | --- |
| `.claude/output-styles/report.md` | The style. This is the feature. |
| `.claude/settings.json` | Sets `outputStyle` to `report`. |
| `CLAUDE.md` | The same contract as workspace context. |
| `src/report-check.ts` | The stub the prompt asks you to write. |
| `tests/report-check.test.ts` | 23 tests. The last three compare the checker against the shipped style. |
| `fixtures/report-good-*.txt` | Reports that pass, including one with all five headings filled. |
| `fixtures/report-bad-*.txt` | One file per way a report breaks the contract. |
