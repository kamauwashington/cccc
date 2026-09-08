---
description: Explain a source file to someone reading it for the first time
argument-hint: <@path/to/file.ts>
allowed-tools: Read, Grep, Glob
model: sonnet
---

Explain this file: $ARGUMENTS

Cover four things and stop:

1. What the file is for, in one sentence.
2. The main exports, and what each one is called for.
3. The rules the code enforces that a reader would otherwise miss.
4. The one place a change is most likely to break something.

Keep it under 25 lines. No code blocks longer than five lines. Do not rewrite
the file and do not suggest changes unless asked.
