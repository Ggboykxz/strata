#!/usr/bin/env bash
set -u
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
SB="$(mktemp -d)"
fails=0
reset() {
  rm -rf "$SB"; mkdir -p "$SB/docs/adr" "$SB/docs/design" "$SB/docs/tdd" "$SB/scripts"
  cp "$SRC/docs/VISION.md" "$SB/docs/"
  cp "$SRC"/docs/design/{VERTICAL_SLICE_SPEC,UX_SPEC,LOCALIZATION}.md "$SB/docs/design/"
  cp "$SRC"/docs/tdd/*.md "$SB/docs/tdd/"
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
reset; sed -i 's/| A11Y-7 |/| A11Y-X |/' "$SB/docs/design/UX_SPEC.md"; run 'node scripts/validate-docs.mjs' 'omits "A11Y-7"' 'a11y control removed' 1
reset; sed -i 's/900 ticks/100 ticks/' "$SB/docs/design/VERTICAL_SLICE_SPEC.md"; run 'node scripts/validate-docs.mjs' 'omits "900 ticks"' 'T2 budget removed' 1
reset; sed -i 's/## Context/## Removed/' "$SB/docs/tdd/TDD-NETCODE.md"; run 'node scripts/validate-docs.mjs' 'has no Context section' 'TDD context removed' 1
echo
if [ "$fails" -eq 0 ]; then echo 'RESULT: PASS — all 8 P1-004 negative tests behaved as required.'; exit 0; fi
echo "RESULT: FAIL — $fails misbehaved."; exit 1
