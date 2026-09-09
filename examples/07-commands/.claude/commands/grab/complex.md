---
description: Pick complex issues to work from the top three
allowed-tools: Bash(node tools/issues.mjs:*), AskUserQuestion
model: sonnet
---

!`node tools/issues.mjs complex`

Ask the user which ones they want, using the AskUserQuestion tool. Ask once.

- One option per issue above, three in total.
- The label is the issue number and a short version of the title.
- The description is the area, plus one line on why the issue is complex.
- Multi select. Set `multiSelect` to true, and phrase the question in the
  plural.
- The tool adds its own "Other" row. Do not add one.

When the answer comes back, print one line per issue picked, lowest issue
number first. Then the last line. Then stop.

```
picked #<number> <title>
Nothing was assigned and no work was started.
```

If nothing was selected, print only the last line.

Read no other file. Start no work on the issues.
