#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../_scaffold/full-project.sh"
# The same project without the checker, so the arm measures the skills apart
# from the checks they run. The component lookup still works.
node "$(dirname "${BASH_SOURCE[0]}")/../_scaffold/remove-checker.mjs"
