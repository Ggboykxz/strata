# GDD-NETCODE — DRAFT

| field | value |
|---|---|
| id | GDD-NETCODE |
| version | 0.8 |
| owner | netcode-engineer |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships and is re-signed at each gate.

## 1. Identity, version, owner, status

ID GDD-NETCODE, version 0.8, owner netcode-engineer, status **DRAFT**. Derived from P1-001 VISION and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

At 30 Hz, client and server state hashes are equal at every acked tick; a desync is detected within one RTT.

## 3. High Concept link

T2 requires two clients to observe the same fact_id, variant_id and epoch with equal state hash.

## 4. Deterministic rules

1. The server owns the tick; the client sends intents only. Intent seq is monotonic and validated before application. Each intent names the tick at which the client wants it applied (`targetTick`, v5). The server applies an intent at its `targetTick`, never earlier; an intent whose `targetTick` is in the past at the moment it arrives from a socket is dropped and counted (`late_intents`), never applied late, and an intent scheduled more than 64 ticks ahead is refused at ingress. Intents whose `targetTick` is exactly the next tick behave as before.
2. At tick N, the server broadcasts a snapshot containing the quantized state and its FNV-1a hash. The client resets to that state, then replays only intents with seq greater than snapshot.appliedSeq.
3. A client hash that differs from the snapshot hash at the acked tick produces a desync event and is rejected, never silently reconciled. On a mismatch the client adopts the snapshot exactly, clears pending intents and requests resync; it does not replay. Replay happens only after a matching hash, for intents the server has not applied.
Lag compensation (`#lag-comp`): the server keeps a bounded tick→world ring. A shot names the shooter's tick; the server rewinds to that state and validates cooldown, squared range and an integer-cell LOS before any hit. A tick outside the ring is refused (`stale-shot`), never approximated with the newest state. The client's `claimed` flag is ignored (I1); only the server's `HitLedger` fires an event (NET-006). No `Math.sqrt`, trigonometry or float enters the check (D147).

4. The simulation is integer-only: a coordinate is a millimetre integer, so the wire bound is a range check, never a lossy conversion. Intents are applied in canonical (entity, seq) order, so arrival order cannot change the state; a non-increasing seq is dropped.

## 5. Numbers with source

- 30 Hz tick | SOURCE: packages/core/src/index.ts TICK_HZ
- p50 server tick <= 8 ms, p95 <= 25 ms | TUNABLE 4..25 ms | plan: soak test NET-006, record p95 from 30 min run
- wire <= 12 KB/s down, <= 3 KB/s up at 64 AoI entities | SOURCE: master §6 budgets
- desync detection <= 1 RTT; recovery <= 3 ticks | TUNABLE 1..5 ticks | plan: loss/jitter matrix PR-N2
- coordinate quantization: 1 mm integer, int32 wire bound +/-2 147 483.647 m | SOURCE: packages/core/src/tick.ts QUANT_MM / WIRE_MAX_MM (a format bound, not a gameplay budget)
- server hash history: 128 ticks = 4.27 s at 30 Hz | TUNABLE 64..256 ticks | plan: NET-004 reconciliation window, with the 'unknown ack' rate as the measurement
- client hash timeline: 128 ticks = 4.27 s at 30 Hz | SOURCE: packages/core/src/hash.ts HashTimeline default capacity — the client mirror of the server ring
- interpolation alpha: integer numerator in 0..denominator, default denominator 30 | SOURCE: apps/game/src/net/{interpolate,snapshot-buffer}.ts | plan: NET-006 measures whether 30 is enough at 60 fps
- wire version = 5 (v4 peers refused at handshake) | SOURCE: packages/protocol/src/binary.ts PROTOCOL_VERSION / SUPPORTED_*_VERSION
- jitter buffer = 3..8 ticks = 100..250 ms at 30 Hz | SOURCE: D149 range; apps/game/src/net/jitter.ts bounds — a tunable, not a measured RTT
- rewind window = 30 ticks = 1 s at 30 Hz | SOURCE: tools/sim/net/prn4_lagcomp.ts REWIND_TICKS; ring capacity 31 frames | plan: PR-N2 loss matrix
- range ceiling = 12 000 mm, squared-distance comparison in bigint | TUNABLE until PR-S1 measures the weapon
- shot cooldown = 15 ticks = 500 ms at 30 Hz | TUNABLE until PR-S1
- LOS cell = 1 000 mm, integer Bresenham traversal | SOURCE: tools/sim/net/prn4_lagcomp.ts LOS_CELL_MM
- v5 frame bytes: intent 15 (targetTick u32, v5), hash ack 13, hello 4, welcome 3, reject 4, anim 17, resync 10, snapshot header 19 + 24 per entity, max 1 555 at 64 entities | SOURCE: packages/protocol/src/binary.ts byte constants; `packages/protocol/test/binary.test.ts` asserts 1 555 (A0010)
- full-snapshot ceiling: 1 555 B x 30 Hz = 46 650 B/s at 64 entities | MEASURED arithmetic, **over** the 12 KB/s budget by 3.80x | plan: NET-101 owns AoI + delta (A0011); the codec does not claim to meet the budget

