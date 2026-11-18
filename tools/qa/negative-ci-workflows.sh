#!/usr/bin/env bash
# Negative tests for scripts/validate-workflows.mjs (P0-004).
set -u
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
SB="$(mktemp -d)"
fails=0

reset() {
  rm -rf "$SB"; mkdir -p "$SB/.github/workflows" "$SB/scripts/lib"
  cp "$SRC"/.github/workflows/*.yml "$SB/.github/workflows/"
  cp "$SRC/scripts/lib/yaml.mjs" "$SB/scripts/lib/"
  cp "$SRC/scripts/validate-workflows.mjs" "$SB/scripts/"
  for f in "$SRC"/scripts/*.mjs; do cp "$f" "$SB/scripts/"; done
}

run() { # run <needle> <label> <want>
  local needle="$1" label="$2" want="$3" got
  (cd "$SB" && node scripts/validate-workflows.mjs > $SB/out.txt 2>&1); got=$?
  if [ "$got" -eq "$want" ] && grep -qF "$needle" $SB/out.txt; then
    echo "OK     exit=$got  $label"
  else
    echo "BROKEN exit=$got (wanted $want, needle '$needle')  $label"
    grep -E '^(FAIL|RESULT)' $SB/out.txt | head -4 | sed 's/^/       /'
    fails=$((fails+1))
  fi
}

reset; run 'RESULT: PASS' 'baseline passes' 0

reset; rm "$SB/.github/workflows/ci.yml"; run 'expected 27 workflow files, found 26' '26 files' 1

reset; cp "$SB/.github/workflows/ci.yml" "$SB/.github/workflows/extra.yml"; sed -i 's/^name: .*/name: ci-extra/' "$SB/.github/workflows/extra.yml"; run 'expected 27 workflow files, found 28' '28 files' 1

reset; sed -i 's/actions\/checkout@[0-9a-f]\{40\}/actions\/checkout@v4/' "$SB/.github/workflows/ci.yml"; run 'uses is not pinned to a 40-hex SHA' 'unpinned uses' 1

reset; sed -i '/^permissions:/d' "$SB/.github/workflows/ci.yml"; run 'ci.yml has no explicit permissions.contents' 'missing permissions' 1

reset
python3 - "$SB" <<'PY'
import sys
p=sys.argv[1]+'/.github/workflows/workflow.yml'
s=open(p).read().replace('on: { push: { branches: [main] }, pull_request: }','on: { pull_request_target: }')
s=s.replace('      - uses: actions/checkout@','      - with:\n          ref: ${{ github.event.pull_request.head.sha }}\n      - uses: actions/checkout@',1)
open(p,'w').write(s)
PY
run 'checks out the PR head under pull_request_target' 'PR head checkout' 1

reset; sed -i 's/^  workflow_dispatch:$/  pull_request:/' "$SB/.github/workflows/anim.yml"; run 'calls a declared stub but is not manual-only' 'stub on a PR' 1

reset; sed -i 's/pnpm install --frozen-lockfile/pnpm install/' "$SB/.github/workflows/ci.yml"; run 'installs without --frozen-lockfile' 'unfrozen install' 1

reset; sed -i '0,/echo /s//echo "BAD: value"/' "$SB/.github/workflows/a11y.yml"; run 'invalid YAML' 'unquoted colon-space in run scalar' 1

echo
if [ "$fails" -eq 0 ]; then echo 'RESULT: PASS — all 9 P0-004 negative tests behaved as required.'; exit 0; fi
echo "RESULT: FAIL — $fails P0-004 negative test(s) misbehaved."; exit 1
