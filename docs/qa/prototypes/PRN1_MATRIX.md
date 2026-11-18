# PR-N1 — four-client matrix and real 30-minute soak

| field | value |
|---|---|
| task | PR-N1 (NET-GATE measurement completion) |
| date | 2026-11-18 |
| branch | `session/20261118-prn1-matrix` |
| matrix evidence | `docs/state/evidence/20261118T152841Z-PR-N1-MATRIX/` |
| soak evidence (first attempt) | `docs/state/evidence/20261118T153000Z-PR-N1-SOAK/` — 30 minutes, exit **1**, report bug |
| soak evidence (rerun) | `docs/state/evidence/20261118T160115Z-PR-N1-SOAK/` — fresh 30-minute run, **EXIT=0** |
| matrix command | `PRN1_MATRIX_TICKS=360 pnpm vitest run tools/sim/load/test/prn1-matrix.test.ts --reporter=verbose` |
| soak command | `PRN1_SOAK=1 PRN1_SOAK_MINUTES=30 pnpm vitest run tools/sim/load/test/prn1-soak.test.ts --reporter=verbose` |
| exit | matrix 0 (6/6); first soak 1 (report bug); rerun 0 (1/1) |

Supersedes the **measurement scope** of `docs/qa/prototypes/PRN1.md` (append-only; a 180-tick local CPU run that
explicitly was not RTT and not a soak). That earlier record is kept, not rewritten.

## 1. What this measures

The harness drives the **real** `Room`, `MessageGate`, binary codec, `SimHost` and client `Predictor` over an
in-process link that emulates RTT, jitter and packet loss. Four clients share one 64-entity room; each client
predicts its own entity, receives full snapshots, reconciles, replays unacked intents and acks the adopted
snapshot hash.

**Loss model.** WebSocket is a reliable ordered stream. A lost frame is therefore not a hole in the application
stream: it is delivered late, and every frame behind it waits (head-of-line blocking). The link models loss as a
retransmission delay of one RTT on a reliable stream, not as a deleted snapshot. This is the honest application
view of TCP/WebSocket loss. It is **not** kernel networking, `tc netem`, a browser, or a claim about a production
ISP. In this matrix, loss is applied to the **client→server** direction; server→client snapshots are delayed by
RTT and jitter but not dropped.

**Tick quantization.** A frame sent during tick T is first deliverable at T+1, so the requested 0/50/150/300 ms
RTT values become **33.3 / 66.7 / 166.7 / 300 ms** actual (1/2/5/9 ticks); 30 ms of jitter is 33.3 ms (1 tick).
The matrix keeps the requested labels, and `emulated.rtt_ms` in `matrix.json` records the actual value. No
sub-tick precision is claimed.

**Clock model.** The client runs `lead = uplinkTicks` ahead: an intent generated for local tick T is sent when the
server is at T − lead and reaches the server at T. The client's prediction at T and the snapshot for T therefore
name the same tick. This relation is part of the harness, and the matrix verifies that it produces the expected
corrections rather than assuming it.

## 2. Defect found by the first real 4-client run

The first run produced 1,152 "desyncs" in the 0 ms cell, with **zero position error**. The cause was not the
simulation: a client cannot predict another client's entity. Only its own intents are local; another player's
intent never crosses the wire, and a snapshot arrives after the fact. Comparing the client's predicted
whole-world hash with the server's hash therefore fails as soon as anyone else moves.

The predictor contract was corrected before the matrix was accepted:

1. `reconcile()` verifies `hashWorld(snapshot.entities) === snapshot.hash`; a snapshot inconsistent with its own
   entity list is a real desync.
2. It compares the client's **own** entity at the acked tick. Equal `seq` requires an exact entity match;
   `predicted.seq > server.seq` with a covering in-flight intent is `unknown` (prediction, not divergence);
   `predicted.seq < server.seq` is `unknown` (the server applied input ahead of the local timeline).
3. A surviving intent whose original tick is at or before the snapshot is re-scheduled on the next local tick,
   and every replayed tick is recorded in the timeline. `advance()` now records idle ticks.
4. New unit tests cover another client's movement, a hash inconsistent with its entities, an own-entity
   divergence at the same seq, and the server-ahead case. `apps/game/test/net.test.ts` is 22/22.

Whole-world prediction remains out of scope until an input-broadcast design exists. GDD-NETCODE 0.8 states the
scope instead of claiming a whole-world hash equality the client cannot compute.

