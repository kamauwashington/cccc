# Decisions

The build plan left five things open. Here is what got chosen and why. Change
any of them, and change this file at the same time.

## The joke in the 06-agent-board README

Placeholder is in place. It is absurdist and it names no company.

The shape: nobody asked for an agent to agent message board. The agents did not
ask for it either. They have nothing to say to each other. They said it anyway,
in OpenAPI 3.1, and then one of them reviewed it.

The presenter writes the final wording. The README says so out loud.

## Where `.pristine/` lives

Inside each workspace, one per example.

A single folder at the repository root would be smaller. Per workspace keeps
each folder independently copyable, which is the whole take home goal. An
attendee can copy `examples/02-hooks/` out on its own and `npm run reset` still
works.

## Whether `go.mjs` is worth having

Kept, and deliberately made loud.

The argument against it is real. Typing `cd examples/02-hooks && claude` by hand
teaches the launch directory rule better than a script that hides it. So
`go.mjs` prints the exact `cd` command it is about to run before it runs it.
The README tells people to type the `cd` by hand the first two times.

## Minimum Claude Code version

Floor: **2.1.0**. Tested on: **2.1.263**.

`scripts/preflight.mjs` fails below the floor and warns on any version other
than the tested one. A warning means walking `docs/before-the-talk.md` again,
since the items on that list move between versions.

## Test runner and TypeScript setup

Vitest, per workspace, with no shared base config.

`expectTypeOf` comes from Vitest and the build plan calls for it. Type level
assertions are checked by `tsc --noEmit`, so a broken type assertion fails
`npm run typecheck` rather than silently passing at runtime. Every workspace
carries its own `tsconfig.json` and its own `vitest.config.ts`, which matches
the isolation rule and keeps each folder copyable.

Dependencies are hoisted from the root `package.json` through npm workspaces.
An attendee copying one folder out needs to run `npm install` in it, and the
README for each example says so.
