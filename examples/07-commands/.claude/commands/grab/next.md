---
description: Grab today's six issues, three quick, two mid, one complex
allowed-tools: Bash(node tools/issues.mjs:*), AskUserQuestion
model: sonnet
---

!`node tools/issues.mjs next`

Those six are today's list. The script picked the six, you pick what to work.

Ask with the AskUserQuestion tool. One call, two questions, ask once.

Question one, header `Quick`:

- One option per quick issue above, three in total.
- The label is the issue number and a short version of the title.
- The description is the area, plus one line on what the issue is.
- Multi select. Set `multiSelect` to true. Take as many as you want is the
  point, so phrase the question in the plural.

Question two, header `Bigger`:

- One option per mid and complex issue above, three in total.
- Same label and description shape, and say which tier the issue is.
- Multi select. Set `multiSelect` to true, and phrase the question in the
  plural.

The tool adds its own "Other" row to each question. Do not add one.

When the answers come back, print one line per issue picked, quick ones first,
lowest issue number first inside each group. Then the last line. Then stop.

```
quick   #<number> <title>
bigger  #<number> <title>
Nothing was assigned, this is a picking exercise.
```

If a question came back with nothing selected, print no line for it. If nothing
at all was selected, print only the last line.

Read no other file. Start no work on any issue.
