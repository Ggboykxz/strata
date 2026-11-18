# NG-001 / 0003 — Late intents permanently break the v5 deterministic chain (measured)

| field | value |
|---|---|
| id | 0003-LATE-INTENT-CHAIN |
| date | 2026-11-18T20:45Z |
| author | orchestrator |
| status | **measured finding; fix requires a Director decision (options below)** |
| source | `docs/state/metrics/20261118-netgate-matrix.json` (`run_id` prefix `v5b-`), evidence `docs/state/evidence/20261118T202616Z-NETGATE-MATRIX/` |

## 1. The measurement

4 clients, real sockets, app-level emulated network, seed 20261118, world 1337, 15 s cells + 60 s control, commit `6b703f6`:

| cell | RTT | loss | jitter | desyncs (4 clients) | ok | correction p95 (mm) | rubber-band max (mm) |
|---|---|---|---|---|---|---|---|
| 01 | 0 ms | 0 % | 0 ms | **0** | 1 788 | 141 | 212 |
| 02 | 0 ms | 0 % | 30 ms | 1 596 | 204 | 141 | 250 |
| 03 | 0 ms | 2 % | 0 ms | 1 496 | 248 | 112 | 224 |
| 04 | 0 ms | 2 % | 30 ms | 1 517 | 233 | 141 | 250 |
| 05 | 0 ms | 5 % | 0 ms | 1 549 | 133 | 141 | 224 |
| 06 | 0 ms | 5 % | 30 ms | 1 518 | 156 | 141 | 250 |
| 07 | 50 ms | 0 % | 0 ms | 404 | 1 372 | 158 | 212 |
| 08 | 50 ms | 0 % | 30 ms | 1 651 | 134 | 141 | 250 |
| 09 | 50 ms | 2 % | 0 ms | 1 513 | 231 | 141 | 212 |
| 10 | 50 ms | 2 % | 30 ms | 1 613 | 133 | 141 | 250 |
| 11 | 50 ms | 5 % | 0 ms | 1 549 | 125 | 141 | 255 |
| 12 | 50 ms | 5 % | 30 ms | 1 542 | 140 | 150 | 255 |
| 13 | 150 ms | 0 % | 0 ms | **0** | 1 792 | 255 | 364 |
| 14 | 150 ms | 0 % | 30 ms | 1 250 | 526 | 206 | 381 |
| 15 | 150 ms | 2 % | 0 ms | 1 496 | 237 | 141 | 269 |
| 16 | 150 ms | 2 % | 30 ms | 1 480 | 245 | 156 | 361 |
| 17 | 150 ms | 5 % | 0 ms | 1 427 | 126 | 141 | 250 |
| 18 | 150 ms | 5 % | 30 ms | 1 524 | 136 | 141 | 320 |
| 19 | 300 ms | 0 % | 0 ms | **0** | 1 752 | 320 | 430 |
| 20 | 300 ms | 0 % | 30 ms | 1 321 | 439 | 224 | 430 |
| 21 | 300 ms | 2 % | 0 ms | 1 422 | 240 | 150 | 381 |
| 22 | 300 ms | 2 % | 30 ms | 1 523 | 205 | 158 | 430 |
| 23 | 300 ms | 5 % | 0 ms | 1 515 | 133 | 141 | 381 |
| 24 | 300 ms | 5 % | 30 ms | 1 525 | 140 | 150 | 412 |
| 27 | 50 ms | 0 % | 0 ms (60 s control) | 6 792 | 268 | 141 | 212 |

Control cells with **loss = 0 and jitter = 0 always pass** (0 desyncs) at every RTT: the v5 contract itself works when frames arrive in time. Every perturbed cell desynchronises **persistently**, at roughly expected rate 4 clients × ~350 remaining ticks.

Tick p95 measured ≤ 0.28 ms (fine). Down bytes/client/s ≈ 3 100–3 460 B/s (fine).

## 2. Diagnosis

`matrix-harness.ts` resends unacked intents (`resendsUnackedIntents: true`) with their **original** `(seq, targetTick)`. If any frame is delivered after `targetTick` (loss after resends, or jitter latency ≥ horizon, D = max(2, ⌈(RTT/2+jitter)/33.3⌉+2)), the server **drops it at ingress** (v5 policy: `targetTick <= host.tick` → drop + count `late_intents`). The client predicts that intent forever; reconcile at every subsequent snapshot verifies a hash that cannot match; one lost intent therefore poisons every reconcile thereafter. The drop policy was chosen for determinism; it has no recovery path for the client.

**This is the single most important protocol finding of the session. A 2 % packet-loss packet loss destroys the prediction contract.**

## 3. Options (Director decides)

| option | description | cost | determinism | latency cost |
|---|---|---|---|---|
| **A — late grace window** | Server applies intents whose `targetTick <= pair host.tick + GRACE` (e.g., 8 ticks) immediately upon arrival with the same canonical sort. Deterministic across replicas (sort by (targetTick, entity, seq) is pure). | protocol + tests | yes | zero (applies the intent at the first possible tick) |
| **B — explicit seq-abort** | Server emits per-entity "seq N superseded" via snapshot flags when dropping late; client stops predicting those seqs and replays without them. | bigger (new wire field) | yes | full RTT of stuck seqs |
| **C — wider horizon** | Increase default horizon D (e.g., RTT + 2 ticks + jitter bound). Mitigates but does not eliminate; 0 % loss is still required at the jitter edge. | zero (harness constant) | yes | +2 ticks input latency |
| **D — per-query keyframe resend** | Client requests a keyframe when its chain broken (wire resync semantic, delta frames v2-style). | new channel semantics | yes | recovery once per break |

Recommended: **A** for the smoke/learning scope, plus **D** for correctness symmetry with the v2 AoI solver. A+B are production-relevant (NET-101 line). C is a stopgap.

## 4. What this means for NET-GATE

four-client-matrix: **FAILED** (desyncs ≥ 1 250 per cell, including a 6 792 desync 60 s control). soak-30min: expected to fail identically. desync-correction: **not met**. No numbers here are to be presented as gate passes; the soak remains running to record the failing configuration honestly.

The v5 deterministic target-tick contract is sound construction but requires late-arrival recovery before the gate can ever be met at 2–5 % loss / 30 ms jitter.
