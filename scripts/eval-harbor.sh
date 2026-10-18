#!/usr/bin/env bash
set -euo pipefail

# Runs the billing brief under Harbor, one job per arm, three trials at once,
# and writes the report. Each trial gets its own container, where the agent can
# start a dev server and Chromium, which `claude plugin eval`'s sandbox
# refuses, and every arm is scored afterwards in a fresh container from one
# verifier image.
#
#   npm run eval:billing                          every arm, each at its run count
#   npm run eval:billing -- --smoke [arm...]      one trial of each arm, the arm with every tool by default
#   npm run eval:billing -- --runs <n> [arm...]   n trials of each arm, every arm by default
#   npm run eval:billing -- --prepare [arm...]    build the images and write the tasks, run nothing
#
# Claude Code signs in with the subscription token `claude setup-token` prints,
# read from $LIVE_TOKENS_EVAL_TOKEN_FILE (default
# ~/.config/live-tokens-eval/oauth-token), so the token never reaches a command
# line. Results land in scratch/harbor/jobs/<time>/<arm>/, and the report in
# eval-reports/<time>/index.html, or eval-reports/<time>-smoke/.

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

# One row per arm, in the report's order; each run's jobs folder gets a copy as
# arms.json, which scripts/eval-check-build.mjs reads. case: the eval case the
# arm stands for. groups: the layers isolate.mjs closes, comma-separated, or -
# for none. skills: shipped, none, or the copy in .claude/evals/_skills/ the
# arm runs. tests: browser, or static when the image turns --tests into the
# static checks. settings: the arm's Claude Code settings, below. runs: the
# arm's trials in a full run, five for the three arms the package leaves whole,
# so their rank tests have the runs to separate them. name: the rest of the
# line, the arm as the report names it.
ARMS='
unattended             outcome-build-billing-no-cli      lookup,checker  none                              browser  base  3  Unattended
skills-only            outcome-build-billing-no-cli      lookup,checker  outcome-build-billing-no-cli      browser  base  3  Skills only
skills-lookup          outcome-build-billing-no-checker  checker         outcome-build-billing-no-checker  browser  base  3  Skills, lookup
skills-checker         outcome-build-billing-no-lookup   lookup          outcome-build-billing-no-lookup   browser  base  3  Skills, checker
skills-lookup-checker  outcome-build-billing             -               shipped                           browser  base  5  Skills, lookup and checker
static-loop            outcome-build-billing             -               billing-static-loop               static   base  5  Skills, lookup and static checker
browser-gate           outcome-build-billing             -               billing-static-loop               static   gate  5  Skills, lookup, static checker and browser gate
'
BRIEF_CASE=outcome-build-billing
SMOKE_ARM=skills-lookup-checker
ARTIFACTS='["/app/src", "/app/tests", "/app/live-tokens.config.json", "/app/live-tokens.testing.ts"]'
FINDINGS=node_modules/@motion-proto/live-tokens/bin/lib/findings.mjs

settings_json() {
  case "$1" in
    base) echo '{}' ;;
    gate) cat <<'EOF'
{
  "hooks": {
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node /opt/eval/browser-gate.mjs", "timeout": 900 }] }
    ]
  }
}
EOF
      ;;
    *) echo "eval-harbor: no settings named $1." >&2; exit 1 ;;
  esac
}

die() { echo "eval-harbor: $*" >&2; exit 1; }
arm_names() { echo "$ARMS" | awk 'NF { print $1 }'; }
arm_row() { echo "$ARMS" | awk -v arm="$1" '$1 == arm'; }
arms_json() {
  ARMS="$ARMS" node -e '
    const rows = process.env.ARMS.split("\n").filter((line) => line.trim()).map((line) => {
      const [arm, kase, groups, skills, tests, settings, runs, ...name] = line.trim().split(/\s+/);
      return { arm, name: name.join(" "), case: kase, groups: groups === "-" ? [] : groups.split(","), skills, tests, settings, runs: Number(runs) };
    });
    console.log(JSON.stringify(rows, null, 2));
  '
}

prepare=false
smoke=false
runs=""
selected=()
while [ $# -gt 0 ]; do
  case "$1" in
    --prepare) prepare=true ;;
    --smoke) smoke=true ;;
    --runs) [ $# -gt 1 ] || die "--runs takes a number."; runs="$2"; shift ;;
    -*) die "unknown option $1. Use --smoke, --runs <n>, --prepare, or arm names." ;;
    *) [ -n "$(arm_row "$1")" ] || die "no arm named $1. The arms: $(arm_names | tr '\n' ' ')"; selected+=("$1") ;;
  esac
  shift
