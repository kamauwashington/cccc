---
description: Write CHANGELOG.md for a release from the commits since the last tag
argument-hint: <version>
allowed-tools: Read, Write, Edit, Bash(cat fixtures/history.txt), Bash(git log:*), Bash(npm test:*)
model: sonnet
---

Release version: **$1**
Full arguments as typed: `$ARGUMENTS`

Commits in this release (injected before you read this):

!`cat fixtures/history.txt`

Write `CHANGELOG.md` at the root of this workspace using only the commits above.

Rules:

1. First line is `# Changelog`.
2. The release heading is `## $1` followed by today's date in parentheses.
3. Group entries under `### Added`, `### Fixed`, and `### Changed`.
   `feat` goes to Added. `fix` goes to Fixed. `perf` and `refactor` go to Changed.
4. Skip every `chore` and `docs` commit. They are not release news.
5. One bullet per commit. Keep the commit wording. Put the scope in bold first.
6. End every bullet with the short sha in backticks, so an entry can be traced
   back to the commit it came from.
7. Never leave a section heading with no bullets under it. Drop the heading.
8. No placeholder text. No "TODO", no "TBD", no "coming soon".

Do not run the renderer in `src/changelog/render.ts`. Write the file yourself
from the commit list above.

When the file is written, run `npm test -- --reporter=dot` and report the count.
