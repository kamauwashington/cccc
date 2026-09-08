# Reset snapshot

This folder is the starting state of `06-agent-board`.

`scripts/reset.mjs` copies these files back over the live ones. Do not edit
anything here while working on the example. Change the live files, then run
`node scripts/snapshot.mjs 06` on purpose.

The workspace settings deny Read and Edit on this folder so Claude does not
find the starting state and copy from it.
