---
description: List the issues anyone on the team can pick up
argument-hint: [area]
allowed-tools: Bash(node tools/issues.mjs:*), AskUserQuestion
model: sonnet
---

Area filter as typed: `$ARGUMENTS`

!`node tools/issues.mjs up-for-grabs $1`

Those are the unowned issues. Anyone can take one, so ask which ones.

If the headline says an area filter was applied, say which area in one line
first. If it says every area, say nothing about filtering.

Then ask with the AskUserQuestion tool. One question, ask once.

- One option per issue above, four at most, lowest issue number first.
- The label is the issue number and a short version of the title.
- The description is the area and tier, plus one line on what the issue is.
- Multi select. Set `multiSelect` to true, and phrase the question in the
  plural.
- The tool adds its own "Other" row, so the user can name any other issue
  number from the list. Do not add one yourself.

When the answer comes back, print one line per issue picked, lowest issue
number first. Then the last line. Then stop.

```
picked #<number> <title>
Nothing was assigned, anyone can take these.
```

If nothing was selected, print only the last line.

Read no other file. Start no work on any issue.
