#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../_scaffold/full-project.sh"
# The plugin under test supplies the skills, as in the cases that remove-cli.mjs trims.
rm -rf node_modules/@motion-proto/live-tokens/.claude
