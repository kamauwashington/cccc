---
description: Reset the workspace and make the 401 line copy the root CLAUDE.md
allowed-tools: Bash(node run.mjs:*)
---

!`node run.mjs fat`

The copy is now the root `CLAUDE.md` on disk. It is not in context yet.
Reply with one line telling the user to run `/clear`, then `/context`, then
`/start`. Read no files and change nothing.
