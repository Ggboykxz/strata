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
| four-client-matrix | not-measured | NOT COMPUTABLE | — | NOT COMPUTABLE | no 4-client harness exists; local fake sockets only |
| soak-30min | not-measured | NOT COMPUTABLE | — | NOT COMPUTABLE | PR-N1 measured 180 ticks of local CPU, not a 30-minute soak |
| desync-correction | not-measured | NOT COMPUTABLE | — | NOT COMPUTABLE | correction p95 < 0.3 m and rubber-band > 2 m have no measured source |
| server-tick-p95 | not-measured | NOT COMPUTABLE | — | NOT COMPUTABLE | metrics `server_tick_p95_ms` is null; local CPU p95 must not be substituted |
| wire-budget | failing | `pnpm vitest run packages/protocol -t 1 555` | 0 | `docs/state/evidence/20261118T195450Z-NETGATE-CORE/07-wire-1555.log` | 46 650 B/s = 3.80× the 12 288 B/s budget (v4, A0010: header 15→19 B); NET-101 owns AoI/delta |
| reconnect-restore | partial | `pnpm vitest run apps/server/test/rooms.test.ts` | 0 | `docs/state/evidence/20261118T085724Z-NET-003/01-acc-rooms.log` | handles and snapshots proven in-process; no 4-client reconnect or measured RPO |
| crash-restore-rpo | partial | `pnpm vitest run tools/sim/persist/test/prn3.test.ts --reporter=verbose` | 0 | `docs/state/evidence/20261118T092845Z-PR-N3/01-acc-fuzz.log` | 10k replay with zero drift; no disk dataset, no ≤3 s timing, no RPO promise |
| ledger-fuzz | met | `pnpm vitest run tools/sim/persist/test/prn3.test.ts --reporter=verbose` | 0 | `docs/state/evidence/20261118T092845Z-PR-N3/01-acc-fuzz.log` | 10 000 tx, 1 000 duplicates, 1 conflict, drift 0 minor units |
| threat-and-anticheat | partial | `pnpm vitest run --config tests/security/vitest.config.ts` | 0 | `docs/state/evidence/20261118T094911Z-SEC-001/01-acc-security.log` | gate exists with counted reasons; not wired into `attachRooms` (SEC-002); plausibility from PR-N4 only |

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
the `*-ci-proof.log` files of each evidence directory). `pnpm verify` is 17/17 at the current head. Metrics source:
`docs/state/metrics/2026-11-18-s02.json`. No art asset was produced (I2); NET-GATE remains `unpassed` with
`art_allowed: false`.

## 5. What would make it READY

1. A 4-client integration harness covering the full RTT/loss/jitter matrix and a 30-minute soak, with zero hash
   mismatches, measured correction p95 and rubber-band distance.
2. A server tick p95 measured under that load (≤ 25 ms), not a local CPU microbenchmark.
3. AoI + delta snapshots (NET-101) bringing the down wire under 12 KB/s at 64 entities.
4. A measured crash dataset with restore ≤ 3 s and a published RPO ≤ 60 s.
5. `attachRooms` routed through `MessageGate` with no bypass path (SEC-002), plus authentication and TLS.

## 6. Signature — Director only

```
status: SIGNED — RISK ACCEPTED
Director: "je signe tout" (blanket instruction, 2026-11-18, A0006)
date: 2026-11-18
criteria_unmet: 8/10 — NOT READY on evidence
note: The Director accepted the risk; no evidence, status or measurement was changed to obtain the signature.
```

The Director signed with full knowledge of the unmet criteria (A0006). No agent fabricated a signature; the evidence table above is unchanged.
