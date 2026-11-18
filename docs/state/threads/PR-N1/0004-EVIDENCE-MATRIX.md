## 2026-11-18T16:02Z | qa-engineer + netcode-engineer -> all | EVIDENCE

**claim.** PR-N1 has a real 4-client, 24-cell RTT/loss/jitter matrix and a real 30-minute wall-clock soak, with
zero client desyncs, zero server desyncs and zero snapshot-integrity failures (I13). The first full soak held zero
desyncs but died while building its report; that failed attempt is retained and not counted. The fresh run exited
0. The predictor contract was corrected first: a client can predict only its own entity, because other clients'
intents are never broadcast. Whole-world predicted-hash equality is not claimed anywhere.

**evidence** (`docs/state/evidence/`)

| log | command | exit | result |
|---|---|---|---|
| `20261118T152841Z-PR-N1-MATRIX/01-acc-matrix.log` | `PRN1_MATRIX_TICKS=360 pnpm vitest run tools/sim/load/test/prn1-matrix.test.ts --reporter=verbose` | 0 | **6/6**, 24 cells, matrix printed |
| `20261118T152841Z-PR-N1-MATRIX/matrix.json` | machine-readable matrix report | — | 24 cells, 28 694 verified, 0 desyncs |
| `20261118T153000Z-PR-N1-SOAK/02-acc-soak.log` | `PRN1_SOAK=1 PRN1_SOAK_MINUTES=30 pnpm vitest run tools/sim/load/test/prn1-soak.test.ts --reporter=verbose` | **1** | 1 800 s wall clock, 0 desyncs, **report bug**, no soak.json |
| `20261118T160104Z-PR-N1-SOAK-FIX/01-matrix-after-fix.log` | `pnpm vitest run tools/sim/load/test/prn1-matrix.test.ts --reporter=verbose` | 0 | **7/7**, includes a 300k-sample regression test |
| `20261118T160115Z-PR-N1-SOAK/02-acc-soak.log` | same soak command, fresh evidence dir | 0 | **1/1**, 1,800.03 s wall clock, 54,001 ticks, 162,586 verified |
| `20261118T160115Z-PR-N1-SOAK/soak.json` | machine-readable soak report | — | 0 desyncs, 0 integrity failures, p95 50 mm / max 250 mm |

**measured (matrix).** 24 requested cells, 4 clients, 64 entities, 360 ticks/cell, seed 4242. **0** client
desyncs, **0** server desyncs, **0** snapshot-integrity failures, **28 694** verified own-entity snapshots,
correction p95 **50 mm**, max **450 mm**, **0** over 2 m; server tick p95 max **0.4411 ms**; down
**45 819–46 401 B/s**, up **494–553 B/s**. The down budget still fails at **3.79×**.

**measured (soak).** First attempt: full 1,800 s wall clock, tick 52,214, 157,197 verified snapshots, 0 desyncs,
then `RangeError: Maximum call stack size exceeded` from `Math.max(0, ...corrections)`; exit 1, no `soak.json`,
retained and **not** counted. Fresh run: 1,800.03 s, 54,001 ticks at 30 Hz, 4 clients / 64 entities, 162,586
verified snapshots, **0** client/server desyncs, **0** integrity failures, correction p95 **50 mm**, max
**250 mm**, 0 over 2 m, server tick p95 **0.1632 ms**, down 46,526.98 B/s (3.786×), RSS peak 106.1 MB, all
checks true, exit 0.

**defect 1 — prediction scope.** The first 4-client run produced 1,152 false "desyncs" at the minimum link with
zero position error. A client cannot predict another client's entity: only its own intents are local. The predictor
now verifies `hashWorld(entities)` against the snapshot hash and compares only the own entity at the acked tick;
an in-flight intent is `unknown`, never a desync. New unit tests cover another client moving, a hash inconsistent
with its entities, an own-entity divergence at the same seq, and the server-ahead case.
`apps/game/test/net.test.ts` is **22/22**.

**defect 2 — report overflow.** `reportFor()` spread correction samples into `Math.max`, which overflows the
call stack for a 30-minute soak. `maxSample()` reduces instead, and a 300k-element regression test proves the
fix. Both the failing log and the fixed test are kept.

**honest limits.** In-process emulated transport (no kernel sockets, no `tc netem`, no browser); requested RTT
0/50/150/300 ms quantizes to 33.3/66.7/166.7/300 ms at 30 Hz; loss is client→server only; the server tick p95 is
in-process CPU, not a deployment number; the real 30-minute soak covers one requested cell, not all 24; the CI
`soak.yml` remains a workflow-dispatch placeholder and is not claimed as CI coverage. No art (I2). Four of the
ten NET-GATE criteria remain unmet (wire, reconnect crash half, crash/RPO, threat/auth) and `--assert-ready` still
exits 1.

**locks.** PR-N1 globs on `state/locks` (`AGENTS.md`, `apps/game/src/net/**`, `apps/game/test/**`,
`docs/design/gdd/GDD-NETCODE.md`, `docs/qa/prototypes/**`, `docs/state/**`, `scripts/validate-netgate.mjs`,
`tools/sim/load/**`), acquired in one sorted commit (`c3b1ef6`) and renewed before expiry (`5607ffb`).
No self-merge. **PR #4** https://github.com/Ggboykxz/strata/pull/4 is open for Director review.
