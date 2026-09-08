---
title: Rules files
section: Claude Code concepts
order: 7
summary: A markdown file with frontmatter. The paths key is a list of globs, and the file loads when a tool call touches a matching path. It behaves like a subdirectory CLAUDE.md with a sharper trigger.
facts:
  Lives at | `.claude/rules/*.md`, at any depth
  Loads | when a tool call touches a path matching `paths`
  No `paths` key | loads at launch, same priority as `.claude/CLAUDE.md`
  Personal scope | `~/.claude/rules/`, loaded before project rules
  Excludable | yes, through `claudeMdExcludes`
  Shown here by | 04
docs:
  Memory and CLAUDE.md | memory
  Context window | context-window
  Settings | settings
tabs:
  Mechanism | The shape | The two in example 04
  In this repo | Seeing it happen | Rules against skills
  What breaks | What breaks
---

## The shape

```markdown
---
paths:
  - "src/**/money*.ts"
  - "src/orders/**"
---

# Money

Money is integer cents everywhere. A float in a money field is a bug.
```

Rules without a `paths` field load unconditionally. Path scoped rules trigger
when Claude reads a file matching the pattern, rather than on every tool use.

## The two in example 04

| File | Scope | Holds |
| --- | --- | --- |
| `src/orders/.claude/rules/money.md` | `src/**/money*.ts`, `src/orders/**` | One rule that matters. Money is integer cents. |
| `.claude/rules/writing.md` | `**/*.md` | The repository writing rules |

The second one is the better example of the idea. Writing rules belong in front
of the model when it edits a markdown file and belong out of the way when it
edits TypeScript. A glob does that, and a root `CLAUDE.md` cannot.

## Seeing it happen

Run `/context` before Claude reads `src/orders/money.ts` and again after. The
money rule is absent, then present. That is the whole mechanism on one screen,
and it is the clearest demonstration of on demand loading in the repository.

## Rules against skills

Rules load when a path matches. Skills load when the work matches a
description. A rule is the right home for a short standing constraint on a set
of files. A skill is the right home for a procedure.

## What breaks

- **Putting a procedure in a rule.** It loads into context every time a matching
  file is touched, whether the procedure is relevant or not. That belongs in a
  [skill](#/skills).
- **A rule in a parent directory you forgot about.** It loads. `claudeMdExcludes`
  covers `.claude/rules/` as well as `CLAUDE.md`, and
  `scripts/setup.mjs` writes the home directory entries into every workspace
  for that reason.
- **Assuming a rule is enforcement.** It is context, with the same guarantee
  `CLAUDE.md` has, which is none. See [Hooks](#/hooks).
