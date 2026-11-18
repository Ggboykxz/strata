# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T01:17Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| mode | RESUME |
| next task | **P0-005** — Colab bootstrap + watchdog + heartbeat + resume drill |
| blocker | **ND-004 / ND-005 only** — token rotation needs the Director's account. Everything on disk is green. |

---

## 1. State at hand-off

| task | status | evidence |
|---|---|---|
| HC-001 (+ v1.1, v1.2) | done | `…T001004Z-HC-001/`, `…T004835Z-DIRECTOR-RESOLUTIONS/` |
| SC-001 / WF-001 | done | `…T001004Z-SC-001/`, `…T001004Z-WF-001/` |
| P0-001 / P0-002 | done | `…T001004Z-P0-001/`, `…T001004Z-P0-002/` |
| P0-003 | done | `…T004153Z-P0-003/` |
| WF-002 | done | `…T005800Z-WF-002/` |
| TRACER-001 | done | `…T010750Z-TRACER-001/` |
| P0-004 | done | `…T011433Z-P0-004/` |

Re-verify before touching anything:

```bash
pnpm verify                              # 10/10 enabled steps, exit 0
pnpm tracer --assert                     # equal hashes, exit 0
node scripts/validate-workflows.mjs      # 27 workflows, 0 errors
node scripts/concept-integrity.mjs --check  # 0 debt at GATE:P0
```

**CI is now pushed but unrun.** The 27 workflows are statically valid; no Actions job has executed. Check
the real GitHub run on this branch before the next gate and treat its result as evidence — do not assume
green. 12 workflows calling declared stubs are manual-only by design.

## 2. P0-005 — definition of done

Source: `docs/blueprint/BLUEPRINT.yaml` line 43. Agent **tools-engineer**, `sup`, deps `[P0-003]`,
outputs `tools/colab/`, `scripts/drill-resume.mjs`.
Acceptance: **`bash -n tools/colab/setup.sh`** and **`node scripts/drill-resume.mjs --dry`**.

Master §17 bootstrap set: `tools/colab/{bootstrap.ipynb, setup.sh, watchdog.sh, heartbeat.py,
detect_tier.py, prompts/SESSION_MASTER.md, prompts/SESSION_RESUME.md}`.

1. **`setup.sh` is idempotent**: Node 22 + pnpm + uv + OpenCode, restore HF caches, VRAM tier detection,
   `pnpm install --frozen-lockfile`, `pnpm verify`, then write SESSION + heartbeat. Re-running it must not
   duplicate state or re-download a pinned package. `bash -n` must pass, and a dry-run mode must avoid
   network/GPU side effects.
2. **`watchdog.sh`**: every 600 s commit + push WIP, heartbeat, release expired locks; squash WIP before
   the PR. It must never force-push, never steal a lock, and must refuse to run without a branch.
3. **`heartbeat.py`** writes `docs/state/heartbeat.json` (gitignored) with UTC time, task, branch, lock ids
   and a session id — one file, overwritten, not an event log (I15 allows generated state).
4. **`detect_tier.py`** reports the VRAM tier from the actual device when present, and prints
   `NO_GPU — CPU-safe work only` when absent. No invented VRAM number (I13).
5. **`scripts/drill-resume.mjs --dry`** replays the session-start protocol from §17: `pwd`, `git status`,
   branch, `git log -15`, SESSION/NEXT_SESSION presence, lock expiry, then prints a resume plan. Exit 0
   only when every prerequisite is readable; exit 1 on a broken/missing state, with the reason.
6. **Negative tests, logged**: remove/rename SESSION.md → drill exits 1; inject an expired active lock →
   drill exits 1; `bash -n` on a deliberately broken setup.sh exits nonzero.
7. `prompts/SESSION_RESUME.md` is a short, evidence-based prompt — it must not copy the sealed master into
   `tools/colab/prompts/` twice. `SESSION_MASTER.md` already lives there (Director-authorized bootstrap).

**I8 / D81:** Colab is GPU batch + headless sims + CI only. It never hosts a game server. GPU absent here →
CPU-safe work only; no HF call before the P0-006 license audit (I4).

## 3. Open decisions carried forward

1. **ND-001 / ND-002 — RESOLVED.** HIGH_CONCEPT v1.2 (EN 25, FR 30, T3 signed at P0); A0002 option A,
   WF-002 implemented; `validate-workflows.mjs` given to release-engineer by §6 before P0-004 started.
2. **ND-003 — DEFERRED.** Keep the repo private on the personal account until GATE:P0.
3. **ND-004 / ND-005 — OPEN, Director action.** Rotate the exposed GitHub PAT and HF token. Decision
   carried: do not revoke the PAT before a replacement exists, because that would break all pushes.

## 4. Order after P0-005

1. **P0-006** — AI license audit: Hunyuan3D, AssetFurnace, ComfyUI nodes, HY-Motion, Mesh2Motion,
   Action Forge, tier detection. No model/tool before its license + transitive audit (I4).
2. **P0-007** — dashboard: workflow/locks/threads, concept, GDD, scope, netcode, economy.
3. `GATE:P0` dossier with its 3 drills. NET-GATE follows in P2NET.

## 5. Known red (intentional, not regressions)

- `scope-math.mjs --report` exit 2: throughput unmeasured by design.
- `concept-integrity --score` exit 2 until a measured CIS source exists (HC-003, P2).
- 18 validators print `NOT IMPLEMENTED` and exit 1; `pnpm verify` lists them as DEFERRED and does not run them.

## 6. Environment notes

- Node **22.23.4**, pnpm **12.21.0** (corepack), TypeScript **6.0.3**, Vitest **5.1.0**, Babylon **9.37.0**,
  ws **8.23.0** — `docs/STACK.lock.md`. `uv` is **not** installed; setup.sh must not assume it is.
- No GPU on this machine. `detect_tier.py` must report that honestly.
- Never commit a token. Evidence logs capture commands; secrets must not appear in them.
