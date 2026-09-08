---
description: Fill the local order store with fixed sample rows
allowed-tools: Bash(npx tsx src/db/cli.ts:*), Read
model: haiku
---

!`npx tsx src/db/cli.ts seed`

The local store at `src/db/data.json` now holds the sample customers and
orders. The rows come from `seedData()` in `src/db/store.ts`, so a seed is the
same every time.

Report the counts from the line above in one sentence. Do nothing else.
