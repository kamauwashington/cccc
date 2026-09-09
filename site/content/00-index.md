---
title: The field manual
section: Start here
order: 1
summary: Eight small projects. Each one teaches a single Claude Code feature, starts broken, has one prompt, and ends somewhere a test can check. This site documents what is in the repository, what every recurring file does, and where the official docs cover the same ground.
---

## How this site is built

Every example page is generated from that example's own `README.md`, so the
site cannot drift from the code. The concept pages are written by hand.

| Part of the site | Comes from |
| --- | --- |
| The eight example pages | `examples/NN-name/README.md`, plus the prompt and the reset manifest read off disk |
| Field notes | `MEMORY.md`, `docs/`, the root `CLAUDE.md`, `template/README.md` |
| Everything else | `site/content/*.md`, written by hand |

Add a ninth example and its page appears with no edit to the build script.
Change an example README and the page changes with it. Run `npm run build` to
rebuild, and see [Adding to this site](#/adding).

The root `CLAUDE.md` sets the writing rules for every markdown file here, and
`scripts/lint-prose.mjs` enforces two of them in CI. The pages under
`site/content/` are scanned like everything else.
