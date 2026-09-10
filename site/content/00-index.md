---
title: The field manual
section: Getting started with Claude
order: 1
summary: A growing set of small projects, each teaching a single Claude Code feature. Every one has a single prompt and ends somewhere a test can check. Some start red and get fixed. The rest start green and show you a difference instead. This site documents what is in the repository, what every recurring file does, and where the official docs cover the same ground.
---

## How this site is built

Every example page is generated from that example's own `README.md`, so the
site cannot drift from the code. The concept pages are written by hand.

| Part of the site | Comes from |
| --- | --- |
| The example pages | `examples/NN-name/README.md`, plus the prompt and the reset manifest read off disk |
| Field notes | `MEMORY.md`, `docs/`, the root `CLAUDE.md`, `template/README.md` |
| Everything else | `site/content/*.md`, written by hand |

Add another example and its page appears with no edit to the build script.
Change an example README and the page changes with it. Run `npm run build` to
rebuild, and see [Adding to this site](#/adding).

The root `CLAUDE.md` sets the writing rules for every markdown file here, and
`scripts/lint-prose.mjs` enforces two of them in CI. The pages under
`site/content/` are scanned like everything else.
