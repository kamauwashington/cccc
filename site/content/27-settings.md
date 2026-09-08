---
title: Settings
section: Claude Code concepts
order: 8
summary: Read from the directory you launch in, and never inherited from a parent. That single fact is why every workspace in this repository carries a complete copy of its own configuration.
facts:
  Committed file | `.claude/settings.json`. Portable. No absolute paths.
  Generated file | `.claude/settings.local.json`. Gitignored.
  Written by | `scripts/setup.mjs`, on every install and after every reset
  Read | at launch. A change needs a restart.
  Checked by | `scripts/verify.mjs`
docs:
  Settings | settings
  Settings reference | settings-reference
  Permissions | permissions
  CLI reference | cli-reference
tabs:
  The files | The committed half | The generated half
  Permissions | Permissions are about tool calls | Turning things off for one session
  What breaks | What breaks
---

## The committed half

Every workspace ships the same shape, straight from the template.

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "autoMemoryEnabled": false,
  "permissions": {
    "deny": ["Read(./.pristine/**)", "Edit(./.pristine/**)"],
    "allow": [
      "Bash(npm test)",
      "Bash(npm run typecheck)",
      "Bash(npm run reset:*)"
    ]
  },
  "hooks": {
    "Stop": [ { "hooks": [{ "type": "command", "command": "node .claude/hooks/complete.mjs" }] } ]
  }
}
```

`verify.mjs` fails the build if this file holds an absolute path, because the
folder has to stay copyable. It also warns when a workspace has no Stop hook.

## The generated half

`scripts/setup.mjs` writes `.claude/settings.local.json` into every workspace.
It exists because two settings need absolute paths, which cannot be committed.

**`autoMemoryDirectory`** redirects auto memory into the workspace, where it is
visible and easy to wipe. The value has to be absolute or start with `~/`. A
relative path is ignored. Local scope is used because whether project scope is
honoured is contested across doc versions, and local scope works either way.

**`claudeMdExcludes`** takes globs matched against absolute paths. It covers
`.claude/rules/` files as well as `CLAUDE.md` files. The two home directory
entries matter most, because they stop the presenter's personal instructions
from changing a demo.

The script keeps any keys added by hand and overwrites only what it owns, so a
presenter can add a setting without losing it on the next reset.

## Permissions are about tool calls

`permissions.allow` and `permissions.deny` govern which tools Claude may call.
Two things they do not do:

- A deny rule does not stop a file from auto loading into context.
- `Read(./.solution/**)` does not stop Bash. With the rules loaded, `cat` and
  `sed` read the file.

For anything that has to hold, use a [hook](#/hooks).

## Turning things off for one session

```bash
claude --settings '{"disableAllHooks": true}'   # hooks off, CLAUDE.md still loaded
claude --strict-mcp-config                      # ignore MCP servers for this session
claude --model opus --effort low                # per session model and effort
claude --agent sidewinder                       # run the whole session as one agent
```

Avoid `--safe-mode` when you want a demo to still load its context. It disables
hooks, and it also disables `CLAUDE.md`, skills, and commands.

## What breaks

- **Launching from the repository root.** Settings do not inherit, so you get
  none of the example's configuration.
- **Committing `settings.local.json`.** It holds one machine's absolute paths.
  It is gitignored, and `verify.mjs` fails if the gitignore entry goes missing.
- **Hand editing the generated file.** The next reset runs `setup.mjs` again
  through `postReset`.
- **Editing settings mid session.** Claude Code read the file at launch.
  Restart the CLI.
