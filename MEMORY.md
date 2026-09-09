# Project memory

One line per durable fact. Add the date. Delete anything that goes wrong.

- 2026-09-06 Repository is a conference demo for a 60 minute Claude Code crash
  course. Eight examples under `examples/`, four demoed live (01, 02, 07, 06),
  four take home (03, 04, 05, 08).
- 2026-09-06 Isolation backbone: `.claude/settings.json` is read from the
  launch directory only and is never inherited from a parent. Every workspace
  carries a complete copy. The duplication is required and intentional.
- 2026-09-06 There is no setting that excludes skills from a parent directory
  or from `~/.claude/skills/`. The only fix is keeping the root `.claude/` bare.
  `scripts/verify.mjs` enforces that and `scripts/preflight.mjs` warns about the
  home directory case.
- 2026-09-06 `autoMemoryDirectory` must be an absolute path or start with `~/`,
  and it goes in `settings.local.json` (local scope). Project scope is contested
  across doc versions. `scripts/setup.mjs` generates it per machine, which is
  why `settings.local.json` is gitignored.
- 2026-09-06 `permissions.deny: ["Read(...)"]` does not stop a file from auto
  loading. Deny rules govern which tools Claude may call. They do not govern
  what gets injected into context.
- 2026-09-06 No `git init` inside any example. An embedded git repository makes
  the parent repository stop tracking that folder's contents. Example 07 injects
  git history from `fixtures/history.txt` for this reason.
- 2026-09-06 Reset is copy based from a per workspace `.pristine/` snapshot. It
  does not need git and it catches gitignored files, which is the only way to
  clear `.claude/memory/` and `RESULT.md`.
- 2026-09-06 Demos may only change files Claude Code does not read at startup.
  `settings.json`, `skills/`, `commands/`, and `hooks/` stay untouched during a
  demo, so `/reset` then `/clear` works without restarting the CLI.
- 2026-09-06 Version pin: floor 2.1.0, tested on 2.1.263. See
  `docs/before-the-talk.md` for the checks that move between versions.
- 2026-09-06 Prose rules are enforced three ways and all three must agree: root
  `CLAUDE.md`, `scripts/lint-prose.mjs`, and the `concise` skill in
  `03-prompt-craft`. Use `<!-- prose-lint-ignore -->` when quoting a banned
  phrase on purpose.
- 2026-09-06 Root `npm test` is red by design, since every example starts
  broken. CI checks `scripts/check-solutions.mjs` instead, which applies each
  `.solution/`, verifies, then resets.
- 2026-09-06 There is no `--disable-all-hooks` flag on 2.1.263. Beat one of
  example 02 uses `claude --settings '{"disableAllHooks": true}'`. Do not use
  `--safe-mode`, which also disables `CLAUDE.md`, skills, and commands and so
  kills the beat.
- 2026-09-06 `~/.claude/skills/ts-enum/` on the presentation machine says to
  always use a TypeScript string `enum`, the opposite of example 01. It already
  leaked once and made a subagent write a contradictory skill in example 06.
  Park it before rehearsing: `mv ~/.claude/skills/ts-enum /tmp/`.
- 2026-09-06 PGlite boots in `beforeAll`, which vitest governs with
  `hookTimeout` (default 10s) and not `testTimeout`. Every workspace that uses
  PGlite sets `hookTimeout: 60000`, otherwise a cold WASM boot flakes the run.
- 2026-09-06 `reset.json` restore lists include `package.json` and
  `vitest.config.ts`. The tests are the forcing function, so editing config is
  how a run cheats, and reset has to undo it.
- 2026-09-06 All eight examples ship a `.solution/`, so every red starting state
  has a proven fix. `npm run solution` (no argument) greens the whole repository
  and `npm run reset` puts it back. `npm run check:solutions` does that round
  trip and is what CI gates on.
