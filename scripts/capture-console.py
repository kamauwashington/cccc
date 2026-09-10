#!/usr/bin/env python3
"""Record real Claude Code screens for the documentation site.

    npm run capture              record every screen in STEPS
    npm run capture -- model     record one of them

It drives `claude` inside a pseudo terminal at the width the site renders at,
lets the screen settle, then writes exactly what the terminal showed to
site/captures/<name>.txt. The build prefers those files over the
approximations written inline in the markdown, so a recording replaces an
approximation with no edit to the page.

Run it on a machine where `claude` is signed in. It cannot run in a sandbox
with no route to the service.

Needs pyte, which renders the escape sequences into a screen:

    pip install pyte
"""

import os
import pty
import re
import select
import sys
import time

COLS = 76          # the width the site's console panes render at
ROWS = 30
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "captures")

# name, keys to send, seconds to wait afterwards. None means capture the
# opening screen before sending anything.
STEPS = [
    ("startup", None, 6.0),
    ("model", "/model\r", 3.5),
    ("context", "\x1b/context\r", 5.0),
    ("usage", "\x1b/usage\r", 5.0),
    ("clear", "\x1b/clear\r", 3.0),
]

PROMPT = "Read every file in this folder and tell me in one sentence what this project is for."
FANOUT = ("Using three subagents in parallel, have one summarise the README, "
          "one list the dependencies, and one count the files by type. "
          "Then give me a single table of what they found.")


def scrub(text):
    """Take the operator out of the recording."""
    home = os.path.expanduser("~")
    user = os.path.basename(home)
    host = os.uname().nodename.split(".")[0]

    text = text.replace(home, "~/your-project")
    # user@host in a shell prompt, whatever the separator
    text = re.sub(r"\b%s[@:]%s\b" % (re.escape(user), re.escape(host)), "~", text)
    text = re.sub(r"\b%s\b" % re.escape(user), "you", text)
    text = re.sub(r"\b%s\b" % re.escape(host), "laptop", text)
    # absolute home paths for any other user
    text = re.sub(r"/(?:Users|home)/[A-Za-z0-9._-]+", "~/your-project", text)
    return text


def run(steps):
    try:
        import pyte
    except ImportError:
        sys.exit("capture: pyte is missing. Run: pip install pyte")

    screen = pyte.Screen(COLS, ROWS)
    stream = pyte.ByteStream(screen)
    env = dict(os.environ, TERM="xterm-256color", COLUMNS=str(COLS), LINES=str(ROWS))

    pid, fd = pty.fork()
    if pid == 0:
        os.execvpe("claude", ["claude"], env)

    shots = []

    def drain(seconds):
        end = time.time() + seconds
        while time.time() < end:
            ready, _, _ = select.select([fd], [], [], 0.25)
            if fd in ready:
                try:
                    data = os.read(fd, 65536)
                except OSError:
                    return
                if not data:
                    return
                stream.feed(data)

    def snap(name):
        lines = [line.rstrip() for line in screen.display]
        while lines and not lines[-1]:
            lines.pop()
        while lines and not lines[0]:
            lines.pop(0)
        shots.append((name, scrub("\n".join(lines))))

    for name, keys, wait in steps:
        if keys is not None:
            os.write(fd, keys.encode())
        drain(wait)
        snap(name)

    try:
        os.write(fd, b"\x1b")
        drain(0.5)
        os.kill(pid, 9)
        os.waitpid(pid, 0)
    except OSError:
        pass

    os.makedirs(OUT_DIR, exist_ok=True)
    for name, text in shots:
        path = os.path.join(OUT_DIR, name + ".txt")
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(text + "\n")
        first = text.split("\n")[0][:52] if text else "(empty)"
        print("  wrote %-12s %3d lines  %s" % (name + ".txt", text.count("\n") + 1, first))

    print("\ncapture: %d screens into site/captures/" % len(shots))
    print("Read them before you trust them, then run: npm run build")


def main():
    wanted = [a for a in sys.argv[1:] if not a.startswith("-")]
    steps = [s for s in STEPS if not wanted or s[0] in wanted]
    if not steps:
        sys.exit("capture: no step matches %r. Known: %s"
                 % (wanted, ", ".join(s[0] for s in STEPS)))

    print("capture: driving claude at %d columns" % COLS)
    print("The prompts that need a real answer are not scripted, because their")
    print("output depends on the folder. Run these two by hand and capture the")
    print("screen yourself:\n")
    print("  " + PROMPT + "\n")
    print("  " + FANOUT + "\n")
    run(steps)


if __name__ == "__main__":
    main()
