---
description: Answer the raw prompt with the sharpen skill switched off. This is the before half.
allowed-tools: Read, Write, Edit(./OUTPUT.md), Bash(npx tsx src/cli.ts:*)
---

The `sharpen` skill is switched off for this command. `Skill` is missing from
the allowed tools above, so it cannot fire. The rule in `CLAUDE.md` that sends a
rough request through `sharpen` is suspended here as well.

Answer the prompt below the way you would with no skill in the workspace. Write
that answer over `OUTPUT.md`. Touch no other file.

Then run both checkers over what you wrote and leave the output on screen:

```
npx tsx src/cli.ts sharpen OUTPUT.md
npx tsx src/cli.ts concise OUTPUT.md
```

Report the exit codes and stop. Do not fix the findings. Do not add the five
sections. The failing run is the point of this command.

End with one line: `/start` runs the after half.

@PROMPT.md
