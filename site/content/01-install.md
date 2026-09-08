---
title: Install and run
section: Start here
order: 2
summary: Clone, install, preflight, then launch Claude Code from inside one example folder. A fresh clone is red on purpose.
facts:
  Needs | Node 20.11 or newer, and Claude Code
  Version floor | `2.1.0`
  Tested on | `2.1.263`
  Fresh clone state | red, and that is correct
docs:
  Quickstart | quickstart
  CLI reference | cli-reference
  Common workflows | common-workflows
tabs:
  Setup | Setup | Run one example
  Resetting | Reset between runs | Take one folder home
  What breaks | What can go wrong
---

## Setup

```bash
git clone <this repository>
cd CCCC
npm install          # installs workspaces and runs scripts/setup.mjs
npm run preflight    # checks versions, snapshots, and leakage risks
claude doctor        # built in. Checks install, settings, MCP, and skills.
```

`npm install` runs `scripts/setup.mjs` through the `postinstall` hook. That
script writes `.claude/settings.local.json` into every workspace. Those files
hold absolute paths, so they cannot be committed. See
[Settings](#/settings) for what goes in them and why.

## Run one example

Launch from inside the example folder. Always.

```bash
cd examples/01-ts-conventions
claude
```

Then paste the contents of that folder's `PROMPT.md`. Or run `/start`, which
is a slash command in every workspace that reads `PROMPT.md` for you.

`npm start` inside a workspace is the demo one liner. It resets the workspace,
shows the first red signal, and stops. It always exits 0, because a non zero
exit makes npm print seven lines of its own error block over the output.

## Reset between runs

```bash
npm run reset -- 01     # ground truth. Restores files, clears memory.
npm run reset           # every workspace
```

Inside a session, `/rewind` is faster. It rolls code and conversation back
together, so the model does not remember the previous attempt. Use `/rewind`
mid example and `npm run reset` between sessions. Auto memory is the one thing
`/rewind` does not clear, which is why [reset.json](#/reset-json) always wipes
`.claude/memory/`.

## Take one folder home

Copy any single folder out of `examples/` and it runs on its own. Each
workspace repeats its own settings, its own `tsconfig.json`, and its own
helpers. There is no shared package to drag along. Dependencies are hoisted
from the root through npm workspaces, so a copied folder needs its own
`npm install`.

## What can go wrong

- **Launching from the repository root.** You get none of the example's
  configuration and all of the wrong context. See [The three rules](#/three-rules).
- **A personal skill in `~/.claude/skills/`.** It applies to every project on
  the machine and there is no setting that excludes it. See
  [Isolation and leakage](#/isolation).
- **A version other than the tested one.** `scripts/preflight.mjs` warns. A
  warning means walking [Verify before the talk](#/before-the-talk) again.
