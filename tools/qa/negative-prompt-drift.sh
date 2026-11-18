#!/usr/bin/env bash
# Negative tests for scripts/validate-prompt-drift.mjs — a validator that cannot fail is not a validator (I5).
set -u
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
SB="$(mktemp -d)"
V="$SRC/scripts/validate-prompt-drift.mjs"
fails=0

setup() {
  rm -rf "$SB"
  mkdir -p "$SB/tools/colab/prompts" "$SB/docs/archive" "$SB/docs/state"
  cp "$SRC/tools/colab/prompts/SESSION_MASTER.md" "$SB/tools/colab/prompts/"
  cp "$SRC/docs/archive/SESSION_MASTER_v8.1.md" "$SB/docs/archive/"
  cp "$SRC/docs/state/PROMPT.lock" "$SB/docs/state/"
  cp "$SRC/docs/CONSTITUTION.md" "$SB/docs/"
}

expect() { # expect <0|1> <label>
  local want="$1" label="$2"
  ( cd "$SB" && node "$V" >$SB/out.txt 2>&1 )
  local got=$?
  if [ "$got" -eq "$want" ]; then
    echo "OK     exit=$got  $label"
  else
    echo "BROKEN exit=$got (wanted $want)  $label"
    sed 's/^/       /' $SB/out.txt | tail -8
    fails=$((fails+1))
  fi
}

setup
expect 0 "baseline: sealed repo passes"

setup
sed -i 's/I1  Server owns ALL truth; client sends INTENT only./I1  The client decides its own damage./' "$SB/docs/CONSTITUTION.md"
expect 1 "tampered invariant I1 in the Constitution is caught"

setup
sed -i 's/^## AMENDMENTS$/## AMENDMENTS\n\n- I1 replaced by ADR-a0002 (test fixture)/' "$SB/docs/CONSTITUTION.md"
sed -i 's/^amended: \[\]$/amended: [I1]/' "$SB/docs/state/PROMPT.lock"
expect 0 "a declared amendment (lock + AMENDMENTS section) is allowed"

setup
sed -i 's/^## AMENDMENTS$/## APPENDIX/' "$SB/docs/CONSTITUTION.md"
sed -i 's/^amended: \[\]$/amended: [I1]/' "$SB/docs/state/PROMPT.lock"
expect 1 "an amendment declared without an AMENDMENTS section is refused"

setup
printf 'x' >> "$SB/tools/colab/prompts/SESSION_MASTER.md"
expect 1 "a single appended byte to the master is caught"

setup
sed -i '$d' "$SB/tools/colab/prompts/SESSION_MASTER.md"
expect 1 "a truncated master (no sentinel) is caught"

setup
rm "$SB/docs/state/PROMPT.lock"
expect 1 "a missing PROMPT.lock is caught"

setup
sed -i 's/^D79 /D78x /' "$SB/docs/CONSTITUTION.md"
expect 1 "a dropped locked decision (D79) is caught"

echo
if [ "$fails" -eq 0 ]; then
  echo "RESULT: PASS — all 8 negative tests behaved as required."
  exit 0
fi
echo "RESULT: FAIL — $fails negative test(s) did not behave as required."
exit 1
