---
description: Reset this workspace, then run its prompt from PROMPT.md
allowed-tools: Bash(npm start:*), Bash(node tools/board.mjs:*), Read, Glob, Grep
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

Then a blank line. Then answer the request by running the tool, and follow the
workspace rules.

@PROMPT.md