- 2026-09-06 A `.solution/` may not contain `tests/`, `vitest.config.ts`,
  `tsconfig.json`, or `package.json`. `check-solutions.mjs` refuses those up
  front and re-diffs them against the snapshot after the run, so a solution
  cannot pass by editing the test instead of the code.
- 2026-09-08 Example 08 teaches output styles. The style file is
  `.claude/output-styles/report.md`, its frontmatter `name` has to match the
  `outputStyle` value in `.claude/settings.json`, and the body augments the
  system prompt on every turn. Verified against 2.1.263.
- 2026-09-08 08 was rebuilt. The `report-check.ts` checker, its fixtures, and
  its 23 tests are gone, and so is the `greet.js` prompt that briefly replaced
  them. `/start` now shows the prompt, runs it, and the answer comes back
  shaped. That is the whole example.
- 2026-09-08 08 starts green, the way 02, 05, and 07 do. The prompt builds a
  small Express catalog API over the static data in `src/catalog.ts`.
  `tests/catalog.test.ts` is the CI backstop over that data and stays off
  screen. There is no red suite to repair, because a repair is not the lesson.
- 2026-09-08 08's `.solution/src/server.ts` is the stall fallback, not a fix.
  `check-solutions.mjs` skips `README.md` when it copies a solution in, so a
  README only `.solution/` is the sanctioned "nothing to solve" shape.
- 2026-09-08 08's prompt says to confirm with `npm run typecheck` and not to
  start a server. Nothing calls the routes, so "Doesn't work. They are
  unproven" is the honest line. That heading is the reason to run the example.
- 2026-09-08 `express` and `@types/express` are root devDependencies and hoist
  to the root `node_modules`, so any workspace can import express with no
  install of its own. 06 and 08 both rely on this.
- 2026-09-08 An output style is read at launch. `reset.json` restores
  `.claude/output-styles`, so a file edit is undone on disk, and the session
  keeps the old style until the CLI restarts. Say that out loud if anyone edits
  `report.md` during a run.
- 2026-09-08 Example 01's prompt is `Make sure the code follows our standards.`
  It never says "enum" and never names a file. `CLAUDE.md` plus the
  skill description carry the whole retrieval. Verified with three cold headless
  runs on 2.1.263. All three went green at 26 tests, all three loaded
  `ts-conventions`, none read `.solution/`.
- 2026-09-08 `permissions.deny` entries like `Read(./.solution/**)` do not stop
  Bash. With the rules loaded, `cat` and `sed` read the file. Keeping a demo run
  out of `.solution/` needs a PreToolUse hook on Bash.
- 2026-09-08 `/start` is the demo one liner in every workspace. It shells out to
  the `start` npm script, which calls `scripts/start.mjs NN`. That resets and
  shows the first red signal, then the command runs `PROMPT.md`. The script
  always exits 0, because a non zero exit makes npm print seven lines of its own
  error block over the output. No README tells anyone to run `npm start` by
  hand. Every workspace allows `Bash(npm start)` so the command runs without a
  permission prompt.
- 2026-09-08 `/start` stops and asks for a `/clear` when the conversation
  already holds an earlier run. Claude cannot clear its own context, so the
  command says so rather than running the prompt on top of the old attempt.
- 2026-09-08 04-progressive is the one `/start` that does not reset.
  `/mode-lean` and `/mode-fat` reset the workspace and swap the root
  `CLAUDE.md`. A reset inside `/start` would swap it back and lose the mode
  under test.
- 2026-09-09 Three examples start red and four start green. 01, 04, and 06 are
  red on both `typecheck` and `test`. 02, 05, 07, and 08 are green on both, since
  their demos are about a feature firing and not about fixing code. 03 runs
  neither, since it writes no code.
- 2026-09-08 `package.json` is in every `reset.json` restore list, so a new
  script has to be snapshotted before it is tested. Running the script first
  lets its own reset strip it out of the live file, and the next snapshot then
  captures the stripped version.
