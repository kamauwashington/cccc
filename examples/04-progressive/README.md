# 04-progressive

A `CLAUDE.md` in a subdirectory does not load at launch. It loads when Claude
reads a file in that directory.

## What you will see

Run the same one line prompt twice against the same code. Run fat first, then
lean, so the expensive version comes before the cheap one.

Fat is a 401 line root `CLAUDE.md` that describes every domain and names no
file. It is large at launch and it still leaves Claude to search the tree,
because nothing in it says where anything lives. That is the version without
progressive disclosure.

Lean is a 32 line map. It bans the survey outright and points at the
`CLAUDE.md` in each domain folder. Claude opens the one domain the task names
and the other three stay closed.

## How it works

Claude Code loads memory from the directory you launched in and from every
parent, at launch. It does not walk down. A `CLAUDE.md` deeper in the tree is
read later, when a tool call touches a file in that folder. Progressive
disclosure is the default behaviour. Most people are fighting it by pushing
everything up into the root file.

Four files carry memory in this workspace, and they load at different times.

| File | Loads |
| --- | --- |
| `CLAUDE.md` at the workspace root | At launch. The app description. |
| `.claude/CLAUDE.md` | At launch. The demo mechanics for this example. |
| `src/<domain>/CLAUDE.md` | When Claude reads a file in that domain. |
| any `.claude/rules/*.md` | When a tool call matches its `paths` glob. |

`CLAUDE.fat.md` is parked on disk and loads nothing. `npm run fat` makes it the
root file and parks the map as `CLAUDE.lean.md`. `npm run lean` puts it back.
`swap.mjs` does the moving. Run `npm run context` to see which one is live.

## The prompt

```
Add a refunded status to orders.
```

## What to watch for

`Add a refunded status to orders.` touches one of the four domains. The other
three are already refund ready and unused. The payment gateway has `sendBack`.
Notifications has an `OrderRefunded` kind with a template. So the fat root file
paid, at launch, for three domains the task never opens.

Watch the Memory files line in `/context` before the first prompt. Then watch
it again after the first edit to `src/orders/`. `src/orders/CLAUDE.md` and the
money rule appear part way through the session, on demand, in the lean run.

## Running it

1. Launch Claude Code from inside this folder, then run `/reset`.
2. Run `/mode-lean` to put the map in place as the root file, then `/clear` so
   the new root file loads.
3. Run `/context`. Record the Memory files line and the total.
4. Run `/start` and let it finish. Count the tool calls before the first edit,
   and record the session tokens at the end.
5. Run `/mode-fat` to swap in the 401 line root file, then repeat steps 2 to 4.
6. Compare the two. Ten runs per mode, median on the result, because a single
   run of an agent is close to a coin flip.

Where the cost falls. A large root `CLAUDE.md` is paid on every session,
whatever the task is. Exploration is paid once, and only when it is needed. So
the root file should be a map of the project. It should not be a copy of the
project.

The built in `/doctor` trim check uses the same heuristic. It removes content
that can be derived from the codebase: directory layouts, dependency lists,
restated type definitions, file indexes. It keeps pitfalls, reasoning, and
conventions that differ from the defaults. Read `CLAUDE.fat.md` and ask of each
section, could Claude find this with one `ls` or one `grep`. Almost all of it
fails that question. The last section of the fat file is the conventions list,
and that is the part `/doctor` would keep. The lean file is that list plus a
map and a survey ban.

One more tell. `CLAUDE.fat.md` describes `OrderStatus` without a refunded
member. The moment the task lands, the fat file is wrong. The map is still
right, because it never claimed to know the enum members.

What can go wrong. Token counts move between model versions and between runs.
Do not quote a number you have not measured today.

## Why one tree and not two folders

Two folders would let the two versions drift. Someone fixes a typo in one and
the comparison stops being about context size. One tree with a swapped root
file means the code, the tests, and the subdirectory memory are byte identical
across both runs. The only variable is the root file. `tests/context.test.ts`
checks that `npm run fat` then `npm run lean` restores the exact bytes.

## The measurements

Take all three off the screen. Do not compute them.

1. `/context` before the first prompt. Record the Memory files entry and the
   total.
2. The number of tool calls before the first edit.
3. The total session tokens at the end.

Run it ten times per mode and put the median on the slide. Ten runs, because a
single run of an agent is close to a coin flip. No ratio is promised here on
purpose. Measure your own repository and quote your own number.

| Run | Lean: startup context | Lean: calls to first edit | Lean: total tokens |
| --- | --- | --- | --- |
| median of 10 |  |  |  |

| Run | Fat: startup context | Fat: calls to first edit | Fat: total tokens |
| --- | --- | --- | --- |
| median of 10 |  |  |  |

Procedure for one run: `/mode-fat` or `/mode-lean`, then `/clear`, then
`/context`, then `/start`. The mode command resets the workspace, swaps the
root file, and prints what each mode costs at launch. It stops there. `/clear`
has to come next, because the root `CLAUDE.md` is only read at launch and at
`/clear`. Running the prompt before that would run it under the old mode.
`/start` is the one that runs the prompt. Run fat first.

`/start` here does not reset, and that makes it the one exception in the
repository. In the other seven examples `/start` resets first. A reset in this
one would swap the root `CLAUDE.md` back and lose the mode under test.

## The rules demo

This example also carries two rules files. A rules file is a markdown file with
frontmatter. The `paths` key is a list of globs. The file loads when a tool
call touches a matching path, so it behaves like a subdirectory `CLAUDE.md`
with a sharper trigger.

- `src/orders/.claude/rules/money.md` scopes to `src/**/money*.ts` and
  `src/orders/**`. It holds one rule that matters: money is integer cents.
- `.claude/rules/writing.md` scopes to `**/*.md`. It holds the repository
  writing rules, so they load when Claude edits a markdown file and stay out of
  the way when it edits TypeScript.

Show `/context` before Claude reads `src/orders/money.ts` and again after. The
money rule is absent, then present. That is the whole mechanism in one screen.

## When the fat file wins

The fat version is not always worse. Give it a task that spans all four
domains, such as "add an audit log entry for every status change in every
domain", and the fat file is the more reliable one. Everything the task needs
is already in the context window. The lean run has to discover four folders
before it can start, and it can miss one.

The skill is matching the shape of the instructions to the shape of the task.
Narrow task, narrow root file, deep tree. Broad task, more up front. A root
file that is a map serves the common case and costs little when it is wrong.

## Try next

- Swap to fat, run the prompt, then run `/doctor` and read the trim suggestion.
  Compare its cuts against the section list in `CLAUDE.fat.md`.
- Delete `src/orders/CLAUDE.md`, run the lean prompt again, and see whether the
  transition table rule survives its absence.
- Write a prompt that spans all four domains. Measure both modes again. The
  ordering should flip.
- Add `paths: ["src/payments/**"]` to a new rule and watch it stay out of an
  orders only session.