## 6. State machine

client: CONNECTING → PREDICTING → RECONCILED → DESYNCED → RESYNCING → RECONCILED. Server: TICK_IDLE → TICK_WITH_INPUT → SNAPSHOT_SENT.
The client machine is implemented by `Predictor`: `schedule(seq, dx, dz, targetTick)` stores the intent and `advanceTo(tick)` applies it exactly when the predicted world reaches its `targetTick` (one empty `stepWorld` per tick with no due intent), recording the predicted hash at every tick; `input()` (immediate) is `schedule(..., world.tick + 1)` plus the matching `advanceTo`. `reconcile(snapshot)` compares at `snapshot.tick`, adopts the server state
and replays only intents with `seq > entity.appliedSeq`, at their original `targetTick` (never at "tick - 1"); an intent whose `targetTick` passed while unacknowledged is still replayed, clamped to the earliest available tick. A pending intent carries `{entity, seq, dx, dz, targetTick}`. A mismatch counts as `desync`, clears the pending set and
sets a resync request. `SnapshotBuffer` is presentation-only and is cleared on desync so no stale pose is drawn.

## 7. Data contract

protocol v5 (binary, NET-002, target-tick in v5): FrameType byte then a fixed little-endian layout — Intent{entity,seq,targetTick,dx,dz}, Snapshot{tick,appliedSeq,hash,viewHash,count,entities[]}, HashAck{client,tick,hash}, Hello{version,capabilities}, Welcome{version}, Reject{version,reason}. Lengths are exact: a trailing byte is a rejected frame, never padding. `hash` is the 32-bit FNV-1a value carried as u32, rendered as 8 lowercase hex chars.
`appliedSeq` in the snapshot header is the **highest** per-entity seq in that snapshot, used as a cheap replay boundary; the authoritative value for "what this client may replay" is each entity's own `seq`. A client replays intents for entity `e` with `seq > snapshot.entities[e].seq`.
Lag-comp validation contract: `Shot{shooter, target, tick, claimed}` and `WorldHistory` (tick→WorldState ring). Verdicts: `hit | out-of-range | blocked | cooldown | stale-shot | unknown-entity`, in that validation order after rewind. `claimed` is carried only to prove it is ignored. Range is `dx² + dz²` in bigint mm²; LOS is an integer Bresenham walk over fixed cells with endpoints exempt. No bone or pose data.

