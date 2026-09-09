#!/bin/sh
# Launches Claude Code inside one example workspace.
#
#   ./go 02
#
# Everything it does lives in scripts/go.mjs. This file exists so the launch
# command is short enough to type on stage and does not go through npm.
exec node "$(dirname "$0")/scripts/go.mjs" "$@"
