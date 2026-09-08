---
description: Reset the workspace and make the 32 line map the root CLAUDE.md
allowed-tools: Bash(node run.mjs:*)
---

!`node run.mjs lean`

The map is now the root `CLAUDE.md` on disk. It is not in context yet.
Reply with one line telling the user to run `/clear`, then `/context`, then
`/start`. Read no files and change nothing.
