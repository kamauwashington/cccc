---
title: Isolation and leakage
section: Repo staples
order: 7
summary: Eight examples in one repository, on a machine with personal skills and a personal CLAUDE.md. Keeping them from contaminating each other is the hardest constraint in the build, and one of the leaks is real and still on the presenter's machine.
facts:
  Enforced by | `scripts/verify.mjs` and `scripts/preflight.mjs`
  Root `.claude/` may hold | `settings.json` and the generated local file, nothing else
  Excludable | `CLAUDE.md` and `.claude/rules/`, through `claudeMdExcludes`
  Not excludable | skills, from a parent directory or from the home directory
docs:
  Memory and CLAUDE.md | memory
  Skills | skills
  Settings | settings
  Permissions | permissions
tabs:
  How things load | Three loading rules, three different answers | The root .claude/ stays bare | claudeMdExcludes carries the rest
  The real leak | The leak that actually happened | Nested skill folders are not discovered
  What breaks | What breaks
---

## Three loading rules, three different answers

| Thing | Where it loads from |
| --- | --- |
| `.claude/settings.json` | The launch directory only. Never inherited from a parent. |
| `CLAUDE.md` | The launch directory and every directory above it, at launch. Subdirectories load on demand. |
| Skills | The launch directory's `.claude/skills/`, and `~/.claude/skills/`. |

Settings not inheriting is why every workspace carries a complete copy of its
own configuration. `CLAUDE.md` inheriting upward is why the root `CLAUDE.md`
holds writing rules and nothing that would change a demo.

## The root .claude/ stays bare

`scripts/verify.mjs` fails the build if anything other than `settings.json`
appears in the root `.claude/`. A skill or a `CLAUDE.md` placed there loads into
all eight examples and ruins the isolation story.

There is no setting that excludes skills from a parent directory or from
`~/.claude/skills/`. `claudeMdExcludes` covers `CLAUDE.md` files and
`.claude/rules/` files. It does not cover skills. Keeping the root bare is the
only fix, so a check enforces it.

## claudeMdExcludes carries the rest

`scripts/setup.mjs` writes this into every workspace's
`.claude/settings.local.json`, with absolute paths, which is why that file is
generated per machine and gitignored.

```json
{
  "claudeMdExcludes": [
    "<repo>/CLAUDE.md",
    "<repo>/CLAUDE.local.md",
    "<repo>/.claude/CLAUDE.md",
    "<repo>/.claude/rules/**",
    "<repo>/examples/CLAUDE.md",
    "<home>/.claude/CLAUDE.md",
    "<home>/.claude/rules/**"
  ]
}
```

The two home directory entries matter most. They stop the presenter's personal
instructions from changing how a demo behaves.

## The leak that actually happened

`~/.claude/skills/ts-enum/` on the presentation machine says to always use a
TypeScript string `enum`. Example 01 teaches the opposite: no `enum` keyword,
use a const object plus a union type. The skill auto invokes on exactly the
work example 01 asks for.

It already caused a real failure. The agent that built example 06 picked the
rule up and wrote a `ts-conventions` skill that contradicted example 01. That
got corrected. The machine level skill is still there.

Park it before rehearsing.

```bash
mv ~/.claude/skills/ts-enum /tmp/ts-enum.parked
```

`npm run preflight` warns when `~/.claude/skills/` is not empty. `claude doctor`
reports skill list truncation and unused MCP servers, which is the same story
from the other side.

This is worth saying out loud during the talk. It is the leakage story
happening for real, on the presenter's own machine, to the one example that
teaches enum conventions.

## Nested skill folders are not discovered

A `SKILL.md` at `skills/typescript/enum/SKILL.md` never loads. Skills have to
be one flat folder each, `skills/<name>/SKILL.md`. Verified on 2.1.263 with a
probe workspace holding one nested and one flat skill. Only the flat one
appeared.

## What breaks

- **A skill in the root `.claude/`.** It loads into all eight examples.
  `verify.mjs` fails the build.
- **A personal skill that contradicts an example.** No setting excludes it.
  Move the folder.
- **A personal output style in `~/.claude/output-styles/`.** It competes with
  the project one in example 08. Check the folder is empty before the talk.
- **Assuming `permissions.deny` stops a file loading.** Deny rules govern which
  tools Claude may call. They do not govern what gets injected into context.