- 2026-09-08 Nested skill folders are not discovered. A `SKILL.md` at
  `skills/typescript/enum/SKILL.md` never loads. Skills have to be one flat
  folder each, `skills/<name>/SKILL.md`. Verified on 2.1.263 with a probe
  workspace holding one nested and one flat skill. Only the flat one appeared.
- 2026-09-08 Example 01 carries three skills, split by owner. `typescript-enum`
  owns the const object and union shape, `postgres-enum` owns the `CREATE TYPE`
  source of truth and the append only migration rule, and `zod-schema` owns
  validation. Three cold runs each loaded all three and went green at 26 tests.
- 2026-09-08 Workspace `CLAUDE.md` now sits at the workspace root, not in
  `.claude/`. Both locations load, verified with a probe holding one of each.
  04-progressive is the exception and keeps both, because `swap.mjs` owns its
  root file for the lean and fat comparison.
- 2026-09-08 Description matching alone does not reliably open every relevant
  skill. With 01 split into three skills, three cold runs loaded all three only
  twice, both with and without cross references between the skills. Telling
  `CLAUDE.md` to read all three made it three for three. The code came out
  correct in every run either way, so the tests do not catch this. Only the
  transcript does.
- 2026-09-08 03's `.claude/commands/start.md` adds `Skill` to `allowed-tools`,
  which is the one place it diverges from `template/`. The demo is a skill
  firing, so the allowance is stated rather than assumed.
- 2026-09-08 The documentation site is generated by `scripts/build-site.mjs`
  into one self contained `dist/index.html`, plus `dist/artifact-body.html`
  which is the same page without the document wrapper for publishing as an
  Artifact. `npm run build` is the command. `site/` holds the sources and
  `dist/` is generated and gitignored. Concept pages are hand written in `site/content/*.md`. Everything
  else is read off the repository, so a ninth example appears with no edit to
  the script.
- 2026-09-08 CI runs `npm run build` rather than diffing a committed file,
  because `dist/` is gitignored. The `--check` flag still exists on the script
  for a setup that does commit its output.
- 2026-09-08 The site is published to a second repository,
  `github.com/kamauwashington/cccc-web`, which holds only the built
  `index.html` and a `.nojekyll` marker. `npm run publish:web` copies and
  commits into a checkout of it. It never pushes, since it has no
  credentials.
- 2026-09-08 `site/logo.png` is inlined as a base64 data URI so the page stays
  one file. Swap the file and rebuild to change the mark. Delete it and the
  hero falls back to the title on its own.
- 2026-09-08 In `.gitignore`, a pattern with a slash in the middle anchors to
  the repository root. `.claude/settings.local.json` therefore covered only the
  root copy and missed all eight workspace copies. The rule is
  `**/.claude/settings.local.json`. A global ignore file on one machine can hide
  this, so test with
  `git -c core.excludesFile=/dev/null check-ignore -v <path>`.
- 2026-09-08 Example 03 was rebuilt. The old design (five section block,
  `OUTPUT.md`, two checker programs, a `/before` half) framed the lesson around
  red and green. The demo is now one beat: a vague `PROMPT.md` goes in, the
  `sharpen` skill asks three questions through `AskUserQuestion`, the answers
  come back, and `listOrders` in `src/orders.ts` gets cursor pagination.
- 2026-09-08 03 asks with the `AskUserQuestion` tool, never a numbered list in
  the text. That needs `AskUserQuestion` in the `allowed-tools` of
  `.claude/commands/start.md`. The tool supplies its own "Other" row, so the
  skill says not to add one.
- 2026-09-08 03 opens with a one line `You asked:` receipt quoting the request
  word for word. It is the one restatement the `concise` skill allows, and it
  puts the vague request and the questions in one frame.
- 2026-09-08 `tests/orders.test.ts` in 03 was a CI backstop that stayed off
  screen. Removed on 2026-09-09 with the rest of the build step.
