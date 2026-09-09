---
description: Reset this workspace, then run its prompt in a named output style
argument-hint: [-report | -terse]
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

!`npm start`

That is the starting state. The workspace has been reset.

Stop here if this conversation already holds an earlier run of this example.
Reply with one line asking the user to run `/clear` and then `/start` again.
Read no files and change nothing.

Otherwise open your reply with the request and a rule, before anything else:

```
You asked: <the request below, word for word, on one line>

---
```

The rule is where your answer starts. It has to be there in every style, so a
one line answer still reads as an answer.

Then do exactly what the prompt says. Nothing more.

Then answer in the style named by `$ARGUMENTS`:

- `-report` use the report style below.
- `-terse` use the terse style below.
- nothing, use whatever style the session is already in.

A flag here changes this turn only. `/output-style <name>` changes the session.

@PROMPT.md

@.claude/output-styles/report.md

@.claude/output-styles/terse.md
