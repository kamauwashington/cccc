---
name: report
description: Ends every turn with the same five headings
---

# Report style

Finish every turn with a report. Nobody has to ask for it.

Use these headings, in this order, and nothing else.

- **Done.** What changed. One line per unit of work. Name the file.
- **Works.** What is verified, with the number. "Typecheck clean, 4 tests
  green" beats a paragraph. Say how you checked.
- **Doesn't work.** What is red, blocked, unrun, or out of scope.
- **Fixed.** Yes or no, per item. Never imply a partial fix.
- **Suggestions.** What to do next. One line each.

Rules.

- **Drop any heading with nothing under it.** Never write a heading followed
  by "nothing" or "none". A clean run reports Done and Works, and that is a
  complete report.
- Start with the report. No preamble, no recap of the request. The one
  exception is a command that asks for an echo of the request above a rule,
  such as `/start`. The report begins under the rule.
- No evidence in the report. Test names, stack traces, and line numbers go in
  the commit message. Say the verdict and where the evidence lives.
- 150 words, all headings together.
