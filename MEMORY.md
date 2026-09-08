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
- 2026-09-08 The 08 test suite compares `src/report-check.ts` against the
  shipped style file, including running the style's own worked example through
  the checker. Editing `.claude/output-styles/report.md` without editing the
  checker turns the suite red, which is intended.
- 2026-09-08 Example 01's prompt is `Make sure the code follows our standards.`
  It never says "enum" and never names a file. `CLAUDE.md` plus the
  skill description carry the whole retrieval. Verified with three cold headless
  runs on 2.1.263. All three went green at 26 tests, all three loaded
  `ts-conventions`, none read `.solution/`.
- 2026-09-08 `permissions.deny` entries like `Read(./.solution/**)` do not stop
  Bash. With the rules loaded, `cat` and `sed` read the file. Keeping a demo run
  out of `.solution/` needs a PreToolUse hook on Bash.
- 2026-09-08 `npm start` in any workspace is the demo one liner. It calls
  `scripts/start.mjs NN`, which resets, then shows the first red signal and
  stops. It always exits 0, because a non zero exit makes npm print seven lines
  of its own error block over the output.
- 2026-09-08 The eight examples do not start red the same way. 01, 04, and 06
  are red on typecheck. 03, 05, 07, and 08 are red on tests only. 02 starts
  fully green, since its demo is about hooks firing and not about fixing code.
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
- 2026-09-08 Example 03's prompt used to be "Implement src/sharpen-check.ts and
  src/concise-check.ts so that npm test passes." That never exercised the two
  skills, since naming the files is the opposite of a rough request. `PROMPT.md`
  is now a bloated request about an orders endpoint, the checkers ship working,
  and the red test is `tests/output.test.ts` over `OUTPUT.md`.
- 2026-09-08 The skills in 03 end by running the checker on their own draft. A
  checker that ships as a stub breaks that step, so any example whose demo is a
  skill firing has to ship the code the skill calls in working order.
- 2026-09-08 `.tmp/` is gitignored repo wide, so a draft written there cannot be
  a test target and cannot live in a `.solution/`. Example 03 saves its block to
  `OUTPUT.md` at the workspace root instead, and `OUTPUT.md` is in the 03
  `reset.json` restore list.
- 2026-09-08 03's `.claude/commands/start.md` adds `Skill` to `allowed-tools`,
  which is the one place it diverges from `template/`. The demo is a skill
  firing, so the allowance is stated rather than assumed.
- 2026-09-08 The documentation site is generated by `scripts/build-site.mjs`
  into one self contained `site/index.html`, plus `site/artifact-body.html`
  which is the same page without the document wrapper for publishing as an
  Artifact. Concept pages are hand written in `site/content/*.md`. Everything
  else is read off the repository, so a ninth example appears with no edit to
  the script.
- 2026-09-08 `node scripts/build-site.mjs --check` is a CI gate. Editing a
  content page, a workspace README, `MEMORY.md`, or the build script itself
  turns it red until `npm run site` is run and the output is committed.
- 2026-09-08 `site/logo.png` is inlined as a base64 data URI so the page stays
  one file. Swap the file and rebuild to change the mark. Delete it and the
  hero falls back to the title on its own.
- 2026-09-08 In `.gitignore`, a pattern with a slash in the middle anchors to
  the repository root. `.claude/settings.local.json` therefore covered only the
  root copy and missed all eight workspace copies. The rule is
  `**/.claude/settings.local.json`. A global ignore file on one machine can hide
  this, so test with
  `git -c core.excludesFile=/dev/null check-ignore -v <path>`.
