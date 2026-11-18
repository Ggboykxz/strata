# GATE:NET — signed with risk acceptance

| field | value |
|---|---|
| gate | GATE:NET (blocking before art, master §5.2) |
| status | **SIGNED — RISK ACCEPTED** |
| Director statement | "je signe tout" (verbatim, 2026-11-18) |
| authority | A0006; `docs/qa/prototypes/NET_GATE.md` §6 |
| evidence verdict at signature | **NOT READY — 8/10 criteria unmet** |
| current verdict (post-PR-N1) | **NOT READY — 4/10 criteria unmet** (wire, reconnect, crash/RPO, threat) |
| art_allowed | true **because the Director accepted the risk**, not because criteria were measured |

## Signature

**Director signature: SIGNED — RISK ACCEPTED — 2026-11-18.** Recorded Director decision, quoted verbatim:
**"je signe tous"** (A0009). Signed by the DIRECTOR and transcribed by the orchestrator; no agent fabricated or
inferred a signature (D136). The gate dossier keeps all 10 master §5.2 criteria with their honest statuses: 2 met,
8 `not-measured`, `partial` or `failing`. This signature is a risk acceptance, not a measurement.

`node scripts/validate-netgate.mjs` passes because the dossier is honest. `node scripts/validate-netgate.mjs
--assert-ready` exits 1 because criteria remain unmet: 8 at signature time, 4 after the PR-N1 measurements below.
Both facts are recorded; neither is hidden.

## Unmet criteria at signature time

1. four-client RTT/loss/jitter matrix — not measured.
2. 30-minute soak — not measured.
3. desync correction p95 / rubber-band distance — not measured.
4. server tick p95 ≤ 25 ms — not measured under load.
5. wire ≤ 12 KB/s — **failing** at 46 530 B/s (3.79×).
6. reconnect exact-state proof with 4 clients — partial.
7. crash restore ≤ 3 s and RPO ≤ 60 s — partial, no measured dataset.
8. every client message validated on the live path — **mitigated after signature by SEC-002**; the 8-unmet signature-time count is retained verbatim.

## Re-measurement obligation

This signature is not a permanent certificate. PR-N1 now supplies a real 4-client harness and a 30-minute soak;
AoI/delta (NET-101) and RPO evidence still do not exist. The gate must be re-measured when they do and either
confirmed or revoked. The residual risks in `docs/legal/THREAT_MODEL.md` stay attached to every art decision made
under this gate.

## Re-measurement after PR-N1 (2026-11-18)

PR-N1 added a 4-client, 24-cell RTT/loss/jitter matrix (360 ticks per cell) and a real 30-minute soak. The first
soak attempt is preserved as evidence of a report-building defect, not counted as a pass. The signature-time section
above is retained verbatim; this section records the later measurements without rewriting history.

| criterion | signature time | after PR-N1 |
|---|---|---|
| four-client matrix | not measured | **met** — 24 cells, 0 desyncs, 0 integrity failures, 28 694 verified snapshots; in-process emulated transport, requested RTT 0/50/150/300 ms quantized to 33.3/66.7/166.7/300 ms, loss on client→server only |
| 30-minute soak | not measured | **met** — real 1,800.03 s wall clock, 54,001 ticks at 30 Hz, 0 desyncs, 0 integrity failures, correction p95 50 mm / max 250 mm, server tick p95 0.1632 ms; first attempt's report bug retained, see `docs/qa/prototypes/PRN1_MATRIX.md` §4 |
| desync correction | not measured | **met** — p95 50 mm, max 450 mm, 0 over 2 m |
| server tick p95 | not measured | **met in-process** — p95 max 0.4411 ms; not a kernel/GC/network number |
| wire ≤ 12 KB/s | failing at 46 530 B/s | **still failing** — 46 400.75 B/s measured, 3.79×; NET-101 owns AoI/delta |
| reconnect exact state | partial | **partial** — reconnect proof: same entity, seq 106 and exact snapshot hash, late resume refused; crash restore and RPO still unmeasured |
| every client message validated | mitigated by SEC-002 | unchanged; authentication and TLS remain |

`node scripts/validate-netgate.mjs` must still pass as an honesty check. `--assert-ready` must still exit 1 until
the wire budget, crash restore/RPO, the reconnect crash half and the remaining security items are closed. No art is
produced by this re-measurement (I2).
