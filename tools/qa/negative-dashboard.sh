#!/usr/bin/env bash
# Negative tests for P0-007 dashboard build.
set -u
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
SB="$(mktemp -d)"
cd "$SRC" || exit 1
fails=0
STAMP=2026-11-18T00:00:00.000Z

run() { # run <label> <needle> <want> <cmd...>
  local label="$1" needle="$2" want="$3"; shift 3
  local got
  "$@" > $SB/out.txt 2>&1; got=$?
  if [ "$got" -eq "$want" ] && { [ -z "$needle" ] || grep -qF "$needle" $SB/out.txt; }; then
    echo "OK     exit=$got  $label"
  else
    echo "BROKEN exit=$got (wanted $want, needle '$needle')  $label"
    tail -6 $SB/out.txt | sed 's/^/       /'
    fails=$((fails+1))
  fi
}

build() { STRATA_BUILD_UTC="$STAMP" pnpm --filter @strata/dashboard build; }

run 'baseline build' 'dashboard build OK' 0 build

sha1=$(sha256sum apps/dashboard/dist/index.html apps/dashboard/dist/data.json | sha256sum | cut -d' ' -f1)
build > /dev/null 2>&1
sha2=$(sha256sum apps/dashboard/dist/index.html apps/dashboard/dist/data.json | sha256sum | cut -d' ' -f1)
if [ "$sha1" = "$sha2" ]; then echo "OK     idempotent rebuild (sha256 $sha1)"; else echo "BROKEN rebuild changed output"; fails=$((fails+1)); fi

if grep -q 'NOT COMPUTABLE' apps/dashboard/dist/index.html; then echo 'OK     unmeasured values are printed as NOT COMPUTABLE'; else echo 'BROKEN no NOT COMPUTABLE in HTML'; fails=$((fails+1)); fi

if grep -qE 'fetch\(|WebSocket|GITHUB_TOKEN|HF_TOKEN' apps/dashboard/dist/index.html apps/dashboard/build.mjs; then
  echo 'BROKEN dashboard contains a live-call or secret reference'; fails=$((fails+1))
else echo 'OK     no live calls or secret references'; fi

cp apps/dashboard/src/main.ts $SB/backup.saved
printf '\nconst broken: = ;\n' >> apps/dashboard/src/main.ts
run 'deliberate TS syntax error' 'error TS' 1 build
mv $SB/backup.saved apps/dashboard/src/main.ts

M=docs/state/metrics/2026-11-18-s01.json
mv "$M" $SB/backup.saved
run 'missing metrics source' 'no metrics JSON found' 1 build
mv $SB/backup.saved "$M"

cp apps/dashboard/build.mjs $SB/backup.saved
printf '\nthis is not javascript;;;\n' >> apps/dashboard/build.mjs
run 'deliberate builder syntax error' 'SyntaxError' 1 build
mv $SB/backup.saved apps/dashboard/build.mjs

build > /dev/null 2>&1 || { echo 'BROKEN final rebuild after restores'; fails=$((fails+1)); }

echo
if [ "$fails" -eq 0 ]; then echo 'RESULT: PASS — all P0-007 dashboard checks behaved as required.'; exit 0; fi
echo "RESULT: FAIL — $fails dashboard check(s) misbehaved."; exit 1
