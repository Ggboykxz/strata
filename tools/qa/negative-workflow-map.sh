#!/usr/bin/env bash
# Negative tests for WF-002: the two validators must be able to fail (I5).
set -u
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
SB="$(mktemp -d)"
fails=0

reset() {
  rm -rf "$SB"; mkdir -p "$SB/docs/state" "$SB/docs/blueprint" "$SB/scripts" "$SB/.opencode/agents"
  cp "$SRC/docs/state/OWNERSHIP.yaml" "$SB/docs/state/"
  cp "$SRC/docs/state/LOCKS.yaml" "$SB/docs/state/"
  cp "$SRC/docs/blueprint/BLUEPRINT.yaml" "$SB/docs/blueprint/"
  cp -r "$SRC/scripts/lib" "$SB/scripts/"
  cp "$SRC/scripts/validate-ownership.mjs" "$SRC/scripts/validate-locks.mjs" "$SB/scripts/"
  cp "$SRC/.opencode/agents/"*.md "$SB/.opencode/agents/"
}

run() { # run <validator> <needle> <label> <want>
  local v="$1" needle="$2" label="$3" want="$4" got
  (cd "$SB" && node "scripts/$v" > $SB/out.txt 2>&1); got=$?
  if [ "$got" -eq "$want" ] && grep -qF "$needle" $SB/out.txt; then
    echo "OK     $v exit=$got  $label"
  else
    echo "BROKEN $v exit=$got (wanted $want, needle '$needle')  $label"
    grep -E '^(FAIL|RESULT)' $SB/out.txt | head -4 | sed 's/^/       /'
    fails=$((fails+1))
  fi
}

# --- ownership ---
reset; run validate-ownership.mjs 'RESULT: PASS' 'baseline passes' 0

reset
python3 - "$SB" <<'PY'
import sys
p=sys.argv[1]+'/docs/state/OWNERSHIP.yaml'
s=open(p).read()
s=s.replace('  - agent: producer\n    globs:\n', '  - agent: producer\n    globs:\n      - docs/state/**\n', 1)
open(p,'w').write(s)
PY
run validate-ownership.mjs 'identical glob docs/state/** owned by orchestrator and producer' 'identical glob with two owners' 1

reset
python3 - "$SB" <<'PY'
import sys
p=sys.argv[1]+'/docs/blueprint/BLUEPRINT.yaml'
s=open(p).read().replace('agent: orchestrator, split: true, role: sup, gdd: [GDD-CORE#meta]', 'agent: narrative, split: true, role: sup, gdd: [GDD-CORE#meta]', 1)
open(p,'w').write(s)
PY
run validate-ownership.mjs 'O3 P0-001 writes' 'task output outside owner set' 1

reset
python3 - "$SB" <<'PY'
import sys
p=sys.argv[1]+'/docs/state/OWNERSHIP.yaml'
s=open(p).read()
s=s.replace('      - scripts/validate-ownership.mjs\n','').replace('      - scripts/validate-locks.mjs\n','')
open(p,'w').write(s)
PY
run validate-ownership.mjs 'must be orchestrator-owned (A0002)' 'A0002 ownership regression' 1

# --- locks ---
reset; run validate-locks.mjs 'RESULT: PASS' 'baseline passes' 0

reset
sed -i 's/^ttl_minutes: 60$/ttl_minutes: 0/' "$SB/docs/state/LOCKS.yaml"
run validate-locks.mjs 'ttl_minutes must be a positive integer' 'invalid ttl' 1

reset
python3 - "$SB" <<'PY'
import sys
p=sys.argv[1]+'/docs/state/LOCKS.yaml'
s=open(p).read().replace('locks: []','locks:')
s+='''  - path_glob: docs/design/**
    owner_agent: producer
    task_id: GDD-001
    branch: session/test
    acquired_at: 2026-11-18T00:00:00Z
    expires_at: 2099-01-01T00:00:00Z
    status: active
  - path_glob: docs/design/**
    owner_agent: narrative
    task_id: P1-002
    branch: session/test2
    acquired_at: 2026-11-18T00:00:00Z
    expires_at: 2099-01-01T00:00:00Z
    status: active
'''
open(p,'w').write(s)
PY
run validate-locks.mjs 'duplicates active path_glob' 'two active locks on one path' 1

reset
python3 - "$SB" <<'PY'
import sys
p=sys.argv[1]+'/docs/state/LOCKS.yaml'
s=open(p).read().replace('locks: []','locks:')
s+='''  - path_glob: docs/design/**
    owner_agent: nobody
    task_id: GDD-001
    branch: session/test
    acquired_at: 2026-11-18T00:00:00Z
    expires_at: 2099-01-01T00:00:00Z
    status: active
'''
open(p,'w').write(s)
PY
run validate-locks.mjs 'owner_agent "nobody" is not in OWNERSHIP.yaml' 'unknown lock owner' 1

echo
if [ "$fails" -eq 0 ]; then echo 'RESULT: PASS — all 8 WF-002 negative tests behaved as required.'; exit 0; fi
echo "RESULT: FAIL — $fails WF-002 negative test(s) misbehaved."; exit 1
