---
description: Run this example's prompt exactly as written in PROMPT.md
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

This is the one `/start` that does not reset. `/mode-lean` and `/mode-fat`
reset the workspace and swap the root `CLAUDE.md`. A reset here would swap it
back and lose the mode under test.

Do exactly what the following prompt says. Nothing more.

@PROMPT.md
