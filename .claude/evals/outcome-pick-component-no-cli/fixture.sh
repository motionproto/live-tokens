#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../_scaffold/project.sh"
# The same project without the CLI, so the skill's `live-tokens components`
# step fails and the arm measures the skill apart from the command it names.
rm -rf node_modules/@motion-proto/live-tokens/bin node_modules/.bin
