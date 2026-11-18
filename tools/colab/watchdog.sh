#!/usr/bin/env bash
# STRATA watchdog (master §17): checkpoint every 600 s, heartbeat, fail closed on expired locks.
# Owner: tools-engineer (P0-005). Never force-push, never steal an active lock, never write a token.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
BRANCH="$(git branch --show-current)"
case "$BRANCH" in
  session/*) ;;
  *) echo "FAIL watchdog requires a session/* branch, found '${BRANCH:-detached}'"; exit 1 ;;
esac

INTERVAL="${WATCHDOG_INTERVAL_SECONDS:-600}"
DRY="${STRATA_DRY_RUN:-0}"
echo "watchdog: interval ${INTERVAL}s · branch ${BRANCH}"

# Fail closed: an expired-but-active lock must be reclaimed through the state/locks CAS protocol first.
python3 tools/colab/heartbeat.py --check-locks

if [ "$DRY" = "1" ]; then
  echo 'DRY heartbeat + WIP checkpoint + push (not executed)'
  echo 'RESULT: PASS — dry watchdog replayed its checks without side effects.'
  exit 0
fi

python3 tools/colab/heartbeat.py --write
git add -A
if git diff --cached --quiet; then
  echo 'watchdog: no WIP to commit'
else
  TASK="${BRANCH#*-}"
  git commit -m "wip(${TASK}): watchdog checkpoint"
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    git -c http.extraheader="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)" \
      push origin "$BRANCH"
  else
    git push origin "$BRANCH"
  fi
fi

echo 'watchdog: squash WIP commits before opening or updating the PR.'