- 2026-09-08 A reusable asset must never contain the solution verbatim. 01's
  `postgres-enum` and `zod-schema` skills held the exact lines from
  `.solution/src/domain/order-status.ts` and `.solution/src/api/validation.ts`,
  and `typescript-enum/reference.md` held the `PRIORITY_NAMES` block. A run
  could transcribe instead of applying the convention. Teach with a neutral set
  (`Direction` and `DIRECTIONS`, `Level` and `LEVELS`) and keep file pointers
  only to files the solution does not change.
- 2026-09-08 06's `ts-conventions` skill said `Object.values(MessageKind)` while
  the copperhead agent said an `as const` tuple. Copperhead loads that skill, so
  it got both, and `Object.values` does not satisfy `pgEnum`, which wants
  `[T, ...T[]]`. A skill and an agent that overlap have to agree.
- 2026-09-08 To find a leaked answer, compare normalized lines of 32 characters
  or more between each `.solution/` and that workspace's `.claude/**/*.md`. All
  eight are at zero. A skill pointing at a file the solution rewrites is the
  same bug in slower form, which is how `src/domain/priority.ts` got cited as an
  example while being one of the files to fix.
- 2026-09-08 Example 05 was rebuilt to one idea: a tool is a script in your
  project. `tools/board.mjs` reads `data/board.json` and prints a headline, a
  blank line, then fixed width rows. No server, no MCP, no protocol. The setup
  is three files: the script, a rule in `CLAUDE.md`, and an allow rule in
  `.claude/settings.json`.
- 2026-09-08 05 starts green and stays green, the same way 02 does. There is
  nothing to repair. `tests/format.test.ts` is a CI backstop that holds the tool
  to the shape the README teaches, including the 320 and 6 the README quotes.
- 2026-09-08 `Read(./data/**)` in 05's deny list is what forces the tool call.
  Without it, reading `data/board.json` is the cheapest path and 320 rows of
  JSON land in the transcript.
- 2026-09-08 Never run `reset.mjs` against a workspace someone is editing. Reset
  does `rmrf` then copy from `.pristine/`, so a stale snapshot silently replaces
  newer files with older ones. That destroyed an uncommitted `tools/board.mjs`
  in 05. Refresh the snapshot as part of changing a starting state, never after.
- 2026-09-08 `check-solutions.mjs` ignores a workspace argument and always runs
  all eight, which means it resets all eight. `snapshot.mjs` and `reset.mjs` do
  honor theirs. Do not assume the argument works.
- 2026-09-08 Example 07 was rebuilt. The changelog demo (`/ship`, `/explain`,
  `/db:seed`, `/db:reset`, `src/changelog/`, `src/db/`, `src/orders/`, five test
  files) is gone. It is now three commands over a 50 issue backlog for a
  fictional order processing service: `/grab:next` returns the same 3 quick, 2
  mid, 1 complex every run, `/grab:complex` asks with `AskUserQuestion`, and
  `/grab:up-for-grabs [area]` shows `$1` reaching the shell command. Nothing is
  ever assigned and no issue is worked.
- 2026-09-08 07 now starts green, the way 02 and 05 do, so its `.solution/` is a
  README stub. `tests/issues.test.ts` is the CI backstop and keeps the twenty
  run repeatability check from the old `tests/repeatable.test.ts`.
- 2026-09-08 07 ships its backlog ready in `data/issues.json`. Nothing seeds or
  generates it. `/start` only resets and prints the backlog counts, and
  `PROMPT.md` holds `/grab:next`. Both files stay because `scripts/verify.mjs`
  requires them in every workspace and `scripts/build-site.mjs` renders
  `PROMPT.md` as the verbatim prompt. Nothing injects `PROMPT.md` any more, so
  the slash command in it is never expanded and never needs to be.
- 2026-09-08 07's README carries the GitHub swap, since the fixture is standing
  in for a real tracker. Two routes: `!`gh issue list --label "help wanted"`` in
  the command file with no script at all, or `tools/issues.mjs` reading
  `gh issue list --json` instead of the file. The command files do not change
  either way, which is the point worth saying out loud.
