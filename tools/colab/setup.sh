#!/usr/bin/env bash
# STRATA Colab/bootstrap — idempotent, network-safe in dry mode (master §17).
# Owner: tools-engineer (P0-005). Never force-push, never curl|bash, never write a token.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
DRY="${STRATA_DRY_RUN:-0}"

step() { printf '\n== %s\n' "$1"; }
run() {
  if [ "$DRY" = "1" ]; then printf 'DRY'; printf ' %q' "$@"; printf '\n'; else "$@"; fi
}
have() { command -v "$1" >/dev/null 2>&1; }

step 'Node 22'
if ! have node; then echo 'FAIL node is required'; exit 1; fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" != "22" ]; then echo "FAIL Node 22 required, found $NODE_MAJOR"; exit 1; fi
printf 'node %s\n' "$(node -v)"

step 'pnpm (exact version via corepack)'
if ! have pnpm; then run corepack enable; fi
if have pnpm; then printf 'pnpm %s\n' "$(pnpm -v)"; else echo 'FAIL pnpm unavailable'; exit 1; fi

step 'uv (optional — no unverified installer)'
if have uv; then uv --version; else echo 'WARN uv absent; CPU-safe work only, no curl|bash installer (§10.6)'; fi

step 'OpenCode CLI (optional)'
if have opencode; then opencode --version || true; else echo 'WARN opencode CLI absent in this shell'; fi

step 'HF cache restore'
HF_CACHE="${HF_HOME:-$HOME/.cache/huggingface}"
if [ -n "${HF_TOKEN:-}" ] && [ -d "$HF_CACHE" ]; then
  echo "cache present at $HF_CACHE; no network call in this step"
else
  echo 'no token/cache: nothing to restore; no HF call before the P0-006 license audit (I4)'
fi

step 'VRAM tier detection'
run python3 tools/colab/detect_tier.py

step 'frozen install and verify'
run pnpm install --frozen-lockfile
run pnpm verify

step 'SESSION + heartbeat'
if [ ! -f docs/state/SESSION.md ]; then echo 'FAIL docs/state/SESSION.md missing'; exit 1; fi
run python3 tools/colab/heartbeat.py --write

printf '\nRESULT: PASS — bootstrap is idempotent: state is overwritten, never duplicated.\n'
