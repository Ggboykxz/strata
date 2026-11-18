# NET-GATE dossier — SIGNED WITH RISK, NOT READY ON EVIDENCE

| field | value |
|---|---|
| task | NG-001 |
| date | 2026-11-18 |
| status | **SIGNED — RISK ACCEPTED (8/10 criteria unmet)** |
| gate | NET-GATE (blocking before any art, master §5.2) |
| Director signature | "je signe tout" — blanket instruction recorded 2026-11-18 (A0006) |

**Reading rule.** `node scripts/validate-netgate.mjs` validates that this dossier is **honest and evidence-complete**.
Its exit 0 does **not** mean NET-GATE passed. `node scripts/validate-netgate.mjs --assert-ready` checks the gate
criteria themselves and exits **1** today. The Director signs only after a READY result, which does not exist yet.

## 1. Scope and authority

Master §5.2 requires: authoritative 30 Hz server; 4 clients with prediction/reconciliation/interpolation; an RTT
0/50/150/300 ms × loss 0/2/5 % × jitter 0/30 ms matrix with a 30-minute soak, zero desync hash mismatch,
correction p95 < 0.3 m and no rubber-band > 2 m; server tick p95 ≤ 25 ms; wire ≤ 12 KB/s down and ≤ 3 KB/s up;
reconnect restoring exact state and crash restore ≤ 3 s on a measured dataset with an RPO ≤ 60 s; a 10k
transaction fuzz with zero drift; and a threat model with every client message validated and anti-cheat
plausibility active. The Director signed with risk acceptance (A0006); no art is produced by this gate task (I2).

## 2. NET-GATE criteria

| id | status | command | exit | log | note |
|---|---|---|---|---|---|
| authoritative-server | met | `pnpm tracer --assert` | 0 | `docs/state/evidence/20261118T094911Z-SEC-001/06-tracer.log` | headless core tick at 30 Hz; equal hashes, desync rejected |
| four-client-matrix | met | `pnpm vitest run tools/sim/load/test/prn1-matrix.test.ts --reporter=verbose` | 0 | `docs/state/evidence/20261118T152841Z-PR-N1-MATRIX/01-acc-matrix.log` | 24 cells × 4 clients × 64 entities, 0 desyncs, 0 integrity failures, 28 694 verified snapshots; in-process emulated transport, requested RTT 0/50/150/300 ms quantized to 33.3/66.7/166.7/300 ms, loss on client→server only |
| soak-30min | met | `pnpm vitest run tools/sim/load/test/prn1-soak.test.ts --reporter=verbose` | 0 | `docs/state/evidence/20261118T160115Z-PR-N1-SOAK/02-acc-soak.log` | `PRN1_SOAK=1 PRN1_SOAK_MINUTES=30`, real 1,800.03 s wall clock, 54,001 ticks at 30 Hz, 0 desyncs, 0 integrity failures, correction p95 50 mm / max 250 mm, server tick p95 0.1632 ms; first attempt's report bug retained and not counted |
| desync-correction | met | `pnpm vitest run tools/sim/load/test/prn1-matrix.test.ts --reporter=verbose` | 0 | `docs/state/evidence/20261118T152841Z-PR-N1-MATRIX/01-acc-matrix.log` | correction p95 50 mm < 300 mm, max 450 mm ≤ 2 000 mm, 0 over 2 m, 0 desyncs across the 24 cells |
| server-tick-p95 | met | `pnpm vitest run tools/sim/load/test/prn1-matrix.test.ts --reporter=verbose` | 0 | `docs/state/evidence/20261118T152841Z-PR-N1-MATRIX/01-acc-matrix.log` | p95 max 0.4411 ms under 4 clients / 64 entities, in-process CPU (simulation + hash + encode); not a kernel/GC/network number |
| wire-budget | failing | `pnpm vitest run packages/protocol -t 1 551` | 0 | `docs/state/evidence/20261118T082404Z-NET-002/09-frame-size.log` | 46 530 B/s theoretical = 3.79× the 12 288 B/s budget; PR-N1 measured 46 400.75 B/s per client; NET-101 owns AoI/delta |
| reconnect-restore | partial | `pnpm vitest run tools/sim/load/test/prn1-matrix.test.ts --reporter=verbose` | 0 | `docs/state/evidence/20261118T152841Z-PR-N1-MATRIX/01-acc-matrix.log` | 4-client reconnect restores the same entity, seq 106 and exact snapshot hash; late resume refused; crash restore and an RPO promise are still unmeasured |
| crash-restore-rpo | partial | `pnpm vitest run tools/sim/persist/test/prn3.test.ts --reporter=verbose` | 0 | `docs/state/evidence/20261118T092845Z-PR-N3/01-acc-fuzz.log` | 10k replay with zero drift; no disk dataset, no ≤3 s timing, no RPO promise |
| ledger-fuzz | met | `pnpm vitest run tools/sim/persist/test/prn3.test.ts --reporter=verbose` | 0 | `docs/state/evidence/20261118T092845Z-PR-N3/01-acc-fuzz.log` | 10 000 tx, 1 000 duplicates, 1 conflict, drift 0 minor units |
| threat-and-anticheat | partial | `pnpm vitest run --config tests/security/vitest.config.ts` | 0 | `docs/state/evidence/20261118T094911Z-SEC-001/01-acc-security.log` | gate exists with counted reasons; not wired into `attachRooms` (SEC-002); plausibility from PR-N4 only |

