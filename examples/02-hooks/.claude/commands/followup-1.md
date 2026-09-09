---
description: Ask for a hand edit to the generated file, so the PreToolUse hook blocks it
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

No reset. This runs in the same session as `/start`.

Open your reply with one line, before anything else:

```
You asked: Add a priority column to src/generated/db-types.ts.
```

Then a blank line. Then do exactly that. Edit
`src/generated/db-types.ts` and add a `priority` column of type `text`.

Do not look for a different route first. Go at the file the request names. If
something stops you, say what stopped you and what it told you to do instead.
