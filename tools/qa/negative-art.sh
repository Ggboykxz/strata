#!/usr/bin/env bash
# Negative tests for scripts/validate-art-bible.mjs (P1-002/P1-003). Committed, no /tmp dependency.
set -u
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
SB="$(mktemp -d)"
cd "$SRC" || exit 1
fails=0
reset() {
  rm -rf "$SB"; mkdir -p "$SB/docs/design" "$SB/docs/adr" "$SB/docs/blueprint" "$SB/scripts/lib"
  cp "$SRC/docs/design/ART_BIBLE.md" "$SB/docs/design/"
  cp "$SRC/docs/adr/A0001_animation-scenes-textures.md" "$SB/docs/adr/"
  cp "$SRC/docs/blueprint/BLUEPRINT.yaml" "$SB/docs/blueprint/"
  cp "$SRC/scripts/lib/yaml.mjs" "$SB/scripts/lib/"
  cp "$SRC/scripts/validate-art-bible.mjs" "$SB/scripts/"
}
run() {
  local needle="$2" label="$3" want="$4" cmd="$1" got
  (cd "$SB" && eval "$cmd" > "$SB/out.txt" 2>&1); got=$?
  if [ "$got" -eq "$want" ] && { [ -z "$needle" ] || grep -qF "$needle" "$SB/out.txt"; }; then echo "OK     exit=$got  $label"
  else echo "BROKEN exit=$got (wanted $want, needle '$needle')  $label"; grep -E '^(FAIL|RESULT|MISSING)' "$SB/out.txt" | head -4 | sed 's/^/       /'; fails=$((fails+1)); fi
}
reset; run 'node scripts/validate-art-bible.mjs' 'RESULT: PASS' 'baseline' 0
reset; sed -i 's/Mesh GLBs and animation GLBs are separate/Mesh and animation GLBs are merged/' "$SB/docs/design/ART_BIBLE.md"; run 'node scripts/validate-art-bible.mjs' 'separation rule' 'merged GLB claim' 1
reset; sed -i 's/## 4. LOD and streaming/## 4. Removed/' "$SB/docs/design/ART_BIBLE.md"; run 'node scripts/validate-art-bible.mjs' 'missing ## 4' 'missing bible section' 1
reset; sed -i 's/draw calls per cell | <= 250/draw calls per cell | <= 999/' "$SB/docs/design/ART_BIBLE.md"; run 'node scripts/validate-art-bible.mjs' 'omits budget 250' 'budget changed' 1
reset; sed -i 's/## Rejected alternative/## Removed/' "$SB/docs/adr/A0001_animation-scenes-textures.md"; run 'node scripts/validate-art-bible.mjs' 'missing ## Rejected alternative' 'ADR section removed' 1
reset; sed -i 's/art: true, t: "World generation/art: false, t: "World generation/' "$SB/docs/blueprint/BLUEPRINT.yaml"; run 'node scripts/validate-art-bible.mjs' 'RESULT: PASS' 'art flag edit is not a defect' 0
echo
if [ "$fails" -eq 0 ]; then echo 'RESULT: PASS — all 6 P1-003 negative tests behaved as required.'; exit 0; fi
echo "RESULT: FAIL — $fails misbehaved."; exit 1