## 3. Matrix — RTT 0/50/150/300 ms × loss 0/2/5 % × jitter 0/30 ms

24 cells, 4 clients, 64 entities, 360 ticks per cell (12 s of simulated time per cell), seed 4242.
`matrix.json` is the machine-readable source; the table is copied from `01-acc-matrix.log`.

| req. RTT ms | req. loss % | req. jitter ms | desyncs | verified | speculative | server-ahead | corr p50/p95/max mm | tick p95 ms | down B/s | up B/s |
|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|
| 0 | 0 | 0 | 0 | 1432 | 0 | 0 | 0/0/0 | 0.4411 | 46400.75 | 553 |
| 0 | 0 | 30 | 0 | 1114 | 259 | 56 | 0/50/50 | 0.1701 | 46303.81 | 499.71 |
| 0 | 2 | 0 | 0 | 1396 | 36 | 0 | 0/0/50 | 0.1851 | 46400.75 | 544.75 |
| 0 | 2 | 30 | 0 | 1106 | 263 | 59 | 0/50/50 | 0.1544 | 46336.13 | 500.9 |
| 0 | 5 | 0 | 0 | 1373 | 59 | 0 | 0/0/50 | 0.1591 | 46400.75 | 539.94 |
| 0 | 5 | 30 | 0 | 1088 | 285 | 55 | 0/50/50 | 0.158 | 46271.5 | 496.23 |
| 50 | 0 | 0 | 0 | 1432 | 0 | 0 | 0/0/0 | 0.1488 | 46400.75 | 553 |
| 50 | 0 | 30 | 0 | 1151 | 199 | 79 | 0/50/50 | 0.1363 | 46336.13 | 513.04 |
| 50 | 2 | 0 | 0 | 1335 | 66 | 31 | 0/50/50 | 0.1428 | 46400.75 | 538.56 |
| 50 | 2 | 30 | 0 | 1120 | 226 | 83 | 0/50/100 | 0.1496 | 46368.44 | 509.88 |
| 50 | 5 | 0 | 0 | 1241 | 129 | 62 | 0/50/50 | 0.1582 | 46400.75 | 525.04 |
| 50 | 5 | 30 | 0 | 1091 | 242 | 97 | 0/50/100 | 0.1616 | 46336.13 | 507.77 |
| 150 | 0 | 0 | 0 | 1424 | 0 | 0 | 0/0/0 | 0.1534 | 46142.25 | 549 |
| 150 | 0 | 30 | 0 | 1116 | 188 | 117 | 0/50/50 | 0.1534 | 46077.63 | 528.06 |
| 150 | 2 | 0 | 0 | 1224 | 166 | 34 | 0/50/200 | 0.1632 | 46142.25 | 522.19 |
| 150 | 2 | 30 | 0 | 1066 | 253 | 100 | 0/50/250 | 0.1513 | 46045.31 | 515.19 |
| 150 | 5 | 0 | 0 | 1154 | 224 | 46 | 0/50/200 | 0.15 | 46142.25 | 510.04 |
| 150 | 5 | 30 | 0 | 1070 | 270 | 80 | 0/50/250 | 0.1474 | 46045.31 | 508.54 |
| 300 | 0 | 0 | 0 | 1416 | 0 | 0 | 0/0/0 | 0.1511 | 45883.75 | 545 |
| 300 | 0 | 30 | 0 | 1142 | 158 | 110 | 0/50/50 | 0.1766 | 45786.81 | 530.21 |
| 300 | 2 | 0 | 0 | 1265 | 134 | 17 | 0/50/400 | 0.1652 | 45883.75 | 523.92 |
| 300 | 2 | 30 | 0 | 1009 | 310 | 93 | 0/50/450 | 0.1589 | 45851.44 | 510.35 |
| 300 | 5 | 0 | 0 | 1002 | 367 | 47 | 0/50/400 | 0.1611 | 45883.75 | 494.58 |
| 300 | 5 | 30 | 0 | 927 | 398 | 87 | 0/50/400 | 0.1665 | 45819.13 | 497.71 |

Totals: **28,694 verified snapshots**, **0 client desyncs**, **0 server desyncs**, **0 snapshot-integrity
failures**, correction **p95 50 mm**, **max 450 mm**, **0 corrections over 2 m**, server tick **p95 max
0.4411 ms**, **down 45,819–46,401 B/s**, **up 494–553 B/s**.