done
if $smoke; then runs=1; fi
if [ ${#selected[@]} -eq 0 ]; then
  if $smoke; then
    selected=("$SMOKE_ARM")
  else
    while IFS= read -r arm; do selected+=("$arm"); done < <(arm_names)
  fi
fi

token_file="${LIVE_TOKENS_EVAL_TOKEN_FILE:-$HOME/.config/live-tokens-eval/oauth-token}"
if ! $prepare; then
  [ -s "$token_file" ] || die "no token in $token_file. Run 'claude setup-token' and save the token there."
  command -v harbor >/dev/null || die "install Harbor with 'uv tool install harbor'."
fi
docker info >/dev/null 2>&1 || die "Docker is not running."

# One verifier image scores every arm, so every case an arm stands for must
# share the brief's graders.
while read -r arm case _; do
  [ -n "$arm" ] || continue
  diff -rq ".claude/evals/$case/graders" ".claude/evals/$BRIEF_CASE/graders" >/dev/null \
    || die "$case's graders differ from $BRIEF_CASE's, and one verifier image scores every arm."
done <<< "$ARMS"

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

verifier="scratch/harbor/verifier"
rm -rf "$verifier"
mkdir -p "$verifier/tests/graders"
cp ".claude/evals/$BRIEF_CASE"/graders/*.md "$verifier/tests/graders/"
cp .claude/evals/harbor/grade.mjs .claude/evals/harbor/checks.mjs .claude/evals/harbor/test.sh "$verifier/tests/"
cp .claude/evals/harbor/Dockerfile.verifier "$verifier/Dockerfile"
docker build -q -t live-tokens-eval-verifier "$verifier"

brief="scratch/harbor/instruction.md"
awk 'NR == 1 && /^---$/ { front = 1; next } front && /^---$/ { front = 0; next } !front' ".claude/evals/$BRIEF_CASE/prompt.md" > "$brief"

write_task() {
  local arm="$1" case="$2" groups="$3" skills="$4" tests="$5" settings="$6"
  local task="scratch/harbor/tasks/$arm"
  local env="$task/environment"
  rm -rf "$task"
  mkdir -p "$env"
  cp "$brief" "$task/instruction.md"
  # Harbor uploads this as Claude's --settings layer, outside /app, so the
  # agent never edits its own hooks.
  settings_json "$settings" > "$task/settings.json"

  cp .claude/evals/_scaffold/isolate.mjs .claude/evals/_scaffold/static-checks.mjs "$env/"
  local close="node /tmp/eval/isolate.mjs"
  [ "$groups" = "-" ] || close="$close ${groups//,/ }"
  # The gate's checker runs read the original findings.mjs, saved before
  # static-checks.mjs rewrites it.
  [ "$settings" != gate ] || close="$close && cp $FINDINGS /opt/eval/findings.mjs"
  [ "$tests" != static ] || close="$close && node /tmp/eval/static-checks.mjs"
  {
    echo "FROM live-tokens-eval-base"
    echo "COPY isolate.mjs static-checks.mjs /tmp/eval/"
    echo "RUN $close && rm -rf /tmp/eval"
    [ "$skills" = none ] || echo "COPY skills /opt/skills"
    [ "$settings" != gate ] || echo "COPY gate/ /opt/eval/"
  } > "$env/Dockerfile"

  if [ "$skills" != none ]; then
    mkdir -p "$env/skills"
    cp -R .claude/skills/live-tokens-* "$env/skills/"
    if [ "$skills" != shipped ]; then
      [ -f ".claude/evals/_skills/$skills/skills.json" ] || die "$arm runs the copy $skills, which .claude/evals/_skills/ does not hold."
      node scripts/eval-stage-skills.mjs "$skills" "$env/skills"
    fi
  fi
  if [ "$settings" = gate ]; then
    mkdir -p "$env/gate"
    cp .claude/evals/harbor/browser-gate.mjs .claude/evals/harbor/browser-tests.mjs .claude/evals/harbor/checks.mjs "$env/gate/"
  fi

  {
    echo 'schema_version = "1.4"'
    echo "artifacts = $ARTIFACTS"
    echo
    echo '[metadata]'
    echo "arm = \"$arm\""
    echo "case = \"$case\""
    echo "groups = \"$groups\""
    echo "skills = \"$skills\""
    echo "tests = \"$tests\""
    echo "settings = \"$settings\""
    echo
    echo '[agent]'
    echo 'timeout_sec = 3600'
    echo
    echo '[verifier]'
    echo 'timeout_sec = 1800'
    echo 'environment_mode = "separate"'
    echo
    echo '[verifier.environment]'
    echo 'docker_image = "live-tokens-eval-verifier"'
    echo 'memory_mb = 8192'
    echo
    echo '[environment]'
    echo "docker_image = \"live-tokens-eval-$arm\""
    echo 'build_timeout_sec = 1200'
    echo 'workdir = "/app"'
    [ "$skills" = none ] || echo 'skills_dir = "/opt/skills"'
    echo 'memory_mb = 8192'
    echo 'network_mode = "allowlist"'
    echo 'allowed_hosts = ["api.anthropic.com"]'
  } > "$task/task.toml"

  docker build -q -t "live-tokens-eval-$arm" "$env"
}

for arm in "${selected[@]}"; do
  # shellcheck disable=SC2046
  write_task $(arm_row "$arm")
done
if $prepare; then echo "eval-harbor: prepared ${selected[*]} in scratch/harbor/tasks"; exit 0; fi

CLAUDE_CODE_OAUTH_TOKEN="$(cat "$token_file")"
export CLAUDE_CODE_OAUTH_TOKEN
export CLAUDE_FORCE_OAUTH=1 HARBOR_TELEMETRY=0
unset ANTHROPIC_API_KEY
stamp="$(date +%Y-%m-%dT%H-%M-%S)"
jobs="scratch/harbor/jobs/$stamp"
report="eval-reports/$stamp"
if $smoke; then report="$report-smoke"; fi
mkdir -p "$jobs"
arms_json > "$jobs/arms.json"
for arm in "${selected[@]}"; do
  harbor run -p "scratch/harbor/tasks/$arm" -a claude-code -m anthropic/claude-opus-5-5 \
    -k "${runs:-$(arm_row "$arm" | awk '{ print $7 }')}" -n 3 -o "$jobs" --job-name "$arm" \
    --ak max_turns=200 --ak disable_web_search=true --ak "config=$REPO/scratch/harbor/tasks/$arm/settings.json"
done
unset CLAUDE_CODE_OAUTH_TOKEN
echo "eval-harbor: jobs in $jobs"
node scripts/eval-check-build.mjs "$jobs" --out "$report"
