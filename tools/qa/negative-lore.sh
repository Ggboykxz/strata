#!/usr/bin/env bash
# Negative tests for scripts/validate-lore.mjs (P1-002). Committed: no /tmp dependency.
set -u
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
SB="$(mktemp -d)"
cd "$SRC" || exit 1
fails=0
reset() {
  rm -rf "$SB"; mkdir -p "$SB/docs/design/gdd" "$SB/scripts"
  cp "$SRC/docs/design/WORLD_BIBLE.md" "$SB/docs/design/"
  cp "$SRC/docs/design/gdd/GDD-QUEST.md" "$SB/docs/design/gdd/"
  cp "$SRC/scripts/validate-lore.mjs" "$SB/scripts/"
}
run() {
  local needle="$2" label="$3" want="$4" cmd="$1" got
  (cd "$SB" && eval "$cmd" > "$SB/out.txt" 2>&1); got=$?
  if [ "$got" -eq "$want" ] && { [ -z "$needle" ] || grep -qF "$needle" "$SB/out.txt"; }; then
    echo "OK     exit=$got  $label"
  else
    echo "BROKEN exit=$got (wanted $want, needle '$needle')  $label"
    grep -E '^(FAIL|RESULT|MISSING)' "$SB/out.txt" | head -4 | sed 's/^/       /'
    fails=$((fails+1))
  fi
}
reset; run 'node scripts/validate-lore.mjs' 'RESULT: PASS' 'baseline' 0
reset; sed -i 's/| neon_reach | Neon Reach | Réseau Néon | no |/| neon_reach | Neon Reach |  | no |/' "$SB/docs/design/WORLD_BIBLE.md"; run 'node scripts/validate-lore.mjs' 'incomplete glossary row' 'missing FR translation' 1
reset; sed -i 's/A river basin whose forest/Ashes of Creation river basin whose forest/' "$SB/docs/design/WORLD_BIBLE.md"; run 'node scripts/validate-lore.mjs' 'forbidden franchise name' 'borrowed IP name' 1
reset; sed -i 's/## 6. Forbidden names/## 6. Removed/' "$SB/docs/design/WORLD_BIBLE.md"; run 'node scripts/validate-lore.mjs' 'missing ## 6' 'missing bible section' 1
reset; printf '\nThe hero walks through neon_reach.\n' >> "$SB/docs/design/gdd/GDD-QUEST.md"; sed -i '/| neon_reach |/d' "$SB/docs/design/WORLD_BIBLE.md"; run 'node scripts/validate-lore.mjs' 'quest noun neon_reach is not in the glossary' 'unresolved quest noun' 1
echo
if [ "$fails" -eq 0 ]; then echo 'RESULT: PASS — all 5 P1-002 negative tests behaved as required.'; exit 0; fi
echo "RESULT: FAIL — $fails misbehaved."; exit 1
