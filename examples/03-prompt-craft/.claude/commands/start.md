---
description: Reset this workspace, then run its prompt from PROMPT.md
allowed-tools: Skill, AskUserQuestion, Read, Bash, Glob, Grep
---

!`npm start`

That is the starting state. The workspace has been reset.

Stop here if this conversation already holds an earlier run of this example.
Reply with one line asking the user to run `/clear` and then `/start` again.
Read no files and change nothing.

Otherwise open your reply with one line, before anything else:

```
You asked: <the request below, word for word, on one line>
```

Then a blank line, then follow the workspace rules.

Do exactly what the request says. Nothing more.

@PROMPT.md