Reading the verified column honestly: at the minimum 33.3 ms link and no loss, every snapshot is verified. With
jitter, a snapshot can arrive one tick out of phase, and with loss an intent can still be in flight when the
snapshot for its tick arrives; those ticks are counted as `speculative` or `server-ahead`, never as `verified` and
never as a desync. At the requested 300 ms / 5 % / 30 ms cell only 927 of 1,412 snapshots are fully verified; the
rest are accounted for, and the correction stays bounded.

**Requested vs actual.** The 0 ms row is **33.3 ms** actual, 50 → 66.7, 150 → 166.7, 300 → 300; jitter 30 → 33.3.
The per-cell `emulated` block in `matrix.json` records this. Loss is client→server only.

**What "correction" means here.** It is the own-entity distance between the pre-reconcile prediction and the
authoritative snapshot at the same tick, averaged over every predicted snapshot, including `speculative` and
`server-ahead` ticks. That is deliberately conservative: the 450 mm maximum at 300 ms is nine ticks of in-flight
walking (9 × 50 mm), not a simulation divergence. A fully acked own-entity mismatch is a **desync**, and there
were zero. A post-replay visual snap would be smaller; this harness does not model the render interpolation.

**Reconnect proof (same run):** disconnect at tick 300, resume at 306, late resume at 412 after a second
disconnect at 380. Same entity, seq 106 before/after, snapshot hash valid, client hash at adoption equal to the
snapshot hash, within the 30-tick window; the late resume is refused. `exact_state: true`,
`late_resume_refused: true`.

**Wire budget is still failing.** The measured down rate is **46,400.75 B/s per client** at the 0 ms cell
(1,551 B × 30 Hz = 46,530 B/s theoretical, **3.79×** the 12,288 B/s budget). The matrix reports it as failing;
the test asserts that it fails. NET-101 owns AoI/delta and the budget was not averaged away.

## 4. Real-time 30-minute soak

Cell: RTT 150 ms, loss 2 %, jitter 30 ms; 4 clients, 64 entities, seed 4242; 30 Hz paced by wall clock.

**First attempt (2026-11-18T15:29:47Z → 15:59:48Z): failed at reporting, not at simulation.** The run reached
tick 52,214 with **0 desyncs**, **0 server desyncs** and **157,197 verified snapshots** over the full 1,800 s
wall clock. `reportFor()` then called `Math.max(0, ...corrections)` on ~160k correction samples and threw
`RangeError: Maximum call stack size exceeded`, so no `soak.json` was written and the test exited **1**. The
failure is preserved in `docs/state/evidence/20261118T153000Z-PR-N1-SOAK/02-acc-soak.log`; it is **not** counted
as a passing soak. A reducer-based `maxSample()` now builds the maxima, with a 300k-sample regression test in
`tools/sim/load/test/prn1-matrix.test.ts` (`01-matrix-after-fix.log` in
`docs/state/evidence/20261118T160104Z-PR-N1-SOAK-FIX/`). The fresh run started at 16:01:24Z and completed with **EXIT=0** at 16:31:25Z.

| metric | value |
|---|---|
| requested cell | 150 ms RTT / 2 % loss / 30 ms jitter (actual 166.67 ms / 2 % / 33.3 ms) |
| wall time | **1,800.03 s** (≥ 1,800 s) |
| ticks / effective rate | **54,001** / **30.000 Hz** |
| clients / entities | 4 / 64 |
| client / server desyncs | **0 / 0** |
| snapshot-integrity failures / ack-missing ticks / gate rejections / input refusals | **0 / 0 / 0 / 0** |
| verified / speculative / server-ahead / no-prediction snapshots | **162,586 / 37,814 / 15,584 / 2** |
| corrections p50 / p95 / max / over 2 m | **0 / 50 / 250 mm / 0** (215,984 samples) |
| server tick p50 / p95 / max | **0.0856 / 0.1632 / 4.2273 ms** |
| down / up B/s per client | **46,526.98 / 520.73** (3.786× the 12,288 B/s down budget) |
| RSS start / peak / end / heap end | **68.8 / 106.1 / 104.2 / 33.3 MB** |
| checks | duration, desyncs, corrections, verified, server tick — **all true** |
| exit | **0 (1/1)** |

The soak is a real wall-clock run, not a compressed simulation. `soak.json` is the machine-readable source and
`02-acc-soak.log` is the transcript with UTC start/end and `EXIT=`. The 250 mm correction maximum is five ticks of
in-flight input lead (5 × 50 mm) at the requested 150 ms cell, not a simulation divergence; the matrix's 450 mm
maximum is nine ticks at the requested 300 ms cell. No correction exceeded 2 m in either run.