- 2026-09-08 07 assumes `$1` is substituted before a `!` shell injection line
  runs, so `up-for-grabs.md` injects `node tools/issues.mjs up-for-grabs $1`.
  That order has not been confirmed on 2.1.263 yet. `tools/issues.mjs` treats an
  argument starting with `$` as no filter, so the command still prints the full
  list if the substitution does not happen. Confirm it on the demo machine.
- 2026-09-08 `scripts/verify.mjs` requires a `src/` directory in every
  workspace. 07 keeps `src/issue.ts` (the `Issue` type and the `NEXT_MIX`
  constant) so the directory holds something the tests actually import.
- 2026-09-08 07 dropped `/start`, `/reset` and `/teardown`. The lesson is "run a
  command and read what comes back", so an opener was one step in front of the
  point. `scripts/verify.mjs` used to require `.claude/commands/start.md` in
  every workspace, which would have failed CI, so start.md moved out of
  `SKELETON_FILES` and into a warning. The other seven still have theirs.
  `npm start` and `npm run reset -- 07` still work, since those are repository
  scripts rather than slash commands.
- 2026-09-08 All three of 07's grab commands now ask with `multiSelect: true`.
  A morning is rarely one issue, and a single select picker forces a second
  round trip. The command files carry the instruction and each one now prints
  one line per issue picked, with a rule for an empty selection.
- 2026-09-08 07's `tools/issues.mjs` keeps its `teardown` subcommand even though
  `/teardown` is gone. `reset.json` restores `tools/`, so editing the script
  would drift from `.pristine/` and be silently reverted by the next reset.
  `.claude/commands/` and `README.md` are not in the restore list, which is why
  those edits survive.
- 2026-09-09 06 is one command on stage. `npm run go 06` reads
  `examples/06-agent-board/launch.json` (`args` plus `prompt`) and launches
  `claude --model opus --effort low /start`. `go.mjs` reads that file for any
  workspace, appends anything typed after `--`, and takes `--no-prompt` to skip
  the opening prompt. `launch.json` is not in `reset.json`, so a reset leaves it
  alone. Whether a slash command passed as the initial prompt expands is not
  confirmed on 2.1.263. Check it on the demo machine, and fall back to typing
  `/start` if it does not.
- 2026-09-09 06's `SubagentStart` used to print nothing, so the screen sat blank
  until the first agent finished. `subagent-line.mjs` now prints an in character
  opener per agent from an `OPENERS` table on start. The hook says it, so it
  costs zero output tokens and lands at dispatch time. The gap between the four
  openers and the four closing lines is the fan out made visible.
- 2026-09-09 06's Stop hook now prints the summary and the changed file list
  with line counts, which replaces `cat RESULT.md` and `git diff --stat` after
  the run. A Stop hook runs after the turn ends, so the model cannot read
  `RESULT.md` in the same turn. The hook is the only thing that can show it.
- 2026-09-09 `complete.mjs` threw away stdout on the pass path, so `testScore`
  never matched and a green run read `verify ok` instead of `typecheck ok tests
  36/36`. It keeps stdout on both paths now. `changedFiles` also byte compares
  against `.pristine/` instead of shelling out to `git diff --no-index`, so it
  returns paths and line counts and needs no repository.
- 2026-09-09 The warm up advice for 06 was wrong and is gone from the README,
  `docs/before-the-talk.md`, and `site/content/24-subagents.md`. Two green runs
  of `npm test` in 06 came back at 4.6s and 5.1s, slowest last, so a throwaway
  run buys nothing. `npm install` at the root is the only bootstrap, once per
  clone. Demos have to be runnable immediately with no setup step.
- 2026-09-09 Confirmed on 2.1.263: a slash command passed as the initial prompt
  expands. A scratch workspace with `.claude/commands/ping.md` returned `PONG`
  from `claude -p "/ping"`. That is what makes `npm run go NN` a one command
  demo.
