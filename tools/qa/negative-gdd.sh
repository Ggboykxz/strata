#!/usr/bin/env bash
set -u
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
SB="$(mktemp -d)"
fails=0
reset() {
  rm -rf "$SB"; mkdir -p "$SB/docs/design/gdd" "$SB/docs/blueprint" "$SB/scripts/lib"
  cp "$SRC/docs/design/GDD.md" "$SB/docs/design/"
  cp "$SRC"/docs/design/gdd/*.md "$SB/docs/design/gdd/"
  cp "$SRC/docs/blueprint/BLUEPRINT.yaml" "$SB/docs/blueprint/"
  cp "$SRC/scripts/lib/yaml.mjs" "$SB/scripts/lib/"
  cp "$SRC/scripts/validate-gdd.mjs" "$SRC/scripts/gdd-coverage.mjs" "$SB/scripts/"
}
run() {
  local cmd="$1" needle="$2" label="$3" want="$4" got
  (cd "$SB" && eval "$cmd" > $SB/out.txt 2>&1); got=$?
  if [ "$got" -eq "$want" ] && grep -qF "$needle" $SB/out.txt; then echo "OK     exit=$got  $label"
  else echo "BROKEN exit=$got (wanted $want, needle '$needle')  $label"; grep -E '^(FAIL|RESULT|MISSING)' $SB/out.txt | head -4 | sed 's/^/       /'; fails=$((fails+1)); fi
}
reset; run 'node scripts/validate-gdd.mjs --template' 'RESULT: PASS' 'baseline template' 0
reset; rm "$SB/docs/design/gdd/GDD-CORE.md"; run 'node scripts/validate-gdd.mjs --template' 'missing module GDD-CORE' 'missing module' 1
reset; sed -i 's/| status | STUB |/| status | DRAFT |/' "$SB/docs/design/gdd/GDD-ECONOMY.md"; run 'node scripts/validate-gdd.mjs --template' 'title does not match its status' 'wrong maturity' 1
reset; sed -i 's/Over-harvest in one era spawns Rouille/A fun over-harvest in one era spawns Rouille/' "$SB/docs/design/gdd/GDD-ECONOMY.md"; run 'node scripts/validate-gdd.mjs --template' 'forbidden vague word' 'vague adjective' 1
reset; sed -i '/id: NET-001,/ s/gdd: \[GDD-NETCODE#authority\]/gdd: [GDD-NOT-REAL]/' "$SB/docs/blueprint/BLUEPRINT.yaml"; run 'node scripts/validate-gdd.mjs --critical' 'not one of the 32 modules' 'unresolved critical ref' 1
reset; sed -i 's/SOURCE:/source:/g; s/TUNABLE/tunable/g' "$SB/docs/design/gdd/GDD-NETCODE.md"; run 'node scripts/validate-gdd.mjs --template' 'field 5 has no SOURCE or TUNABLE range' 'DRAFT field 5 without source' 1
reset; sed -i 's/| status | DRAFT |/| status | SIGNED |/' "$SB/docs/design/gdd/GDD-SECURITY.md"; run 'node scripts/validate-gdd.mjs --template' 'is SIGNED without a recorded signature' 'SIGNED without signature' 1
reset; sed -i '/## 5. Numbers with source/,/## 6. State machine/d' "$SB/docs/design/gdd/GDD-NETCODE.md"; run 'node scripts/validate-gdd.mjs --template' 'G2 GDD-NETCODE (DRAFT) missing ## 5' 'DRAFT missing field 5' 1
reset; sed -i 's/900 ticks maximum = 30 s/0 ticks maximum = 0 s/' "$SB/docs/design/gdd/GDD-CONSEQUENCE.md"; run 'node scripts/validate-gdd.mjs --template' '900-tick T2 budget' 'missing T2 budget' 1
reset; sed -i 's/>= 3 resolutions per major quest/2 resolutions per major quest/' "$SB/docs/design/gdd/GDD-QUEST.md"; run 'node scripts/validate-gdd.mjs --template' 'three-resolution minimum' 'missing T4 minimum' 1
reset; run 'node scripts/gdd-coverage.mjs --min 0.8' 'RESULT: PASS' 'coverage baseline' 0
reset; sed -i '0,/gdd: \[GDD-NETCODE#authority\]/s//gdd: [GDD-NOT-REAL]/' "$SB/docs/blueprint/BLUEPRINT.yaml"; run 'node scripts/gdd-coverage.mjs --min 1' 'MISSING' 'coverage below threshold' 1
echo
if [ "$fails" -eq 0 ]; then echo 'RESULT: PASS — all 12 GDD negative tests behaved as required.'; exit 0; fi
echo "RESULT: FAIL — $fails misbehaved."; exit 1
