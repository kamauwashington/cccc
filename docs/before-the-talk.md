# Verify these before the talk

These details move between Claude Code versions. Check each one on the pinned
version during rehearsal. Tick the box when you have seen it work with your own
eyes.

Pinned floor: **2.1.0**. Tested on: **2.1.263**.

Run `npm run preflight` first. It covers the mechanical checks. This list covers
the ones only a human can confirm.

## Subagents (example 06)

- [ ] Is `effort` supported in subagent frontmatter on this version?
- [ ] What is the exact `SubagentStop` hook event name? The visibility line in
      example 06 depends on it.
- [ ] Does `skills` frontmatter preload skills into a subagent, or does the
      agent still have to search?

## Hooks (examples 02, 05, 06)

- [ ] Does the `Stop` hook fire on normal turn completion, or only at session
      end? The completion signal in every workspace assumes turn completion.
- [ ] Does exit code 2 block the call and pass stderr to the model? Both the
      block beat in example 02 and the output guard depend on it.
- [x] What is the flag that disables all hooks for beat one of example 02?
      **Confirmed on 2.1.263.** There is no `--disable-all-hooks` flag. Use:
      `claude --settings '{"disableAllHooks": true}'`
      Do not use `--safe-mode`. It disables hooks, and it also disables
      `CLAUDE.md`, skills, and commands. Beat one needs the `CLAUDE.md` rule
      loaded so the audience watches the model walk past it.
      Re-check this if the version changes.

## Reset and rewind (all examples)

- [ ] Does `/rewind` restore files under `.claude/`? If it treats them as
      configuration rather than code, the `CLAUDE.md` half will not come back
      and `npm run reset` is needed instead.
- [ ] Does `npm run reset -- NN` followed by `/clear` fully reset an example
      without restarting the CLI?
- [ ] Does `/start` reset the workspace and run the prompt in one turn, without
      a permission prompt on `npm start`?

## Settings and memory

- [ ] Is `autoMemoryDirectory` honoured from project scope on this version?
      The repository uses local scope, which works either way.
- [ ] Does the system prompt name the configured memory directory? There is a
      known report that it still names the default path. The workaround is one
      line in the workspace `CLAUDE.md` naming the correct path. That line is
      already there.
- [ ] Do `claudeMdExcludes` patterns actually stop `~/.claude/CLAUDE.md` from
      loading? Check `/context` in a workspace.

## Output limits (example 05)

- [ ] What is the Bash output limit on this version?
- [ ] Does `BASH_MAX_OUTPUT_LENGTH` change it?
- [ ] Measure with `/context` before and after a known large command, so the
      number on the slide in example 05 is real. Write the measured number into
      the example 05 README before the talk.

## Output styles (example 08)

- [ ] Does `/output-style` list the project style from
      `.claude/output-styles/report.md`? The picker reads the frontmatter
      `name`, which has to match `outputStyle` in `.claude/settings.json`.
- [ ] Does switching with `/output-style default` and back hold for the rest of
      the session, and does it write the choice into settings?
- [ ] Ask a documentation question with the style on. There is nothing to be
      green in a prose answer, so watch what lands under "Works". This is where
      a style drifts, and the honest version of the example says a style shapes
      output and does not enforce it.
- [ ] Run `npm start` in `examples/08-report-style`. It should say typecheck
      clean, 4 tests passed, and that the workspace starts green on purpose.
      Express comes from the root `node_modules`, so a workspace with no
      install of its own is expected.
- [ ] Check `~/.claude/output-styles/` is empty on the presentation machine. A
      personal style there competes with the project one.

## The presentation machine

- [ ] Run `claude doctor`. It reports skill list truncation and unused MCP
      servers, which is exactly the leakage story.
- [ ] **Move `~/.claude/skills/ts-enum/` aside before example 01.** This is a
      real conflict on the current machine, found during the build.

      That skill says "Never use `type Foo = 'bar' | 'baz'` for a fixed set of
      string options. Always use an `enum` with explicit string values."
      Example 01 teaches the opposite: no `enum` keyword, use a const object
      plus a union type. The skill auto-invokes on exactly the work example 01
      asks for.

      It already caused a real failure. The agent that built example 06 picked
      the rule up and wrote a `ts-conventions` skill that contradicted example
      01. That got corrected, and the machine level skill is still there.

      There is no setting that excludes skills from the home directory.
      `claudeMdExcludes` covers `CLAUDE.md` and `.claude/rules/`, and it does
      not cover skills. Moving the folder is the only fix:

      ```bash
      mv ~/.claude/skills/ts-enum /tmp/ts-enum.parked
      ```

      This is worth saying out loud during the talk. It is the leakage story
      happening for real, on the presenter's own machine, to the one example
      that teaches enum conventions.

- [ ] Check that nothing else in `~/.claude/skills/` changes the demos.
      `npm run preflight` warns when that folder is not empty.
- [ ] Check that `~/.claude/CLAUDE.md` does not change the demos.
- [ ] Install once per machine with `npm install` at the root. No warm up run.
      A second test run in example 06 is no faster than the first.

## Timing

- [ ] Measure example 06 wall clock over ten runs. Build the slide segment
      around the p90, not the fastest run. If it will not fit under about 60
      seconds, cut scope.
- [ ] Measure example 04 over ten runs and put the real median on the slide.
      Do not promise a ratio in advance.
