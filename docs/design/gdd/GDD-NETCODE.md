# GDD-NETCODE — DRAFT

| field | value |
|---|---|
| id | GDD-NETCODE |
| version | 0.3 |
| owner | netcode-engineer |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships and is re-signed at each gate.

## 1. Identity, version, owner, status

ID GDD-NETCODE, version 0.3, owner netcode-engineer, status **DRAFT**. Derived from P1-001 VISION and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

At 30 Hz, client and server state hashes are equal at every acked tick; a desync is detected within one RTT.

## 3. High Concept link

T2 requires two clients to observe the same fact_id, variant_id and epoch with equal state hash.

## 4. Deterministic rules

1. The server owns the tick; the client sends intents only. Intent seq is monotonic and validated before application.
2. At tick N, the server broadcasts a snapshot containing the quantized state and its FNV-1a hash. The client resets to that state, then replays only intents with seq greater than snapshot.appliedSeq.
3. A client hash that differs from the snapshot hash at the acked tick produces a desync event and is rejected, never silently reconciled.
4. The simulation is integer-only: a coordinate is a millimetre integer, so the wire bound is a range check, never a lossy conversion. Intents are applied in canonical (entity, seq) order, so arrival order cannot change the state; a non-increasing seq is dropped.

## 5. Numbers with source

- 30 Hz tick | SOURCE: packages/core/src/index.ts TICK_HZ
- p50 server tick <= 8 ms, p95 <= 25 ms | TUNABLE 4..25 ms | plan: soak test NET-006, record p95 from 30 min run
- wire <= 12 KB/s down, <= 3 KB/s up at 64 AoI entities | SOURCE: master §6 budgets
- desync detection <= 1 RTT; recovery <= 3 ticks | TUNABLE 1..5 ticks | plan: loss/jitter matrix PR-N2
- coordinate quantization: 1 mm integer, int32 wire bound +/-2 147 483.647 m | SOURCE: packages/core/src/tick.ts QUANT_MM / WIRE_MAX_MM (a format bound, not a gameplay budget)
- server hash history: 128 ticks = 4.27 s at 30 Hz | TUNABLE 64..256 ticks | plan: NET-004 reconciliation window, with the 'unknown ack' rate as the measurement

## 6. State machine

client: CONNECTING → PREDICTING → RECONCILED → DESYNCED → RESYNCING → RECONCILED. Server: TICK_IDLE → TICK_WITH_INPUT → SNAPSHOT_SENT.

## 7. Data contract

protocol v1: IntentMessage{seq,dx,dz}, SnapshotMessage{state,hash,appliedSeq}, HashAckMessage{client,tick,hash}. NET-001: `appliedSeq` is per entity (`EntityState.seq`); a snapshot carries the seq of the entity it describes. JSON codec now; binary codec and version handshake in NET-002. Migration: version mismatch closes the socket and opens a version error event.

## 8. Edge cases

1. Intent seq replayed from a previous connection is ignored (seq <= appliedSeq).
2. Snapshot arrives after two local predictions: both unacked intents replay in order.
3. Hash ack arrives for a tick whose snapshot was not recorded: ignored, not counted as ok.
4. 80 ms packet loss for 2 s: no state divergence; client resumes at next snapshot.
5. Client and server on different integer widths: protocol rejects the version, no silent truncation.

## 9. Failure states

1. Network failure: socket closes; client returns to CONNECTING and stops predicting.
2. Desync: verdict flips to desync; last 60 ticks and full snapshot are captured for triage.
3. Malformed wire data: decode throws, message dropped, rate-limit counter increments.

## 10. Interaction matrix

NETCODE × Aoi: only entities inside 64-AoI set are serialized. NETCODE × ANIM-ARCHITECTURE: animation STATE is a snapshot field; no bone transforms.

## 11. Feedback per state change

Each state change emits one telemetry event with tick, RTT and hash; the HUD overlay shows a reconnect counter, not a raw hash.

## 12. Accessibility

Desync and reconnect indicators are text plus icon, meet contrast ratios, and are announced once through the live region.

## 13. Localization

Status strings are keys; no concatenated sentence. Tick and RTT use locale-independent numeric formatting.

## 14. Telemetry and success metric

tick_hash_mismatch (count), rtt_ms (p50/p95), snapshot_bytes (p95), reconnect_count. Success metric: 0 mismatches over a 30 min soak at 64 AoI entities.

## 15. Acceptance tests

- GIVEN two replicas and 5 ticks WHEN pnpm tracer --assert runs THEN both hashes equal the server hash.
- GIVEN a forced desync WHEN the replica acks a wrong hash THEN the server verdict is desync and the command exits 1.
- GIVEN Math.random injected into packages/core WHEN pnpm lint runs THEN it exits 1.

## 16. Perf budget impact

Client frame <= 16.7 ms at 60 fps; server tick p95 <= 25 ms; wire <= 12 KB/s down at 64 entities; no extra allocation per tick (measured in NET-006).

## 17. Explicit out of scope

No physics engine, no Babylon on the server tick, no client-authoritative gameplay, no hero art.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| W | h | i |
| B | i | n |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields, sources and ranges | GDD-002 |
| 0.3 | 2026-11-18 | NET-001: integer-only tick rules, quantization bound, hash ring | netcode-engineer |
