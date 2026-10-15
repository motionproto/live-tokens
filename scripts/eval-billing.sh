#!/usr/bin/env bash
set -euo pipefail

# Runs the outcome-build-billing evals and writes the comparison report.
# The cases and what each arm measures are described in .claude/evals/README.md.
#
#   npm run eval:billing -- --smoke     one run of the case with every tool
#   npm run eval:billing -- --runs 3    all five arms, three runs each

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

runs=1
smoke=false
while [ $# -gt 0 ]; do
  case "$1" in
    --smoke) smoke=true ;;
    --runs) runs="$2"; shift ;;
    *) echo "eval:billing: unknown option $1. Use --smoke or --runs <n>." >&2; exit 1 ;;
  esac
  shift
done

# scripts/eval.sh refuses the same way, but only after the project build.
if command -v docker >/dev/null 2>&1 && [ -n "$(docker ps -q 2>/dev/null)" ]; then
  echo "eval:billing: Docker containers are running. Stop them with 'docker stop \$(docker ps -q)', then run again." >&2
  exit 1
fi

npm run build:eval-project

suffix=""
if $smoke; then suffix="-smoke"; fi
out="$REPO/scratch/eval-billing/$(date +%Y-%m-%dT%H-%M-%S)$suffix"
mkdir -p "$out"

run_case() {
  local name="$1"; shift
  echo
  echo "eval:billing: $name"
  rm -f scratch/eval-last.json
  # A run that fails its graders exits nonzero; the report still wants its result.
  npm run eval -- --case "$name" --runs "$runs" --keep-temp "$@" 2>&1 | tee "$out/$name.log" || true
  if [ ! -s scratch/eval-last.json ]; then
    echo "eval:billing: $name wrote no result. See $out/$name.log." >&2
    exit 1
  fi
  cp scratch/eval-last.json "$out/$name.json"
}

if $smoke; then
  run_case outcome-build-billing --ablation none
else
  # The runner's baseline arm here is the unattended model.
  run_case outcome-build-billing-no-cli
  for name in outcome-build-billing outcome-build-billing-no-checker outcome-build-billing-no-lookup; do
    run_case "$name" --ablation none
  done
fi

node scripts/eval-check-build.mjs "$out"/*.json --tests --out "$out/report" --clean
