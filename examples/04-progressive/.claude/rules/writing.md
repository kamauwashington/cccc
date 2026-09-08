---
description: Writing rules for every markdown file in this repository
paths: ["**/*.md"]
---

# Writing rules

These apply to every README, code comment, skill file, and command file here.
`node scripts/lint-prose.mjs` at the repository root enforces some of them and
gates CI.

1. No em dashes. No en dashes. Use a period, a comma, or parentheses.
2. No "not X, but Y" sentence construction. Say the thing directly.
3. Plain language. Write "runs before the tool call" instead of "intercepts the
   invocation lifecycle". Assume the reader is skimming on a projector.
4. Short sentences. Break long ones in two.
5. No filler openers. Delete the phrase and start with the point.
<!-- prose-lint-ignore -->
6. Banned words: "delve into", "leverage" as a verb, "at the end of the day".

To quote a banned phrase on purpose, put `<!-- prose-lint-ignore -->` on the
line before it in markdown, or `// prose-lint-ignore` in a source comment.
Fenced code blocks are already skipped.
