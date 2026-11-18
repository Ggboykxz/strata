# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T14:02Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| also open | **PR #2** dashboard truth repair — `session/20261118-dashboard-truth`, base = session branch |
| mode | RESUME |
| tier | current `S0`, authorized **`S1`** |
| last task | **GDD-005** — GDD→test transpiler + drift detection; coverage 100% |
| next task | **PR-S7** — world tick + bounded Rouille cascade (P2-SYS) |
| blocker | **No agent-selectable task.** PRs done (#2 closed, #3 merged at `a84733e`). Left: ND-004/005 rotation, ND-011, ND-012 (T4), 8 NET-GATE measurements. |

---

## 0. Long-term quality doctrine (A0008, Director)

Director: Ashes-of-Creation-class quality with Babylon.js over the long term, "la qualité compte peut importe le
temps qu'il faudra". **Benchmark only — I11 forbids copying that commercial IP.** Operationally: server truth
before visuals, evidence over adjectives, audited stack, vertical slice before scale, no silent bypass. The
current P2-SYS → GATE:P2 → P3-ART sequence is unchanged; unmet criteria stay in the record.

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

## 4. GATE:P2 — ready on the work side

GATE:P2 requires GATE:NET (human signature), GATE:P2SYS (done), HC-003 (done, CIS 85/100), GDD-005 (done, 100%
coverage + drift detection) and `cis_min: 50`. The remaining act is the Director's formal GATE:P2 signature.
GATE:NET also awaits a human signature; NET-GATE stays `signed-with-risk` with 8 unmet criteria. No art before
both gates are actually passed (A0008). PR #3 is merged into `main` (`a84733e`); PR #2 is closed without merging. The repo default branch is still the session branch — Director may switch it to `main` in Settings → Branches.

## 4b. Babylon 9 feature research (Director input)

`docs/state/threads/ENGINE-BABYLON9/0001-RESEARCH.md` records the impact analysis. Babylon 9.37.0 is already
pinned and audited; the 9.0 node graphs are VFX/rendering tools, not gameplay truth (I1/A0001). Evaluate
animation retargeting at AN-002, splat/large-world features at WG-001, lighting at P3-003 — each with an I4 audit
and a measured budget, never from a blog claim. Constitution §10.4 still says "Babylon.js 8" while STACK pins
9.37.0: a Director-signed ADR is needed to amend that sentence.

## 5. Non-gated tooling candidates

1. Wire `apps/dashboard/check.mjs` into `pnpm verify` — changes the 17-step baseline; own task.
2. ~~Wire `apps/server/src/main.ts` to `attachRooms` **and** `MessageGate` (SEC-002)~~ **DONE** — rooms on 8788, real loopback test, full 302/302.
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

**Current runtime: no GPU and no TPU.** Director confirmed "je dois donc passer au t4 pour continuer" (ND-012).
The T4 16 GB is needed for **art generation only** (AI-001/AI-002); PR-S7/PR-S8 and the NET-GATE measurements
are CPU-only and can proceed now. On T4 arrival, log both detect_tier.py probes (expect 16GB / 15 360 MiB), then
start AI-001 under locks — nine models are already audited, no binary enters git. TPU v5e-1 is not a generation
device (ND-011). Secrets from env only; the repo is public.