- 2026-09-09 Seven of the eight workspaces now ship a `launch.json`. Six hold
  `{ "prompt": "/start" }`, 06 also holds its model and effort flags, and
  04-progressive holds a note and no prompt, because its demo starts with
  `/mode-fat` or `/mode-lean` and firing one would pick the comparison.
- 2026-09-09 07 does have `.claude/commands/start.md`. The earlier bullet saying
  07 dropped `/start` is wrong about the file. What 07 dropped is `/reset` and
  `/teardown`, and `start.md` is out of `SKELETON_FILES` in `verify.mjs`.
- 2026-09-09 A nested headless `claude -p` run inside a workspace can reach the
  whole repository. One launched in 07 appears to have run an unscoped
  `npm run reset`, which reset all eight workspaces and deleted four tracked
  files. Run throwaway sessions in a scratch directory outside the repository.
- 2026-09-09 Three `.claude/.complete-state.json` files are committed (05, 07,
  08) even though every reset deletes them, so `git status` goes dirty after a
  demo. A `.gitignore` entry would fix it. Not done yet.
- 2026-09-09 03 builds nothing. It used to end by writing cursor pagination
  into `src/orders.ts` and had a test suite pinning the three answers. Both
  are gone. The run now ends at the sharpened request, two sentences naming the
  change, and `src/orders.ts` is read only by a deny rule. A workspace opts out
  of code checks by leaving `verify` out of `reset.json`. `start.mjs`,
  `verify.mjs`, and `check-solutions.mjs` all read that signal.
- 2026-09-09 A command file in the root `.claude/commands/` loads into the
  example sessions. Confirmed on 2.1.266: a scratch `ping.md` at the root
  answered `PONG` from `claude -p "/ping"` run inside `examples/01-ts-conventions`.
  Commands behave like skills and `CLAUDE.md`, not like `settings.json`. That is
  why the stage launcher is a shell script and not a slash command, and why
  `verify.mjs` keeps the root `.claude/` bare.
- 2026-09-09 `./go NN` at the repository root is the launcher. It is a three
  line `sh` wrapper around `scripts/go.mjs`, so `npm run go NN` still works and
  the logic lives in one place. A slash command could not do this job anyway,
  since it runs inside a session that has already picked its launch directory.
- 2026-09-09 06's four agents each carry a voice and an icon (🧬 copperhead,
  📘 cottonmouth, 🚦 black-mamba, 🔍 sidewinder). The icons live in the
  `ICONS` table in `subagent-line.mjs` next to `OPENERS`, and each agent prompt
  repeats its own icon. The pre edit line is gone. Each agent now writes its
  file and then signs off with one line, under twenty words, and `PROMPT.md`
  tells Bill to print that line word for word instead of paraphrasing. Only an
  agent's final message reaches the parent, so a line printed before the edit
  was never visible on stage.
- 2026-09-09 06 opens with the same `You asked:` receipt 03 uses, added to
  `.claude/commands/start.md`. 06's `PROMPT.md` carries stage direction as well
  as the ask, so the receipt quotes the first paragraph word for word rather
  than the whole file. `.claude/commands/` is not in `reset.json`, so the edit
  survives a reset and needs no snapshot refresh.
- 2026-09-09 An emoji is two terminal columns wide and a markdown table
  renderer counts it as one, so every data row with an icon sits one column off
  the header. 06 keeps icons out of every table it prints and puts them in the
  free text lines instead.
- 2026-09-09 The transcript line for a subagent shows the `description` passed
  to Task, under a fixed `Agent` label that nothing in the workspace controls.
  06's `PROMPT.md` says the description is the agent's name in lower case, so
  the line reads `Agent "copperhead"` rather than a paraphrase of the work.
- 2026-09-09 `scripts/lint-prose.mjs` scans `REVIEW.md`, which sidewinder
  writes on every run, so an em dash in a review turns the repository lint red.
  Every 06 agent prompt now bans em dashes in its output. Reset restores the
  `REVIEW.md` stub, so a red lint after a demo clears with a reset.

