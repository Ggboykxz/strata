#!/usr/bin/env bash
# Negative tests for scripts/validate-manifest.mjs --audit (P0-006).
set -u
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
SB="$(mktemp -d)"
fails=0

reset() {
  rm -rf "$SB"; mkdir -p "$SB/scripts/lib" "$SB/tools/asset-pipeline" "$SB/docs/legal"
  cp "$SRC/scripts/lib/yaml.mjs" "$SB/scripts/lib/"
  cp "$SRC/scripts/validate-manifest.mjs" "$SB/scripts/"
  cp "$SRC/tools/asset-pipeline/whitelist.yaml" "$SRC/tools/asset-pipeline/detect_tier.py" "$SB/tools/asset-pipeline/"
  cp "$SRC/docs/legal/AI_MODEL_AUDIT.md" "$SB/docs/legal/"
}

run() {
  local needle="$2" label="$3" want="$4" got
  (cd "$SB" && node scripts/validate-manifest.mjs --audit > $SB/out.txt 2>&1); got=$?
  if [ "$got" -eq "$want" ] && { [ -z "$needle" ] || grep -qF "$needle" $SB/out.txt; }; then
    echo "OK     exit=$got  $label"
  else
    echo "BROKEN exit=$got (wanted $want, needle '$needle')  $label"
    grep -E '^(FAIL|RESULT|MISSING)' $SB/out.txt | head -4 | sed 's/^/       /'
    fails=$((fails+1))
  fi
  true
}

reset; run x 'RESULT: PASS' 'baseline passes' 0

reset; sed -i '0,/license: apache-2.0/s//license: cc-by-nc-4.0/' "$SB/tools/asset-pipeline/whitelist.yaml"; run x 'forbidden licence' 'NC licence in approved' 1

reset; sed -i '0,/revision: [0-9a-f]\{40\}/s//revision: short/' "$SB/tools/asset-pipeline/whitelist.yaml"; run x 'revision is not a 40/64-hex pin' 'unpinned revision' 1

reset; sed -i '0,/id: FLUX-SCHNELL/s//id: NOT-IN-AUDIT/' "$SB/tools/asset-pipeline/whitelist.yaml"; run x 'id is not traceable' 'unknown approved id' 1

reset; rm "$SB/docs/legal/AI_MODEL_AUDIT.md"; run x 'MISSING' 'missing audit document' 2

reset; printf '\nVRAM_MIB = 15360\n' >> "$SB/tools/asset-pipeline/detect_tier.py"; run x 'hardcodes a VRAM number' 'hardcoded hardware number' 1

reset; sed -i 's/decision: REJECTED/decision: OPEN/' "$SB/tools/asset-pipeline/whitelist.yaml"; run x 'is still OPEN' 'unresolved Director decision' 1

reset; sed -i 's/{id: WORLDGROW, license:/{id: FLUX-SCHNELL, license:/' "$SB/tools/asset-pipeline/whitelist.yaml"; run x 'duplicate id' 'duplicate id across sections' 1

reset; sed -i '/{from: HUNYUAN3D, to: INSTANTMESH, kind: approved-model}/d' "$SB/tools/asset-pipeline/whitelist.yaml"; run x 'has no fallback mapping' 'missing fallback mapping' 1

echo
if [ "$fails" -eq 0 ]; then echo 'RESULT: PASS — all 9 P0-006 negative tests behaved as required.'; exit 0; fi
echo "RESULT: FAIL — $fails P0-006 negative test(s) misbehaved."; exit 1