**Post-PR-N1 measurement (2026-11-18).** Four of the eight signature-time gaps are measured: four-client
matrix, 30-minute soak, desync correction and server tick p95 (in-process, scoped). Four remain: `wire-budget`,
`reconnect-restore` (crash half), `crash-restore-rpo`, `threat-and-anticheat`. The first soak attempt is retained
as a failed report (exit 1) and is not counted. The 8/10 header is the signature-time record; the current count is
4/10, and `--assert-ready` still exits 1.

## 3. Residual risks (verbatim from `docs/legal/THREAT_MODEL.md`)

1. No authentication — the resume handle is an FNV-1a tamper detector, not a credential.
2. No TLS in the harnesses — all local tests use in-process or fake sockets.
3. **The gate is now on the live path (SEC-002)** — `attachRooms` routes every frame through `MessageGate` before `Room.handleBytes`; malformed frames are refused. This was one of the 8 criteria unmet at signature time; it has since been mitigated. The signature-time count of 8 is retained for honesty, not silently renumbered.
4. In-memory counters only — no distributed limiter and no persistence.
5. No real socket flood test — the 200-message burst is in-process.
6. Audit retention is unimplemented — the 90-day target is OPS-001.
7. No anti-cheat beyond plausibility — no behavioural profiling or statistical detection.

GDD-SECURITY therefore does **not** claim "0 unvalidated message paths". NET-GATE must not be presented as a
security certification.

## 4. Evidence completeness

CI proof at each checkpoint: 8/8 triggered workflows success at `50295d2`, `fea7306` predecessors, `5007976`,
`50295d2`, `42dc8a3`, `50295d2`, `d6d45e0`, `423d190`, `daa0c14`, `c6670a6`, `b1d67a5` and `fb595cd` (run ids in
the `*-ci-proof.log` files of each evidence directory). `pnpm verify` is 19/19 at the current head. Metrics source:
`docs/state/metrics/2026-11-18-s03.json` (PR-N1 measurements; it keeps the signature-time `criteria_unmet: 8`
required by the validator). The signed `s02` snapshot is retained unchanged. PR-N1 evidence:
`docs/state/evidence/20261118T152841Z-PR-N1-MATRIX/` and `docs/state/evidence/20261118T153000Z-PR-N1-SOAK/`.
No art asset was produced (I2); NET-GATE remains `signed-with-risk` and `--assert-ready` still fails.

## 5. What would make it READY

1. **Measured by PR-N1, in-process:** a 4-client, 24-cell RTT/loss/jitter matrix with zero desyncs, correction
   p95 50 mm, max 450 mm, and a real 30-minute soak. The transport is emulated; a kernel/browser loss run is
   still owed, so this is not a production-network measurement.
2. **Measured by PR-N1, in-process:** server tick p95 max 0.4411 ms under 4 clients / 64 entities. This includes
   `Room.tick()` and encoding, but not OS scheduling, GC or network contention; NET-006 still owns the production
   number.
3. AoI + delta snapshots (NET-101) bringing the down wire under 12 KB/s at 64 entities. **Still failing:**
   PR-N1 measured 46 400.75 B/s per client, 3.79× the budget.
4. A measured crash dataset with restore ≤ 3 s and a published RPO ≤ 60 s.
5. Authentication and TLS. The `attachRooms` half is done (SEC-002); no bypass path remains in the live route.

## 6. Signature — Director only

```
status: SIGNED — RISK ACCEPTED
Director: "je signe tout" (blanket instruction, 2026-11-18, A0006)
date: 2026-11-18
criteria_unmet: 8/10 — NOT READY on evidence
note: The Director accepted the risk; no evidence, status or measurement was changed to obtain the signature.
```

The Director signed with full knowledge of the unmet criteria (A0006). No agent fabricated a signature; the
signature block above is unchanged. The evidence table records measurements added after signature time, and the
header retains the signature-time count of 8/10 for honesty.
