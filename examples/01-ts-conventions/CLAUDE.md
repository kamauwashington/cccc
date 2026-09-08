# 01-ts-conventions

A small order shipping domain. Postgres enum types, Drizzle, and Zod all read
the same TypeScript value sets.

## Rules for this workspace

- Fixed sets of named values are covered by three skills in `.claude/skills/`.
  `typescript-enum` owns the language shape, `postgres-enum` owns the database
  type and the migration rules, and `zod-schema` owns validation. Read all
  three before you change a value set. The three sit in different files, so
  reading one and guessing the other two puts the label list in two places.
- Run `npm run typecheck` and `npm test` to check your work. Both have to pass.
- Never edit anything under `.pristine/` or `.solution/`.

## Memory

Auto memory for this workspace is written to `.claude/memory/` inside this
folder. If the system prompt names a different path, `.claude/memory/` is the
correct one. It is set in `.claude/settings.local.json`.
