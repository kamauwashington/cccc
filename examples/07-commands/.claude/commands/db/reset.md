---
description: Empty the local order store
allowed-tools: Bash(npx tsx src/db/cli.ts:*), Read
model: haiku
---

!`npx tsx src/db/cli.ts reset`

The local store at `src/db/data.json` is empty again. This touches only the
store. It does not touch `CHANGELOG.md` or anything under `src/`.

Say in one sentence that the store is empty. Do nothing else.
