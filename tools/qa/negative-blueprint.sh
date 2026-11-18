#!/usr/bin/env bash
# Negative tests for scripts/validate-blueprint.mjs — B1, B2, B5, B7, B8 must be able to fail (I5).
set -u
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
SB="$(mktemp -d)"
fails=0

setup() { rm -rf "$SB"; mkdir -p "$SB"; cp -r "$SRC/scripts" "$SRC/docs" "$SB/"; }

run() { ( cd "$SB" && node scripts/validate-blueprint.mjs >$SB/out.txt 2>&1 ); echo $?; }

expect() { # expect <code> <label> <grep>
  local want="$1" label="$2" needle="$3" got
  got=$(run)
  if [ "$got" -eq "$want" ] && grep -qF "$needle" $SB/out.txt; then
    echo "OK     exit=$got  $label"
  else
    echo "BROKEN exit=$got (wanted $want, looking for '$needle')  $label"
    grep -E '^(FAIL|RESULT)' $SB/out.txt | head -4 | sed 's/^/       /'
    fails=$((fails+1))
  fi
}

setup; expect 0 "baseline passes" "RESULT: PASS"

setup; sed -i 's/deps: \[GATE:P1\], out: \[packages\/core\/src\/tick.ts/deps: [GATE:P2NET], out: [packages\/core\/src\/tick.ts/' "$SB/docs/blueprint/BLUEPRINT.yaml"
expect 1 "B1 refuses a dependency cycle on a gate" "FAIL  B1 NET-001 depends on GATE:P2NET"

setup; sed -i 's/agent: producer, role: amp, gdd: \[GDD-CORE#concept\]/agent: narrative, role: amp, gdd: [GDD-CORE#concept]/' "$SB/docs/blueprint/BLUEPRINT.yaml"
expect 1 "B2 refuses an out-of-domain writer" "FAIL  B2 P1-001 writes outside narrative"

setup; sed -i 's/id: P0-002, ph: P0, tier: S0, /id: P0-002, ph: P0, tier: S0, art: true, /' "$SB/docs/blueprint/BLUEPRINT.yaml"
expect 1 "B5 refuses art with NET-GATE unpassed" "FAIL  B5 P0-002 is art:true"

setup; sed -i 's#node scripts/validate-scope.mjs#node scripts/validate-nope.mjs#' "$SB/docs/blueprint/BLUEPRINT.yaml"
expect 1 "B7 refuses a missing acceptance script" "FAIL  B7 SC-001 acceptance references missing scripts/validate-nope.mjs"

setup; sed -i '/id: SC-001/ s#scripts/validate-scope.mjs\]#scripts/validate-scope.mjs, docs/extra.md]#' "$SB/docs/blueprint/BLUEPRINT.yaml"
expect 1 "B8 refuses an oversized task without split" "FAIL  B8 SC-001 has 1 acc / 5 out"

echo
if [ "$fails" -eq 0 ]; then echo "RESULT: PASS — all 6 blueprint negative tests behaved as required."; exit 0; fi
echo "RESULT: FAIL — $fails blueprint negative test(s) misbehaved."; exit 1
