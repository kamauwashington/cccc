# Terminal captures

Every terminal pane on this site is an approximation. The commands in them are
verified against the docs, and what comes back is drawn to the right shape
rather than recorded from a live run.

Two are now real, recorded at 2.1.267: the opening screen and the `/model`
picker. The rest are still approximations.

Most of the list is scripted. On a machine where `claude` is signed in:

```bash
pip install pyte
npm run capture              # every scripted screen
npm run capture -- model     # just one
```

`scripts/capture-console.py` drives `claude` in a pseudo terminal at 76
columns, the width the site renders at, and writes what the screen showed to
`site/captures/<name>.txt`. It replaces your username, hostname and home path
before writing.

A fence tagged `capture:<name>` prefers that file over the text written inline,
so a recording replaces an approximation with no edit to the page. Delete the
file and the page falls back.

It cannot run in a sandbox with no route to the service. Both of the
environments this site was built from are blocked, one by an egress proxy
returning 403 and one with no route at all, which is why the list still exists.

## Before you start

Use a throwaway folder with a small real project in it, so the read everything
prompt has something to chew on and the output stays a readable size. Around a
dozen files is right.

```bash
claude --version    # record this. Every capture is only true for one version.
cd ~/some/small/project
```

Keep the terminal window narrow, about 76 columns. A wide capture wraps badly
in the page and has to be re-taken.

## The list

Each row is one pane in `site/content/005-first-session.md`. The tab column
says which tab it sits in.

`npm run capture` covers the scripted rows. The two prompt rows need a real
answer, so their output depends on the folder you run them in. Run those by
hand.

| Tab | Run exactly this | State |
| --- | --- | --- |
| First run | `claude` | Recorded at 2.1.267 |
| First run | `/model` | Recorded at 2.1.267 |
| First run | `Read every file in this folder and tell me in one sentence what this project is for.` | By hand. Every tool call line, then the one sentence answer. |
| Modes | `Shift` and `Tab`, four times | By hand. The status line after each press, so the four mode names are real. |
| Context and usage | `/context` | Scripted. Run it straight after the read everything prompt. |
| Context and usage | `/usage` | Scripted |
| Context and usage | `/clear` then `/context` | Scripted, so the before and after come from one session |
| Subagents | `Using three subagents in parallel, have one summarise the README, one list the dependencies, and one count the files by type. Then give me a single table of what they found.` | By hand. Whether it fanned out at all, the agent lines, and the final table. |
| Getting out | `Esc` mid response | By hand. What the interrupted turn looks like. |
| Getting out | `Ctrl` and `C` with text typed | By hand. That the input clears rather than the turn stopping. |

## The two that matter most

The subagent one, because the page claims a plain prompt is a request rather
than a guarantee. Run it several times and record how often it actually fans
out. If it goes three for three, the page should say so. If it splits, the page
should say that instead. Either way the claim stops being a guess.

The interrupt pair, because the page corrects a habit. Capture both and there
is no argument left.

## When the captures land

The scripted ones land in `site/captures/` and the build picks them up. For the
ones you record by hand, paste the screen into the matching `capture:` fence in
`site/content/005-first-session.md`, or save it as
`site/captures/<name>.txt` yourself. Then update the approximation note near
the top of the First run tab, add a line to `MEMORY.md` with the version, and
rebuild.

```bash
npm run build
```

Captures go stale. When the pinned version moves, this list is the thing to
walk again, the same way `docs/before-the-talk.md` gets walked.