Target-tick contract (protocol **v5**, this module's current layout): `targetTick` (u32) sits between `seq` and `dx` in the intent frame; `INTENT_BYTES` is **15** (was 11 in v4). A v4 peer is refused at the handshake, never coerced (the supported range is exactly 5..5). Server ingress rules: an intent whose `targetTick` is in the past at the moment it arrives from a socket is **dropped and counted** (`late_intents`), never applied late; an intent scheduled more than 64 ticks ahead is **refused at ingress**; an intent whose `targetTick` is exactly the next tick keeps the previous behaviour. Remaining intents are kept in a deterministic buffer keyed by `targetTick`; before the host advances to tick T, every buffered intent with `targetTick <= T` is submitted, sorted by `(targetTick, entityId, seq)`. `stepWorld` remains the only world mutation. Client side: `schedule(seq, dx, dz, targetTick)` + `advanceTo(tick)`; `input()` is schedule-at-next-tick. `reconcile()` replays unacked scheduled intents at their original `targetTick`; intents whose `targetTick` passed while unacknowledged are still replayed, clamped to the earliest available tick. Hash comparison stays at the named snapshot tick, never at "now".

NET-006 wire additions: kind `anim` (0x04, 17 B) carries the anim_state by entity; kind `resync` (0x05, 10 B) carries `{client, tick, reason}` where reason is one of `hash-mismatch | missing-entity | timeout`. A resync is a **request**; the server still chooses the snapshot (I1). Protocol v5 refuses v2/v4 hellos instead of silently interoperating.

A0010 wire addition: protocol **v4** adds `viewHash` (u32) to the snapshot header, the hash of the recipient's own entity at that tick. `hash` remains the server audit hash of the whole world and is never compared to a client prediction. The snapshot header is **19 bytes**, so a 64-entity snapshot is **1 555 bytes = 46 650 B/s** at 30 Hz — still over the 12 KB/s budget and still NET-101's fix. v4 refuses v3 hellos.

NET-004 client contract: `SnapshotView{tick, hash, viewHash?, appliedSeq, entities[]}` is the subset of SnapshotFrame the predictor consumes; `appliedSeq` is authoritative per entity (`EntityState.seq`), never inferred from the header. A pending intent carries `{entity, seq, dx, dz, targetTick}` so replay can step empty ticks forward to the intent's original `targetTick`. Hashes are compared at the tick named by the snapshot, not at 'now'.

protocol v1 (JSON, TRACER-001) remains exported until the game client moves to v2. Migration: a version outside the supported range is answered with `reject{reason:'version'}` and the socket closes; it is never coerced.

## 8. Edge cases

1. Intent seq replayed from a previous connection is ignored (seq <= appliedSeq).
2. Snapshot arrives after two local predictions: both unacked intents replay in order.
3. Hash ack arrives for a tick whose snapshot was not recorded: ignored, not counted as ok.
4. 80 ms packet loss for 2 s: no state divergence; client resumes at next snapshot.
5. Client and server on different integer widths: protocol rejects the version, no silent truncation.
6. Frame with one extra byte: rejected as `trailing-bytes`; a frame is exact, never a prefix.
7. Frame carrying more than 64 entities: rejected at both encode and decode; the AoI cap is 64 (D90).
8. Snapshot names a tick with no recorded prediction: verdict `unknown`, never `ok` and never a desync.
9. Own entity absent from the snapshot: desync, authoritative entity list adopted as-is, resync requested.
10. Duplicate or older snapshot arrives: the presentation buffer ignores it; it never rewinds rendering.

## 9. Failure states

1. Network failure: socket closes; client returns to CONNECTING and stops predicting.
2. Desync: verdict flips to desync; last 60 ticks and full snapshot are captured for triage.
3. Malformed wire data: decode throws, message dropped, rate-limit counter increments.
4. Intent whose targetTick is in the past at arrival: dropped, counted (`late_intents`), never applied late.
5. Intent whose targetTick is more than 64 ticks ahead: refused at ingress; an intent at exactly 64 ticks ahead is admitted.

## 10. Interaction matrix

NETCODE × Aoi: only entities inside 64-AoI set are serialized. NETCODE × ANIM-ARCHITECTURE: animation STATE is a snapshot field; no bone transforms.
- NETCODE × AoI (NET-101 / A0011-i): the reusable uniform-grid AoI lives in `apps/server/src/aoi/` (32 000 mm cells, bigint squared distance, `(distance, id)` cap at 64); `Room`'s opt-in `wire: 'delta'` path serialises that per-client view as a chained `DeltaFrame` (keyframe first/every 60 ticks/on forced resync, `removed` ids on exit, AoI view hash in the frame), while `wire: 'full'` keeps the v5 whole-world snapshot as the default.

## 11. Feedback per state change

Each state change emits one telemetry event with tick, RTT and hash; the HUD overlay shows a reconnect counter, not a raw hash.

## 12. Accessibility

Desync and reconnect indicators are text plus icon, meet contrast ratios, and are announced once through the live region.

## 13. Localization

Status strings are keys; no concatenated sentence. Tick and RTT use locale-independent numeric formatting.

## 14. Telemetry and success metric

tick_hash_mismatch (count), rtt_ms (p50/p95), snapshot_bytes (p95), reconnect_count, late_intents (count). Success metric: 0 mismatches over a 30 min soak at 64 AoI entities.

## 15. Acceptance tests

- GIVEN two replicas and 5 ticks WHEN pnpm tracer --assert runs THEN both hashes equal the server hash.
- GIVEN a forced desync WHEN the replica acks a wrong hash THEN the server verdict is desync and the command exits 1.
- GIVEN Math.random injected into packages/core WHEN pnpm lint runs THEN it exits 1.
- GIVEN a v1 and a v3 hello WHEN `negotiate` runs THEN both return `reject{reason:'version'}` and neither is coerced.
- GIVEN every v2 message class WHEN it is encoded and decoded THEN the value is identical (round-trip).
- GIVEN a 64-entity snapshot WHEN encoded THEN it is exactly 1 555 bytes (v4, A0010) and over the 12 KB/s budget, recorded as NET-101's problem.
- GIVEN a local intent and a matching server snapshot WHEN reconciled THEN the verdict is `ok` and only intents with seq above the entity's appliedSeq are replayed.
- GIVEN a wrong snapshot hash, or a missing own entity WHEN reconciled THEN the verdict is `desync`, pending intents are cleared, resync is requested and the authoritative state is adopted exactly.
- GIVEN two snapshots WHEN sampled at render ticks THEN interpolation yields integer millimetres and the buffer never rewinds.
- GIVEN a shot at a tick inside the ring WHEN validated THEN range, LOS and cooldown are checked on that rewound world; a tick outside the ring is `stale-shot`.
- GIVEN a client `claimed` flag WHEN validation runs THEN the verdict is identical with `claimed` true or false.
- GIVEN a v2 hello WHEN negotiated THEN the peer is refused; a v3 anim frame and a resync request round-trip at exact byte lengths.
- GIVEN inter-snapshot gaps WHEN observed THEN the presentation jitter buffer stays inside 3..8 ticks and resets to the floor on resync.
- GIVEN an intent scheduled at targetTick T WHEN the world advances to T THEN it is applied exactly at T and two replicas produce the same hash.
- GIVEN an intent whose targetTick is in the past at the moment it arrives from a socket WHEN the room handles it THEN it is dropped, never applied, and counted (late_intents).
- GIVEN an intent scheduled more than 64 ticks ahead WHEN it arrives from a socket THEN it is refused at ingress; an intent at exactly 64 ticks ahead is admitted.
- GIVEN a 15-byte v5 intent WHEN it is encoded and decoded THEN the value is identical (round-trip).
- GIVEN a client with unacked scheduled intents WHEN a snapshot reconcile completes THEN the intents replay at their original targetTick, never double-applied, and an intent whose targetTick passed while unacknowledged is still replayed at the earliest available tick.

## 16. Perf budget impact

Client frame <= 16.7 ms at 60 fps; server tick p95 <= 25 ms; wire <= 12 KB/s down at 64 entities; no extra allocation per tick (measured in NET-006).

## 17. Explicit out of scope

No physics engine, no Babylon on the server tick, no client-authoritative gameplay, no hero art.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| Is the implemented 3..8 tick jitter range enough at 60 fps under real loss? | qa-engineer | PR-N1 |
| Are 30-tick rewind and 15-tick cooldown the right values under 2 s of packet loss? | qa-engineer + gameplay-engineer | PR-N2 / PR-S1 |
| Does a desync request a full snapshot immediately or wait for the next scheduled one? | netcode-engineer | NET-006 |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields, sources and ranges | GDD-002 |
| 0.3 | 2026-11-18 | NET-001: integer-only tick rules, quantization bound, hash ring | netcode-engineer |
| 0.4 | 2026-11-18 | NET-002: binary v2 frames, exact lengths, version handshake, frame budget measured | netcode-engineer |
| 0.5 | 2026-11-18 | NET-004: client hash timeline, prediction/replay, desync rejection, integer interpolation | netcode-engineer |
| 0.6 | 2026-11-18 | NET-006: wire v3 anim/resync frames, jitter bounds, server-owned anim validation | netcode-engineer |
| 0.7 | 2026-11-18 | PR-N4: lag-comp rewind, integer LOS/range/cooldown, verdict contract | netcode-engineer |
| 0.8 | 2026-11-18 | target-tick input contract: protocol v5, 15-byte intent (targetTick u32), late-intent drop (`late_intents`), 64-tick lead refusal, server buffer keyed by targetTick, client `schedule`/`advanceTo`, reconcile replays at the original targetTick | netcode-engineer |
