# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T16:02Z |
| branch | `session/20261118-dashboard-next` — DASH-NEXT PR prepared, **never self-merged**; PR-N1 remains **PR #4** https://github.com/Ggboykxz/strata/pull/4 |
| mode | RESUME |
| tier | current `S0`, authorized **`S1`** (GATE:P1 signed) |
| last task | **DASH-NEXT** — Next.js view prepared for Vercel, no deployment |
| next task | Director merge / token rotation; then NET-101 AoI/delta (tier S2, **GATE:P4-blocked**) |
| blockers | ND-004/005 token rotation, Director PR merge, wire budget 3.79×, crash/RPO, auth/TLS |

---

## 0. Read first: handoffs and live work

- `docs/state/GPU_HANDOFF.md` — hardware probes, audited model whitelist, art contract, NET-GATE criteria and
  the first-session checklist on the T4 runtime. GPU arrival does **not** authorize generation: `--assert-ready`
  must reach 0 first (I2/A0008). ND-004/005 rotation precedes HF use.
- `docs/qa/prototypes/PRN1_MATRIX.md` — the PR-N1 report. Its §4 records both the failed first soak and the
  passing 30-minute rerun (EXIT=0, 1,800.03 s, 54,001 ticks, 162,586 verified snapshots, 0 desyncs,
  correction p95 50 mm / max 250 mm, server tick p95 0.1632 ms) in
  `docs/state/evidence/20261118T160115Z-PR-N1-SOAK/`.
- `docs/qa/prototypes/NET_GATE.md` and `docs/state/gates/GATE_NET.md` — signature-time count **8/10 unmet** is
  preserved verbatim; the current count after PR-N1 is **4/10 unmet**. The validator depends on the 8/10
  strings; do not renumber them.

## 1. State at hand-off

`pnpm verify` was **19/19** before PR-N1; rerun after the soak (not while it is live). NET-GATE integrity **0**,
readiness **1**. Matrix: 24 cells, 4 clients, 64 entities, 28,694 verified snapshots, 0 desyncs, correction
p95 50 mm / max 450 mm, server tick p95 max 0.4411 ms in-process. Soak: 1,800.03 s, 54,001 ticks, 162,586
verified snapshots, 0 desyncs, correction p95 50 mm / max 250 mm, server tick p95 0.1632 ms. Wire **still
failing at 3.79×**.

```bash
pnpm install --frozen-lockfile && pnpm verify
node scripts/validate-netgate.mjs                  # 0: dossier is honest
node scripts/validate-netgate.mjs --assert-ready   # 1: 5 criteria unmet (4 after a passing soak)
PRN1_MATRIX_TICKS=360 pnpm vitest run tools/sim/load/test/prn1-matrix.test.ts --reporter=verbose
PRN1_SOAK=1 PRN1_SOAK_MINUTES=30 pnpm vitest run tools/sim/load/test/prn1-soak.test.ts --reporter=verbose
node scripts/session-result.mjs --format full
```

Runtime is ephemeral: `git clone` + `corepack prepare pnpm@12.21.0 --activate` recovers everything.

## 2. Long-term quality doctrine (A0008, Director)

Ashes-of-Creation-class quality with Babylon.js over the long term, "la qualité compte peut importe le temps
qu'il faudra". **Benchmark only — I11 forbids copying that commercial IP.** Server truth before visuals,
evidence over adjectives, audited stack, vertical slice before scale, no silent bypass. The
P2-SYS → GATE:P2 → P3-ART sequence is unchanged; unmet criteria stay in the record.

## 3. Gates and signatures — what they mean

A0006/A0009 record **"je signe tout"** verbatim. GATE:P0 / P1 / P2 are signed. GATE:NET is
**SIGNED — RISK ACCEPTED**, not passed: the dossier lists the honest criteria, and `--assert-ready` still exits 1.
A signature never makes an unmeasured criterion measured, and no agent signs or merges. PR #1 is merged,
PR #2 closed without merging, PR #3 merged into `main` at `a84733e`; the default branch is still the session
branch (Director settings action). The seven residual risks in `docs/legal/THREAT_MODEL.md` stay attached to
every art decision made under the risk acceptance.

## 4. Re-measurement still owed before NET-GATE can be READY

1. AoI + delta (NET-101) to bring 46,530 B/s under 12,288 B/s at 64 entities (tier S2, GATE:P4-blocked).
2. Measured crash dataset with restore ≤ 3 s and a published RPO ≤ 60 s; the reconnect half is proven.
3. Authentication and TLS; anti-cheat beyond plausibility. The `attachRooms` half is done (SEC-002).
4. A kernel/browser loss run and a production tick p95: the PR-N1 matrix and soak use an in-process link
   quantized to 30 Hz, so they do not substitute for deployment evidence.

## 5. Director items and external deployment

- **ND-004 / ND-005** — rotate the exposed GitHub PAT and HF token before any Vercel/HF integration.
- **ND-011** — TPU v5e-1: training-only or an audited generation path?
- **ND-012** — T4 16 GB arrival; log both `detect_tier.py` probes before any generation.
- **Dashboard on Vercel, with Next.js (Director, 2026-11-18)** — separate task/PR, not part of PR-N1 (one task
  per PR). `apps/dashboard-next` now exists and renders `apps/dashboard/dist/data.json` at build time; the static
  dashboard and verify 19/19 remain unchanged. Pins next 14.2.35 / react 18.3.1 / react-dom 18.3.1 are in
  `pnpm-lock.yaml` and `docs/STACK.lock.md`; Next 16 was rejected (optional LGPL sharp/libvips chain) and
  downgraded. I4 audit is in `docs/legal/DEPENDENCY_AUDIT_NEXTJS.md`.
  `vercel.json` is prepared only. Rebuild on each push; connect Vercel only after ND-004/005 rotation with a
  fresh token. No deployment was performed by an agent.
- Repo default branch remains `session/20261118-hc-001-high-concept`; switch to `main` in Settings if intended.

## 6. Environment

Node 22.23.4, pnpm 12.21.0 via corepack, TypeScript 6.0.3, Vitest 5.1.0. Current runtime has **no GPU and no
TPU**. The repo is public; secrets come from the environment only. Nine models are in the P0-006 whitelist;
no binary enters git and no art is produced until the gates and I4 audits allow it.
