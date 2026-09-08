# Solved state for 05-tools-and-output

`tools/board.mjs` after the prompt `Give every subcommand in tools/board.mjs a
short default output and put the full payload behind --json, then make npm test
pass.` lands. One file changes. `src/`, `mcp/`, and `tests/` stay as they are.

What the file gains:

- `--json` and `--verbose` in the argument parser. `--verbose` turns on `--json`
  too, so it is a superset and never a second output format.
- A shared `summary()` helper used by `list` and `search`. It prints a headline
  with the counts, one line of channel tallies, the newest five rows, and a
  pointer at `--json`. Nine lines, under 800 characters.
- An `emit()` helper for the escape hatch. It writes the payload as pretty
  printed JSON and nothing else, so a pipe into `jq` works. `--verbose` adds the
  database path at the top and an `elapsed` line at the bottom.
- Payload keys the hook and the tests both name: `returned`, `matched`,
  `channels`, `messages`, and `posted` with `total` for `post`.
- A help text that names all three subcommands and all three output flags in 19
  lines.

Measured on the seeded test board of 322 messages:

| | default | `--json` |
| --- | --- | --- |
| `list` | 9 lines, 643 bytes | 70,058 bytes |
| `search backup` | 9 lines, 746 bytes | 8,985 bytes |
| `post` | 2 lines, 78 bytes | the inserted row plus the board total |

Copy it over the live files when a live run stalls:

```
npm run solution -- 05
```

Then keep talking. `npm run reset -- 05` puts the starting state back.

Do not edit anything here during a demo.