## 5. What this unlocks, and what it does not

- `four-client-matrix`: measured on 24 requested cells with zero desyncs; actual RTT 33.3/66.7/166.7/300 ms,
  loss client→server only, in-process emulated transport.
- `desync-correction`: measured; p95 50 mm < 300 mm, max 450 mm ≤ 2,000 mm, zero over 2 m. The 450 mm is
  in-flight input lead at 300 ms, not a divergence; a fully acked mismatch is a desync.
- `server-tick-p95`: measured in-process under four clients and 64 entities; p95 max 0.4411 ms ≤ 25 ms. The
  production/deployment metric remains unmeasured.
- `soak-30min`: **met** — real 30-minute wall clock, EXIT=0, 0 client/server desyncs, 0 integrity failures,
  correction p95 50 mm / max 250 mm / 0 over 2 m, server tick p95 0.1632 ms; see §4. The first attempt's failure
  is retained and is not counted.
- `reconnect-restore`: the reconnect half is proven with exact state; crash restore and an RPO promise are still
  not measured, so the criterion stays `partial`.
- `wire-budget`: **still failing at 3.79×**; NET-101 owns the fix.
- `crash-restore-rpo` and `threat-and-anticheat`: unchanged and still `partial`.

Four of the ten §5.2 criteria remain unmet (`wire-budget`, `reconnect-restore`, `crash-restore-rpo`,
`threat-and-anticheat`). `node scripts/validate-netgate.mjs --assert-ready` must therefore still exit 1. No art is
produced (I2), and the Director's signature is a risk acceptance, not evidence of readiness.

## 6. Limits, stated rather than hidden

1. **In-process transport.** No kernel sockets, no `tc netem`, no browser. The link is a deterministic model of
   RTT/jitter/loss on a reliable ordered stream.
2. **Server tick is CPU time in this process.** It includes `Room.tick()` (simulation, hash, encode, send
   scheduling) but not OS scheduling, GC pauses under a real server, or network contention.
3. **Tick quantization.** A frame sent at tick T is first deliverable at T+1. The requested 0/50/150/300 ms map to
   33.3/66.7/166.7/300 ms actual; 30 ms jitter is 33.3 ms. No sub-tick precision is claimed.
4. **Loss is one-way.** Loss is applied to client→server input and acks; snapshots are delayed by RTT/jitter but
   not dropped. A symmetric-loss run is not part of this measurement.
5. **Prediction scope is the own entity.** Whole-world hash equality is not measured because it is not
   computable without an input broadcast. The GDD says so.
6. **No real desync was injected in the matrix.** The matrix proves zero false positives under latency/loss; the
   negative path (wrong hash, missing entity, own-entity divergence) is proven in `apps/game/test/net.test.ts`.
7. **One soak cell, not 24.** The matrix covers the 24 requested cells; the real-time soak covers the requested
   150 ms / 2 % / 30 ms cell (actual 166.7 ms / 2 % / 33.3 ms), which is the middle of the range.
8. **The soak is 30 minutes, not a multi-hour leak test.** RSS is reported; it is not a memory-leak proof.
9. **The matrix is accelerated logical time.** The 24 cells run faster than wall clock; the per-cell byte rates are
   per simulated second at 30 Hz, and the soak is the real-time check.

## 7. Reproduction

```sh
pnpm vitest run apps/game/test/net.test.ts --reporter=verbose
PRN1_MATRIX_TICKS=360 pnpm vitest run tools/sim/load/test/prn1-matrix.test.ts --reporter=verbose
PRN1_SOAK=1 PRN1_SOAK_MINUTES=30 pnpm vitest run tools/sim/load/test/prn1-soak.test.ts --reporter=verbose
node scripts/gdd-to-tests.mjs --check
```

Changing GDD-NETCODE §15 made the generated GDD-005 structural spec stale: `pnpm test` failed two assertions in
`tests/replay/gdd/GDD-NETCODE.spec.ts` until `node scripts/gdd-to-tests.mjs` regenerated 17 specs. The failing
and passing logs are both retained in `docs/state/evidence/20261118T163200Z-PR-N1-FINAL/` (`04-full-tests-before-gdd-drift-fix.log`
and `04-full-tests.log`). No assertion was weakened; the generated spec follows the new acceptance contract.
