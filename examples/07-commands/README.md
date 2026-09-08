# 07-commands

A command is something you invoke by name. A skill is something Claude reaches
for on its own. That is the whole difference.

## What you will see

`/ship 1.4.0` reads a real commit list, groups it, and writes `CHANGELOG.md`,
and the failing tests go green. Then you ask for the same changelog in plain
English and get a different file.

## How it works

`.claude/commands/ship.md` is the command. A markdown file under
`.claude/commands/` becomes a slash command named after the file. Claude Code
finds it at launch and lists it in the `/` menu.

Three mechanisms are in that one file.

- `$1` is the first argument. `$ARGUMENTS` is everything the user typed after
  the command name. `/ship 1.4.0` sets `$1` to `1.4.0`.
- A line starting with `!` and holding a backtick command runs in the shell
  before Claude reads the prompt. Its output is pasted in place. The model never
  chooses to run it and never sees a version without it.
- Frontmatter carries `description`, `argument-hint`, `allowed-tools`, and
  `model`. `argument-hint` is what the `/` menu shows after the name.

The injection line in `ship.md` is this:

```
!`cat fixtures/history.txt`
```

In a real project with a git repository, that same line is this:

```
!`git log --oneline v1.3.0..HEAD`
```

The two produce the same text. These examples ship without their own git
repository, because an embedded repository makes the parent repository stop
tracking the folder. So the history lives in `fixtures/history.txt` instead. The
lesson is unchanged. The command file is the only thing that would differ.

Subdirectories become a prefix. `.claude/commands/db/seed.md` is `/db:seed` and
`.claude/commands/db/reset.md` is `/db:reset`. Both carry `model: haiku`,
because both do one mechanical thing against the JSON store in `src/db/`.

`.claude/commands/explain.md` takes a file reference. `/explain
@src/orders/service.ts` puts that file in the prompt before the model starts.

## The prompt

```
/ship 1.4.0
```

## What to watch for

Run `/ship 1.4.0`. Then run `npm run reset -- 07`, `/clear`, and ask in plain
English: "write a changelog for 1.4.0 from the commits since the last tag."

Claude does something reasonable both times. The plain English run picks its own
headings, its own ordering, and its own idea of which commits matter. Run it
twice and you get two different files. The command produces the same file every
time, because the shell output and the file paths are fixed before the model
reads a single token. Repeatability is the reason to write a command.

`npm test` checks that claim two ways. `tests/changelog.test.ts` checks the file
`/ship` wrote. `tests/repeatable.test.ts` renders the same changelog twenty
times from `src/changelog/render.ts` and asserts the bytes never move.

## Speaker notes

Open the `/` menu first and let people see `argument-hint` next to `/ship`. That
sells the frontmatter in two seconds.

Say the one sentence at the top of this file out loud. Attendees mix up commands
and skills every time. A command is invoked. A skill is chosen.

If `/ship` writes a changelog the tests reject, read the failure out. The test
names say which rule broke. Fix it by tightening the rules in `ship.md`, which is
a better demo than fixing the file by hand.

Fallback: `npm run solution -- 07` copies the finished `CHANGELOG.md` in. Keep
talking and move on.

`/db:seed` and `/db:reset` are the cheap ones. Run them if the room needs to see
namespacing. Skip them if you are behind.

## Try next

- Add `.claude/commands/release/notes.md` and watch it appear as
  `/release:notes`. One file, one new command, no restart.
- Point the injection line at `package.json` instead of the fixture and rerun
  `/ship`. The prompt changes before the model sees it. Ask Claude what it
  received and it will read back the new text.
- Drop `argument-hint` from `ship.md` and open the `/` menu again. The hint is
  the only thing that tells a user the command wants a version.
