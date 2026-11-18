# A0013 — Late-arrival intents and the prediction chain: recovery design (DRAFT, for the Director)

| field | value |
|---|---|
| status | **PROPOSED — 2026-11-18**, not accepted; no code is changed against this ADR |
| author | orchestrator, after the measured finding NG-001-0003 |
| decision owner | Director |
| date | 2026-11-18 |

## Context (measured, not asserted)

Protocol v5 (a1e5961) drops at ingress every intent whose `targetTick` has already passed
(`late_intents` counter, `Room.handleBytes`). The rule is deterministic and the drop is counted —
but the client predicts that intent at its `targetTick` forever. `Predictor.reconcile()` therefore
disagrees on every subsequent snapshot; the intent's inapplicability is never signalled to the client,
and no reconcile ever heals the prediction.

Measured (NETGATE-0003, 25-cell v5 rerun on `session/20261118-netgate-matrix`, seed 20261118):

| cell | RTT | loss | jitter | desyncs | verdict |
|---|---|---|---|---|---|
| rtt0 loss0 jitter0 | 0 | 0 % | 0 ms | 0 | met (mechanics work) |
| rtt150 loss0 jitter0 | 150 | 0 % | 0 ms | 0 | met |
| rtt300 loss0 jitter0 | 300 | 0 % | 0 ms | 0 | met |
| every perturbed cell | 0…300 | 2–5 % | 0/30 ms | 1 250–1 651 | **permanent desync** |
| 60 s control (50 ms, 0 %, 0) | 50 | 0 % | 0 ms | 6 792 | failing |

Total measured desync events: **37 223**; ok reconciles 11 136; tick p95 ≤ 0.28 ms. One lost intent
breaks the chain forever; a 2 % packet-loss loss defeats the entire contract.

## Options

### A — Late grace window (server applies late intents)

Server: instead of ingress-drop, apply a late intent immediately (same (targetTick, entity, seq) sort),
bounded by a grace window (e.g., 8 ticks), drop only past the window.

- Determinism: preserved. The apply tick depends only on arrival tick + policy, which is identical for a
  given message order on the authoritative server.
- **Insufficient alone**: the client reconciles against its own prediction, which applied the intent at
  `targetTick` (earlier than the server's apply tick). Mismatch persists for that intent's whole lifetime;
  the client cannot know *when* the server applied it without being told.
- Verdict: necessary building block of D, not sufficient.

### B — Snapshot-sequence abort flags

Snapshot gains a per-entity "seq N aborted" notification when the server drops an intent. Client stops
predicting aborted seqs; reconcile resets cleanly.

- Recovery is coarse-grained: everything of the client since that target tick is discarded.
- Verdict: works, but expensive and crude; intended as complement for unrecoverable seqs, not primary path.

### C — Widen the horizon (D up)

Ship `D = ceil(RTT + margin / tick)` on the client.

- Reduces late arrivals at fixed RTT but cannot fix loss; desyncs reappear at any loss>0.
- Verdict: palliative, never sufficient for the gate.

### D — Intent-ack with `appliedAtTick` (recommended)

New wire message (or piggyback on the existing hashack):

```
intent-ack { seq u32, appliedAtTick u32 }  // sent by the server when an intent is applied
```

Client semantics (`Predictor`): on `intent-ack`, clear only that seq from pending and **re-anchor the
pending intent's tick** to `appliedAtTick`; replay applies it there. Reconciliation stays exact with
zero-desyncs regardless of loss, reorder or jitter — the server simply tells the client where it applied.

- Recovery: perfect in every measured scenario, including full reorder and multi-loss bursts.
- Determinism: the server is the single apply authority; `appliedAtTick` is whatever tick it chose — the
  client follows it exactly; all replicas agree because they all see the same `appliedAtTick`.
- Cost: ~9 B per seq ack; at 30 Hz and 1 intent/tick ≈ 270 B/s up — trivial; no snapshot size impact.
- Protocol change: new message kind (hashack extension or `intentack` 0x06), bump to v6 (or additive kind in v5
  if additive-kinds are acceptable).
- Implementation sketch: server emits `intentack` inside the same flush that applies intents (guaranteed
  emitted with the tick that applied it); client reducer: pending[seq].tick := appliedAtTick; reconcile()
  unchanged otherwise; flood/gate: new kind must pass `MessageGate` (SEC agent owns); tests incl. one whole-run
  v5→v6 upgrade test (v5 peers refused).
- Rollback: if D is rejected, v5 remains supported as-is; no architecture couples to D today.

### E — Reset-to-snapshot prediction only (client never replays unacked intents)

Drop client-side replay entirely; client renders server state with interpolation only. Zero desync by
construction.

- Suffices NET-GATE's "zero desync" letter, but the design goal (predict-then-apply) belongs to GDD-NETCODE
  and I2; it abandons the documented prediction contract rather than repairing it.
- Verdict: last resort; acceptable as a Director risk-acceptance trade, not as the default.

## Recommendation

**D** — intent-ack with `appliedAtTick`, with **B** kept as the discard path for seqs the server abandons
after GRACE, and **A** as the internal rule the server uses to place late intents (at the next tick, never
before `targetTick`). C is a configuration stopgap, not a fix.

With D the 24-cell matrix and the 30-minute soak should recover zero desyncs at 5 % loss / 30 ms jitter
(mechanical expectation, to be measured after implementation — never asserted).

## Decision requested

1. Authorize a v6 `intentack {seq u32, appliedAtTick u32}` kind (and/or `hashack` extended with
   `appliedAtTick`)?
2. If yes: work order = `Session of a branch` with the same tests; Director re-reviews; gate re-measured
   from scratch; art remains blocked until the gate is honestly measured READY or risk-accepted again.
3. If no: NET-GATE stays NOT READY (failing) permanently; the A0006 record stands; PN elevation not claimed.
