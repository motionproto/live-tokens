#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../_scaffold/full-project.sh"
node "$(dirname "${BASH_SOURCE[0]}")/../_scaffold/static-checks.mjs"
node "$(dirname "${BASH_SOURCE[0]}")/../_scaffold/remove-cli.mjs" lookup
