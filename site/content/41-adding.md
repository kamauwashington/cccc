---
title: Adding to this site
section: Scripts
order: 2
summary: The site is built from the repository by one script with no dependencies. Add an example and its page appears on its own. Add a concept and it is one markdown file with frontmatter.
facts:
  Built by | `scripts/build-site.mjs`
  Rebuild with | `npm run build`
  Output | `dist/index.html`, one self contained file
  Also emits | `dist/artifact-body.html`, the same page with no document wrapper
  Sources | `site/content/*.md` and `site/logo.png`
  Publish with | `npm run publish:web`
docs:
  Common workflows | common-workflows
tabs:
  Adding to it | Add a ninth example | Add a concept page
  How it works | The mechanism | The two sections every concept page has | Keep it honest | The build
  What breaks | What breaks
---

## Add a ninth example

Copy `template/` into `examples/09-name/`, fill in the README, and run
`npm run build`. The page appears in the nav with no edit to the build script.
The example section is generated from `listWorkspaces()`, the same helper reset
and verify use, so the site can never list an example the tooling does not
know about.

The generated page pulls four things off disk:

| Shown on the page | Read from |
| --- | --- |
| The body of the page | `examples/09-name/README.md` |
| The prompt card at the top | `examples/09-name/PROMPT.md` |
| The spec strip | `reset.json`, and a listing of `.claude/` |
| The "concepts on show" chips | `EXAMPLE_CONCEPTS` in the build script |

Only the last one needs an edit. Add a line naming the concept pages the
example demonstrates, and add a line to `EXAMPLE_DOCS` for the links out.

## Add a concept page

One file in `site/content/`. The numeric prefix sets the order within a section
and is stripped from the page id, so `31-plugins.md` becomes `#/plugins`.

```markdown
---
title: Plugins
section: Claude Code concepts
order: 12
summary: One sentence that says what the thing is and why it matters.
facts:
  Lives at | `.claude/plugins/`
  Loads | at launch
docs:
  Plugins | plugins
---

## The mechanism

...

## What breaks

...
```

`facts` becomes the spec strip under the title. `docs` becomes the link list in
the right hand rail. A bare value in `docs` is appended to
`https://code.claude.com/docs/en/`, and a full URL is used as written.

Sections are fixed, in this order: Start here, Repo staples, Claude Code
concepts, The eight examples, Scripts, Field notes. A page with an unknown
section will not appear, so use one of those six.

## The two sections every concept page has

**The mechanism.** Where the file lives, when it loads, and whether it is
context or enforcement. That is the question this whole repository is about.

**What breaks.** The failure modes, named. This is the part worth writing, and
it is why the field notes are on the site at all. Everything under
[Project memory](#/memory-log) and
[Verify before the talk](#/before-the-talk) is a fact somebody had to learn the
hard way. Concept pages should carry the ones that belong to them.

## Keep it honest

Two habits keep the site from rotting.

- **Say what was verified and on which version.** The repository is pinned to a
  floor of 2.1.0 and tested on 2.1.263. Anything that moves between versions
  belongs on the before the talk list rather than stated flatly here.
- **Never quote a measurement you did not take.** Token counts and wall clocks
  move. Every number on this site either comes from the repository's own files
  or comes with an instruction to measure it again.

## The build

No dependency. `scripts/build-site.mjs` carries its own small markdown
renderer, which keeps the repository installable from a clean clone with one
`npm install` and keeps the workspaces sharing nothing.

The prose linter scans `site/content/*.md` like every other markdown file in
the repository, so the house writing rules apply here. Run
`npm run lint:prose` before you commit.

`dist/` is generated and gitignored, so CI runs `npm run build` instead of
diffing a committed file. A change that breaks the generator fails the build.

The published copy lives in its own repository, which holds the built
`index.html` and nothing else. `npm run publish:web` copies `dist/index.html`
there and commits. It never pushes, because it carries no credentials.
