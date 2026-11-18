# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T12:34Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| also open | **PR #2** dashboard truth repair — `session/20261118-dashboard-truth`, base = session branch |
| mode | RESUME |
| tier | current `S0`, authorized **`S1`** |
| last task | **PR-S4** — crafting profit-cycle detection; GDD-CRAFT 0.3 |
| next task | **PR-S1** — combat TTK/windows/hit-stop prototype (P2-SYS) |
| blocker | PR #1 and #2 merges (Director must do it), ND-004/ND-005 rotation. ND-011 needs one answer (TPU scope). |

---

## 1. State at hand-off

`pnpm verify` **17/17** · NET-GATE integrity **0**, readiness **1** (8/10 unmet) · tracer green · FULL §20 emitted.

```bash
pnpm install --frozen-lockfile && pnpm verify
node scripts/validate-netgate.mjs
node scripts/validate-netgate.mjs --assert-ready   # exits 1 until the 8 criteria are measured
pnpm vitest run tools/sim/net/test/prn4.test.ts --reporter=verbose
node scripts/session-result.mjs --format full
```

Runtime is ephemeral: `git clone` + `corepack prepare pnpm@12.21.0 --activate` recovers everything.

## 2. Art handoff and the hardware request

Director said "gère l'art et go next" (verbatim, `docs/state/ART_HANDOFF.md`). **No art can be generated here**:
no GPU and no TPU. ND-012 requests a T4 16 GB for AI-001; TPU v5e-1 is not a generation device (ND-011).
Art tasks AI-001..AN-002 remain blocked by `GATE:P2` (P2-SYS + HC-003 + GDD-005) regardless of the
risk-accepted NET-GATE signature. No model was downloaded and no asset was produced. Continue PR-S1 greybox.

## 3. The Director signed everything — what that means and does not mean

A0006 records **"je signe tout"** verbatim. NET-GATE is `signed-with-risk`, **not passed**: the dossier still lists
2 met / 8 unmet criteria (no 4-client matrix, no soak, no tick p95, wire at 3.79× budget, no RPO, gate not wired
into `attachRooms`). `--assert-ready` still exits 1 and must not be weakened. Art is allowed only by risk
acceptance and with the seven residual risks from `docs/legal/THREAT_MODEL.md` attached to every art decision.
**No art is scheduled yet**: the constitution orders P2-SYS before P3-ART.

PR #1 and PR #2 were **not merged** — an agent must not self-merge. The Director must merge them from their own
account. ND-004/ND-005 token rotation also remains a Director action.

## 4. PR-S5 — next (S0, P2SYS)

`{id: PR-S5, ph: P2SYS, tier: S0, t: "ECONOMY 1000 bots x 30 days + exploit scan + report", agent: economy-designer,
role: sig, gdd: [GDD-ECONOMY#thresholds], deps: [PR-S4], out: [tools/sim/economy/prs5_economy.ts, docs/qa/ECONOMY_REPORT.md]}`

Deps are satisfied. Its acc likely uses a broken `pnpm sim …` / `pnpm test --filter …` form — check the blueprint
line and repair it to a command that exists (a vitest test path) in the same PR. Fifteenth known broken form if
left; 7 `pnpm test --filter` accs remain.

Extend PR-S4's minor-unit graph to a deterministic 1000-bot × 30-day simulation with fixed ticks (no wall clock)
and an exploit scan including the positive-cycle detector. Report inflation, sink/faucet totals and Gini only if
actually computed from the simulation; otherwise `NOT COMPUTABLE` with a reason (I13). This is CPU-only; no
GPU/TPU (ND-012), no art, no model download (I4).

## 5. Non-gated tooling candidates

1. Wire `apps/dashboard/check.mjs` into `pnpm verify` — changes the 17-step baseline; own task.
2. Wire `apps/server/src/main.ts` to `attachRooms` **and** `MessageGate` (SEC-002).
3. Generated `docs/state/JOURNAL.md` (master §7) — view missing; `AGENTS.md` §1 points at it.
4. `validate-locks.mjs` cannot represent a gate (`task_id` must exist in `BLUEPRINT.yaml`).
5. Pin the Playwright MCP in `opencode.json` (unpinned, §10.6).
6. `docs/STACK.lock.md` line 39 is stale — **left stale by instruction in A0004**.

## 6. Re-measurement owed before NET-GATE can be READY

1. 4-client RTT 0/50/150/300 ms × loss 0/2/5 % × jitter 0/30 ms matrix, 30-minute soak, zero hash mismatch,
   correction p95 < 0.3 m, no rubber-band > 2 m.
2. Server tick p95 ≤ 25 ms measured under that load.
3. AoI + delta (NET-101) to bring 46 530 B/s under 12 288 B/s at 64 entities.
4. Measured crash dataset with restore ≤ 3 s and published RPO ≤ 60 s.
5. `attachRooms` routed through `MessageGate` with no bypass (SEC-002), plus auth and TLS.

## 7. Environment / hardware

Node 22.23.4, pnpm 12.21.0 via corepack, TypeScript 6.0.3, Vitest 5.1.0.

**Current runtime: no GPU and no TPU** (Director: "là on a pas de tpu ni gpu quand t'en aura besoin fais moi
signe"). Signal before starting accelerator work. PR-S1 is CPU-only. Future hardware declared as TPU v5e-1 +
T4 16 GB: T4 is already the sourced generation tier; TPU has no audited model path (ND-011). Secrets from env
only; the repo is public.
