# Claude Code Crash Course

Eight small projects. Each one teaches a single Claude Code feature. Each one
starts broken, has one prompt, and ends somewhere a test can check.

The session is 60 minutes. Four examples get demoed live. Four are take home.
This repository is the take home part, so every example has a README and a
working reset, including the ones that never run on stage.

## The joke

We built a message board so that agents can talk to each other. Nobody asked for
this. The agents did not ask for it either. They have nothing to say to each
other. They said it anyway, in OpenAPI 3.1, and then one of them reviewed it.

See `examples/06-agent-board/`.

## The three rules

**1. Launch Claude Code from inside the example folder.**

```bash
cd examples/01-ts-conventions
claude
```

`.claude/settings.json` is read from the directory you launch in. It is never
inherited from a parent. Launching from the repository root gives you none of
the example's configuration and all of the wrong context.

**2. Reset between runs.**

```bash
npm run reset -- 01     # ground truth. Restores files, clears memory.
```

Inside a session, `/rewind` is faster. It rolls code and conversation back
together, so the model does not remember the previous attempt. Use `/rewind`
mid example and `npm run reset` between sessions.

**3. Read `PROMPT.md` before you type anything.**

Each workspace has one prompt, written out verbatim. Paste it as is the first
time. Change it on the second run and watch what moves.

## Setup

```bash
npm install          # installs workspaces and runs scripts/setup.mjs
npm run preflight    # checks versions, snapshots, and leakage risks
claude doctor        # built in. Checks install, settings, MCP, and skills.
```

Tested on Claude Code 2.1.263. The pinned floor is 2.1.0. Node 20.11 or newer.

## The examples

| Folder | Teaches | Live |
| --- | --- | --- |
| `01-ts-conventions` | A skill is a bundle of conventions | yes |
| `02-hooks` | A hook runs whether or not the model agrees | yes |
| `03-prompt-craft` | Skills that work on the conversation | take home |
| `04-progressive` | Subdirectory context loads on demand | take home |
| `05-tools-and-output` | Most tools do not need an MCP server | take home |
| `06-agent-board` | Subagents, fan out, and the description field | yes |
| `07-commands` | A command is invoked. A skill is reached for. | yes |
| `08-report-style` | An output style sets the shape of every answer | take home |

## Repository scripts

| Command | What it does |
| --- | --- |
| `npm run setup` | Writes the generated `settings.local.json` in every workspace |
| `npm run reset -- 02` | Restores one workspace from its `.pristine/` snapshot |
| `npm run reset` | Restores every workspace |
| `npm run verify` | Checks the root `.claude/` is bare and every workspace has the skeleton |
| `npm run preflight` | Pre talk checks. Run this before you go on stage. |
| `npm run lint:prose` | Fails on em dashes and banned phrases |
| `npm run go 02` | Optional. Changes into a workspace and launches Claude Code. |
| `npm run solution -- 06` | Copies in the reference solution if a live run stalls |
| `npm run solution` | Applies every solution, so the whole repository goes green |
| `npm run check:solutions` | Applies each solution, verifies it, then resets |
| `npm run site` | Rebuilds the documentation site into `site/index.html` |

## Red is the starting state

Every example ships broken. That is the design. `npm test` at the repository
root is red on a fresh clone, and that is the expected result.

Each example also ships a `.solution/`, so every red state has a proven fix:

```bash
npm run solution          # apply every solution. Everything goes green.
npm test                  # all eight workspaces pass
npm run reset             # back to the broken starting state
```

`npm run check:solutions` does that round trip automatically and is what CI
gates on. A solution has to earn its green by changing `src/`. The check
refuses any solution that ships an edited `tests/`, `vitest.config.ts`,
`tsconfig.json`, or `package.json`, and it re-compares those against the
snapshot after the run. Changing a test to make a test pass is caught, not
trusted.

## The documentation site

`site/index.html` is a single self contained page covering what every recurring
file does, what each Claude Code feature is, and what breaks. Open it straight
from disk.

```bash
npm run site         # rebuild after changing an example or a concept page
open site/index.html
```

The eight example pages are generated from each example's own `README.md`, so
they cannot drift. The concept pages are hand written in `site/content/`. Add a
ninth example and its page appears with no edit to the build script.

Two knobs sit next to the output. `site/logo.png` is inlined as a data URI, so
swapping that file and rebuilding changes the mark. Delete it and the hero falls
back to the title. `site/artifact-body.html` is the same page without the
document wrapper, for publishing as an Artifact.

CI runs `node scripts/build-site.mjs --check`. It fails when `site/index.html`
is older than the content it was built from, so rebuild before you commit.

## Take this home

Copy any single folder out of `examples/` and it runs on its own. That is why
each workspace repeats its own settings, its own `tsconfig.json`, and its own
helpers. There is no shared package to drag along.
