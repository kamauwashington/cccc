# 01-ts-conventions

Three skills, three owners, one prompt that pulls in whichever ones apply.

## What you will see

The repository starts red. `npm run typecheck` fails on three `enum`
declarations, and one prompt turns all three into the project's own pattern
across six source files, with typecheck clean and 26 tests green.

## How it works

`.claude/skills/` holds three skills. `typescript-enum` owns the const object
plus union shape, the naming rule, and exhaustive switches. `postgres-enum`
owns the `CREATE TYPE` source of truth, the Drizzle `pgEnum`, and the append
only migration rule. `zod-schema` owns validation. No skill mentions the other
two, so each one has to be retrieved on its own description. A `reference.md`
sits behind the first one with the longer notes. Claude Code reads each skill's name
and description at launch
and loads the body only when the work matches, so the rules cost nothing until
they are needed. `CLAUDE.md` points at the skill in one line and
restates none of it.

The forcing functions are all in the repository, and every one of them has to
pass:

- `tsconfig.json` sets `erasableSyntaxOnly`, which makes `enum` a compile error.
- `expectTypeOf` assertions that only hold for a union type.
- A `@ts-expect-error` case proving an unknown label is rejected.
- A PGlite test that runs `CREATE TYPE ... AS ENUM`, reads the `pg_enum`
  catalog, and diffs the labels against the TypeScript values array.
- Tests that the Zod schema and the Drizzle `pgEnum` come from the same const
  object.

## The prompt

```
Make sure the code follows our standards.
```

## What to watch for

The prompt never says "enum" and never names a file. `CLAUDE.md` names the
three skills and tells Claude to read all three. Watch the three skill loads go
by. The reverse map that replaces `Priority[2]` comes out of `typescript-enum`,
the Drizzle tuple cast comes out of `postgres-enum`, and `z.literal` for the
numeric set comes out of `zod-schema`. Three owners show up in one run, and
nothing in the prompt asked for any of them.

The numeric enum is the tell. Nothing in the prompt hints that losing the
reverse mapping is a problem.

One honest note. An earlier version of `CLAUDE.md` said to read
the skills that apply, and three cold runs loaded all three only twice. The
line now says to read all three, which made it three for three. Description
matching alone got the right code every time. It did not reliably open all
three files.

## Running it

1. Launch Claude Code from inside this folder.
2. Run `/start`. It resets the workspace and runs `tsc` first, so TS1294 shows
   up three times at the top of the output. Then it reads `PROMPT.md` and runs
   that prompt verbatim, so every run begins from the same words.
3. Let it finish. It takes a couple of minutes, because `src/domain/priority.ts`
   touches `describeOrder` and the Drizzle column type.
4. Run `npm run typecheck` and `npm test`. Both have to pass, at 26 tests.
5. To go again, run `/clear` then `/start`.

What can go wrong. The first PGlite test on a cold machine takes a few seconds
to boot Postgres, so the dot reporter sits still for a moment. That is normal.
If the model stops early with tests still red, tell it to run `npm test` again
and fix what is failing.

Fallback. `npm run solution -- 01` copies the finished `src/` in from
`.solution/`. The diff is worth reading either way.

## Try next

- Add `'refunded'` to the SQL in `src/db/sql.ts` only, then ask Claude to make
  the tests pass again. The parity test names the missing label.
- Delete rule 2 from `postgres-enum/SKILL.md`, reset, and rerun. The label list gets typed
  out twice and the derivation test catches it.
- Move the skill to `~/.claude/skills/` and watch it apply to a different
  project with no setup.
