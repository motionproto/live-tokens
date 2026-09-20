#!/usr/bin/env bash
set -euo pipefail

# `claude plugin eval` refuses a Bash grant while ~/.docker holds symbolic
# links, and Docker Desktop recreates its links on launch. So Docker stays quit
# and the linked folders sit outside ~/.docker for the length of the run.

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORE="$HOME/.docker"
ASIDE="$HOME/.docker-eval-aside"

docker_running() { pgrep -f "com.docker.backend" >/dev/null 2>&1; }

if [ -e "$ASIDE" ]; then
  echo "eval: $ASIDE exists, so an earlier run did not restore ~/.docker." >&2
  echo "eval: quit Docker Desktop, move its contents back into $STORE, remove it, and run again." >&2
  exit 1
fi

was_running=false
if docker_running; then
  was_running=true
  if [ -n "$(docker ps -q 2>/dev/null)" ]; then
    echo "eval: containers are running. Stop them, then run again." >&2
    exit 1
  fi
  echo "eval: quitting Docker Desktop"
  osascript -e 'quit app "Docker Desktop"'
  for _ in $(seq 1 30); do docker_running || break; sleep 1; done
  if docker_running; then
    echo "eval: Docker Desktop did not quit" >&2
    exit 1
  fi
fi

moved=()
restore() {
  for name in ${moved[@]+"${moved[@]}"}; do mv "$ASIDE/$name" "$STORE/$name"; done
  if [ -d "$ASIDE" ]; then rmdir "$ASIDE"; fi
  if $was_running; then open -g -a "Docker Desktop"; fi
}
trap restore EXIT

if [ -d "$STORE" ]; then
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    mkdir -p "$ASIDE"
    mv "$STORE/$name" "$ASIDE/$name"
    moved+=("$name")
  done < <(find "$STORE" -type l 2>/dev/null | sed "s|^$STORE/||" | cut -d/ -f1 | sort -u)
  if [ ${#moved[@]} -gt 0 ]; then echo "eval: moved aside from ~/.docker: ${moved[*]}"; fi
fi

cd "$REPO"
mkdir -p scratch
status=0
claude plugin eval .claude --no-publish --scaffold --trust-plugin --json scratch/eval-last.json --allow-tools Bash Write Edit "$@" || status=$?
if [ -s scratch/eval-last.json ]; then echo; node scripts/eval-report.mjs scratch/eval-last.json; fi
exit $status
