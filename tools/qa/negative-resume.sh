#!/usr/bin/env bash
# Negative tests for P0-005: the drill and the shell scripts must be able to fail (I5).
set -u
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
SB="$(mktemp -d)"
cd "$SRC" || exit 1
fails=0

run() { # run <cmd> <needle> <label> <want> [log]
  local needle="$2" label="$3" want="$4" log="${5:-$SB/out.txt}" got
  eval "$1" > "$log" 2>&1; got=$?
  if [ "$got" -eq "$want" ] && { [ -z "$needle" ] || grep -qF "$needle" "$log"; }; then
    echo "OK     exit=$got  $label"
  else
    echo "BROKEN exit=$got (wanted $want, needle '$needle')  $label"
    grep -E '^(FAIL|RESULT)' "$log" | head -4 | sed 's/^/       /'
    fails=$((fails+1))
  fi
}

run 'node scripts/drill-resume.mjs --dry' 'RESULT: PASS' 'baseline drill passes' 0

mv docs/state/SESSION.md $SB/backup.saved
run 'node scripts/drill-resume.mjs --dry' 'SESSION.md present and non-empty' 'missing SESSION.md' 1
mv $SB/backup.saved docs/state/SESSION.md

cp docs/state/LOCKS.yaml $SB/backup.saved
python3 - <<'PY'
p='docs/state/LOCKS.yaml'
s=open(p).read().replace('locks: []','locks:')
s+='''  - path_glob: docs/design/**
    owner_agent: producer
    task_id: GDD-001
    branch: session/dead
    acquired_at: 2020-01-01T00:00:00Z
    expires_at: 2020-01-01T01:00:00Z
    status: active
'''
open(p,'w').write(s)
PY
run 'node scripts/drill-resume.mjs --dry' 'active lock' 'expired lock in drill' 1
run 'python3 tools/colab/heartbeat.py --check-locks' 'expired active lock' 'expired lock in watchdog probe' 1
mv $SB/backup.saved docs/state/LOCKS.yaml

printf '{not json\n' > docs/state/heartbeat.json
run 'node scripts/drill-resume.mjs --dry' 'heartbeat.json' 'corrupt heartbeat' 1
rm -f docs/state/heartbeat.json

run 'bash -n tools/colab/setup.sh' '' 'setup.sh syntax' 0
cp tools/colab/setup.sh $SB/setup.broken.sh
printf 'if true; then\n' >> $SB/setup.broken.sh
run 'bash -n $SB/setup.broken.sh' '' 'broken setup.sh syntax' 2

echo
if [ "$fails" -eq 0 ]; then echo 'RESULT: PASS — all 7 P0-005 negative tests behaved as required.'; exit 0; fi
echo "RESULT: FAIL — $fails P0-005 negative test(s) misbehaved."; exit 1
