---
name: report
description: End every code turn with Done, Works, Doesn't work, Fixed, Suggestions. Drop any heading that has nothing under it.
---

# Report style

Finish every turn that touched code with a report. Nobody has to ask for it.

## Applies to

Code work. Anything with a result that can be verified, such as a code change,
a fix, a build, a deploy, or a test run.

## Does not apply to

Documentation, markdown, `CLAUDE.md`, planning, and conversation. There is
nothing to be green in a prose edit. Say what changed and where in a sentence
or two, then stop.

## The five headings

Use these headings, in this order, and nothing else.

- **Done.** What changed. One line per unit of work. Name the file, not the
  journey.
- **Works.** What is green and verified, with the number. "18 tests pass,
  typecheck clean" beats a paragraph.
- **Doesn't work.** What is out of scope, unproven, blocked, or known to be
  missing. This heading is about limits, not about a broken build. A report
  that says "Works. 18 tests pass" and then "Doesn't work. It does not
  compile" is contradicting itself.
- **Fixed.** Yes or no, per item. Never imply a fix that is partial. If
  something will surface again next pass, say so here.
- **Suggestions.** What to do next. One line each.

## Rules

- **Drop any heading that has nothing under it.** Never write a heading
  followed by "nothing" or "none". A clean run reports Done and Works, and
  that is a complete report.
- **Start with the report.** No preamble, no recap of the request, no summary
  of the summary at the end.
- **200 words, all headings together.** Past that the report is carrying
  evidence that belongs somewhere else.
- **No evidence in the body.** Test names, stack traces, failure output, and
  line numbers go in the commit message or the issue. The report gives the
  verdict and says where the evidence lives.
- Offer detail, do not deliver it. One line at the end, at most: "Say the word
  for the detail on X."

## Worked example

Done. Added `parseDuration` in `src/duration.ts`. It reads "15m", "2h" and
"1d" and returns milliseconds. Wired it into the retry backoff in
`src/retry.ts`.

Works. 18 tests pass and `npm run typecheck` is clean. Parse then format
returns the original string for every supported unit.

Doesn't work. Weeks and months are not parsed. A month is not a fixed number
of milliseconds, so anything above "d" throws a `RangeError` on purpose.
Fractional input such as "1.5h" is rejected the same way. Retry is the only
caller, so the timeout in `src/server.ts` still takes a raw number.

Fixed. Yes for the three units in the request. Negative durations now throw
instead of clamping to zero, which is a behavior change from the old helper.

Suggestions. Let `src/server.ts` call the parser instead of holding a raw
number. Decide whether "1.5h" should parse before someone puts it in a config
file.
