#!/usr/bin/env bash
set -euo pipefail

# Runs the billing brief under Harbor, the arm with the skills, the lookup, and
# the checker. Each run gets its own container, where the agent and the scorer
# can both start a dev server and Chromium, which `claude plugin eval`'s
# sandbox refuses.
#
#   bash scripts/eval-harbor.sh [runs]
#   bash scripts/eval-harbor.sh --prepare   build the images and the task, run nothing
#
# Claude Code signs in with the subscription token `claude setup-token` prints,
# read from $LIVE_TOKENS_EVAL_TOKEN_FILE (default
# ~/.config/live-tokens-eval/oauth-token), so the token never reaches a command
# line. Results land in scratch/harbor/jobs/.

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

prepare=false
runs=1
if [ "${1:-}" = "--prepare" ]; then prepare=true; elif [ -n "${1:-}" ]; then runs="$1"; fi
token_file="${LIVE_TOKENS_EVAL_TOKEN_FILE:-$HOME/.config/live-tokens-eval/oauth-token}"
if ! $prepare && [ ! -s "$token_file" ]; then
  echo "eval-harbor: no token in $token_file. Run 'claude setup-token' and save the token there." >&2
  exit 1
fi
command -v harbor >/dev/null || { echo "eval-harbor: install Harbor with 'uv tool install harbor'." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "eval-harbor: Docker is not running." >&2; exit 1; }

npm run build:eval-project

base="scratch/harbor/base"
rm -rf "$base"
mkdir -p "$base/project"
tarball="$(npm pack --silent --pack-destination "$base")"
mv "$base/$tarball" "$base/live-tokens.tgz"
# The project's node_modules is installed for macOS; the image installs its own.
rsync -a --exclude node_modules --exclude .built-from --exclude package-lock.json scratch/eval-project/ "$base/project/"
node -e "
  const fs = require('fs');
  const p = '$base/project/package.json';
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  j.dependencies['@motion-proto/live-tokens'] = 'file:/opt/live-tokens.tgz';
  fs.writeFileSync(p, JSON.stringify(j, null, 2));
"
cp .claude/evals/harbor/Dockerfile.base "$base/Dockerfile"
docker build -q -t live-tokens-eval-base "$base"

case_dir=".claude/evals/outcome-build-billing"
task="scratch/harbor/tasks/billing-both"
rm -rf "$task"
mkdir -p "$task/environment/skills" "$task/tests/graders"
cp -R .claude/skills/live-tokens-* "$task/environment/skills/"
cp .claude/evals/_scaffold/isolate.mjs "$task/environment/"
cat > "$task/environment/Dockerfile" <<'EOF'
FROM live-tokens-eval-base
COPY isolate.mjs /tmp/isolate.mjs
RUN node /tmp/isolate.mjs && rm /tmp/isolate.mjs
COPY skills /opt/skills
EOF
awk 'NR == 1 && /^---$/ { front = 1; next } front && /^---$/ { front = 0; next } !front' "$case_dir/prompt.md" > "$task/instruction.md"
cp "$case_dir"/graders/*.md "$task/tests/graders/"
cp .claude/evals/harbor/grade.mjs .claude/evals/harbor/test.sh "$task/tests/"
cat > "$task/task.toml" <<'EOF'
schema_version = "1.4"

[agent]
timeout_sec = 3600

[verifier]
timeout_sec = 1800

[environment]
build_timeout_sec = 1200
workdir = "/app"
skills_dir = "/opt/skills"
memory_mb = 8192
EOF
docker build -q -t live-tokens-eval-billing-both "$task/environment"
if $prepare; then echo "eval-harbor: prepared $task"; exit 0; fi

CLAUDE_CODE_OAUTH_TOKEN="$(cat "$token_file")"
export CLAUDE_CODE_OAUTH_TOKEN
export CLAUDE_FORCE_OAUTH=1 HARBOR_TELEMETRY=0
unset ANTHROPIC_API_KEY
harbor run -p "$task" -a claude-code -m anthropic/claude-opus-5-5 \
  -k "$runs" -n "$runs" -o scratch/harbor/jobs --ak max_turns=200
