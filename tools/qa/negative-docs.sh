#!/usr/bin/env bash
set -u
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
SB="$(mktemp -d)"
fails=0
reset() {
  rm -rf "$SB"; mkdir -p "$SB/docs/adr" "$SB/scripts"
  cp "$SRC/docs/VISION.md" "$SB/docs/"
  cp "$SRC"/docs/adr/*.md "$SB/docs/adr/"
  cp "$SRC/scripts/validate-docs.mjs" "$SB/scripts/"
}
run() {
  local needle="$2" label="$3" want="$4" got
  (cd "$SB" && node scripts/validate-docs.mjs > $SB/out.txt 2>&1); got=$?
  if [ "$got" -eq "$want" ] && { [ -z "$needle" ] || grep -qF "$needle" $SB/out.txt; }; then
    echo "OK     exit=$got  $label"
  else
    echo "BROKEN exit=$got (wanted $want, needle '$needle')  $label"
    grep -E '^(FAIL|RESULT|MISSING)' $SB/out.txt | head -4 | sed 's/^/       /'
    fails=$((fails+1))
  fi
}
reset; run x 'RESULT: PASS' 'baseline passes' 0
reset; rm "$SB/docs/VISION.md"; run x 'MISSING' 'missing VISION.md' 2
reset; sed -i 's/## 2\. Concept-first rule/## 2. Removed/' "$SB/docs/VISION.md"; run x 'missing section' 'missing required section' 1
reset; sed -i 's/burn a Stone Age forest, no medieval abbey exists/burn a forest, no abbey/' "$SB/docs/VISION.md"; run x 'locked T1 sentence' 'locked sentence removed' 1
reset; sed -i '/| status |/d' "$SB/docs/adr/A0002_workflow-validator-ownership.md"; run x 'has no status field' 'ADR without status' 1
echo
if [ "$fails" -eq 0 ]; then echo 'RESULT: PASS — all 5 P1-001 negative tests behaved as required.'; exit 0; fi
echo "RESULT: FAIL — $fails misbehaved."; exit 1
