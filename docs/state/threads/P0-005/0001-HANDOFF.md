## 2026-11-18T01:20:00Z | orchestrator -> tools-engineer | HANDOFF

**claim:** P0-005 can start: the resume protocol exists in master §17, the map owns `tools/**` and
`scripts/**` to tools-engineer, and `drill-resume.mjs` is a P0-002 stub that must become real.

**inputs**
- master §17 — Colab = batch/CI only (I8/D81); setup, watchdog, heartbeat, tier detection, resume drill
- master §8.3 — VRAM tiers, degrade gracefully, never fail the session
- `docs/state/LOCKS.yaml`, `docs/state/SESSION.md`, `docs/state/NEXT_SESSION.md`, `scripts/lib/yaml.mjs`

**expected outputs**
- `tools/colab/{setup.sh, watchdog.sh, heartbeat.py, detect_tier.py, bootstrap.ipynb, prompts/SESSION_RESUME.md}`
- a real `scripts/drill-resume.mjs` (`--dry` replay, read-only)

**acceptance**
- `bash -n tools/colab/setup.sh` exit 0
- `node scripts/drill-resume.mjs --dry` exit 0 with a resume plan
- negative tests exit 1: missing SESSION.md, expired active lock, corrupt heartbeat; broken setup.sh syntax
  exits nonzero; watchdog `--check-locks` exits 1 on the same expired lock
- `pnpm install --frozen-lockfile`, `pnpm verify` exit 0

**constraints**
- setup.sh idempotent, no `curl | bash`, no token written, no HF call before P0-006 (I4)
- watchdog never force-pushes, never steals an active lock, requires a `session/*` branch
- heartbeat.json is generated gitignored state, overwritten, not an event log (I15)
- detect_tier reports the *measured* device or `NO_GPU`; no invented VRAM (I13)
- the drill is read-only: a dead session's shell must be able to run it safely

**deadline:** ≤ 30 min · **rollback:** revert the commit; heartbeat.json is gitignored and disposable

**ACK** — tools-engineer, same process.
