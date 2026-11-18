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

At 30 Hz, the client's own entity and the authoritative snapshot are equal at every fully acked tick; the
snapshot hash is verified against its entities, and a desync is detected within one RTT. Whole-world prediction
is not claimed: other clients' intents are never broadcast, so their entities are snapshot-owned.

## 3. High Concept link

T2 requires two clients to observe the same fact_id, variant_id and epoch with equal state hash.

## 4. Deterministic rules

1. The server owns the tick; the client sends intents only. Intent seq is monotonic and validated before application.
2. At tick N, the server broadcasts a snapshot containing the quantized state and its FNV-1a hash. The client first verifies the hash against the entity list (integrity), then adopts the state exactly and replays only **its own** intents with seq greater than its own entity's `seq`. The header `appliedSeq` is a cheap global boundary, never the replay boundary.
3. Prediction is scoped to the client's own entity because only its own intents are known locally. Other clients' entities are owned by the snapshot; their movement is never a client-side desync. A desync is (a) a snapshot hash that does not describe its entity list, or (b) the own entity differing from the prediction at a tick whose own seq is fully acked. Input still in flight makes that tick speculative (`unknown`), never a desync. On a desync the client adopts the snapshot exactly, clears pending intents and requests resync; it does not replay. Replay happens only after a non-desync verdict, for its own intents the server has not applied.
Lag compensation (`#lag-comp`): the server keeps a bounded tick→world ring. A shot names the shooter's tick; the server rewinds to that state and validates cooldown, squared range and an integer-cell LOS before any hit. A tick outside the ring is refused (`stale-shot`), never approximated with the newest state. The client's `claimed` flag is ignored (I1); only the server's `HitLedger` fires an event (NET-006). No `Math.sqrt`, trigonometry or float enters the check (D147).

4. The simulation is integer-only: a coordinate is a millimetre integer, so the wire bound is a range check, never a lossy conversion. Intents are applied in canonical (entity, seq) order, so arrival order cannot change the state; a non-increasing seq is dropped.

## 5. Numbers with source

- 30 Hz tick | SOURCE: packages/core/src/index.ts TICK_HZ
- p50 server tick <= 8 ms, p95 <= 25 ms | TUNABLE 4..25 ms | PR-N1 measured p95 max 0.4411 ms across the 24-cell matrix (in-process); a deployment number under kernel/network contention is still owed, and the 30-minute soak is recorded in the PR-N1 report
- wire <= 12 KB/s down, <= 3 KB/s up at 64 AoI entities | SOURCE: master §6 budgets
- desync detection <= 1 RTT; recovery <= 3 ticks | TUNABLE 1..5 ticks | PR-N1 measured 0 desyncs on the requested RTT 0/50/150/300 ms matrix and correction max 450 mm; the matrix transport is in-process, so a kernel-level loss measurement is still owed
- client prediction scope = own entity only | SOURCE: apps/game/src/net/predictor.ts; other entities are snapshot-owned because IntentFrame carries no tick and intents are not broadcast
- coordinate quantization: 1 mm integer, int32 wire bound +/-2 147 483.647 m | SOURCE: packages/core/src/tick.ts QUANT_MM / WIRE_MAX_MM (a format bound, not a gameplay budget)
- server hash history: 128 ticks = 4.27 s at 30 Hz | TUNABLE 64..256 ticks | plan: NET-004 reconciliation window, with the 'unknown ack' rate as the measurement
- client hash timeline: 128 ticks = 4.27 s at 30 Hz | SOURCE: packages/core/src/hash.ts HashTimeline default capacity — the client mirror of the server ring
- interpolation alpha: integer numerator in 0..denominator, default denominator 30 | SOURCE: apps/game/src/net/{interpolate,snapshot-buffer}.ts | plan: NET-006 measures whether 30 is enough at 60 fps
- wire version = 3 (v2 peers refused at handshake) | SOURCE: packages/protocol/src/binary.ts PROTOCOL_VERSION / SUPPORTED_*_VERSION
- jitter buffer = 3..8 ticks = 100..250 ms at 30 Hz | SOURCE: D149 range; apps/game/src/net/jitter.ts bounds — a tunable, not a measured RTT
- rewind window = 30 ticks = 1 s at 30 Hz | SOURCE: tools/sim/net/prn4_lagcomp.ts REWIND_TICKS; ring capacity 31 frames | plan: a kernel-level loss run; PR-N2 was the room/resume task, not a loss matrix
- range ceiling = 12 000 mm, squared-distance comparison in bigint | TUNABLE until PR-S1 measures the weapon
- shot cooldown = 15 ticks = 500 ms at 30 Hz | TUNABLE until PR-S1
- LOS cell = 1 000 mm, integer Bresenham traversal | SOURCE: tools/sim/net/prn4_lagcomp.ts LOS_CELL_MM
- v2 frame bytes: intent 11, hash ack 13, hello 4, welcome 3, reject 4, snapshot header 15 + 24 per entity, max 1 551 at 64 entities | SOURCE: packages/protocol/src/binary.ts byte constants; `packages/protocol/test/binary.test.ts` asserts 1 551
- full-snapshot ceiling: 1 551 B x 30 Hz = 46 530 B/s at 64 entities | MEASURED arithmetic, **over** the 12 KB/s budget by 3.9x | plan: NET-101 owns AoI + delta; the codec does not claim to meet the budget
- 4-client matrix (PR-N1): 24 cells, 4 clients, 64 entities, 360 ticks/cell, 28 694 verified snapshots, 0 desyncs, 0 snapshot-integrity failures, correction p95 50 mm / max 450 mm / 0 over 2 m, server tick p95 max 0.4411 ms, down 45 819..46 401 B/s, up 494..553 B/s | MEASURED in-process, emulated transport; requested RTT 0/50/150/300 ms quantizes to 33.3/66.7/166.7/300 ms at 30 Hz, jitter 30 ms is 33.3 ms, and loss is applied client→server only | SOURCE: docs/state/evidence/20261118T152841Z-PR-N1-MATRIX/matrix.json
- 30-minute soak (PR-N1): real 1,800.03 s wall clock, 54,001 ticks at 30 Hz, 4 clients, 64 entities, 162 586 verified snapshots, 0 desyncs, 0 integrity failures, correction p95 50 mm / max 250 mm / 0 over 2 m, server tick p95 0.1632 ms; first attempt's report bug retained, not counted | SOURCE: docs/state/evidence/20261118T160115Z-PR-N1-SOAK/soak.json; numbers in docs/qa/prototypes/PRN1_MATRIX.md §4

## 6. State machine

client: CONNECTING → PREDICTING → RECONCILED → DESYNCED → RESYNCING → RECONCILED. Server: TICK_IDLE → TICK_WITH_INPUT → SNAPSHOT_SENT.
The client machine is implemented by `Predictor`: `input()` applies an intent with the same core `stepWorld` and
stores the predicted hash and own-entity state at that tick; `advance()` records empty ticks so an idle client
still has a timeline. `reconcile(snapshot)` verifies the snapshot hash against its entity list, compares the own
entity at `snapshot.tick`, adopts the server state and replays only its own intents with `seq > own.seq`. A
mismatch in that predictable scope counts as `desync`, clears the pending set and sets a resync request. An
in-flight intent makes the tick `unknown`, not `desync`. `SnapshotBuffer` is presentation-only and is cleared on
desync so no stale pose is drawn.

## 7. Data contract

protocol v2 (binary, NET-002): FrameType byte then a fixed little-endian layout — Intent{entity,seq,dx,dz}, Snapshot{tick,appliedSeq,hash,count,entities[]}, HashAck{client,tick,hash}, Hello{version,capabilities}, Welcome{version}, Reject{version,reason}. Lengths are exact: a trailing byte is a rejected frame, never padding. `hash` is the 32-bit FNV-1a value carried as u32, rendered as 8 lowercase hex chars.
`appliedSeq` in the snapshot header is the **highest** per-entity seq in that snapshot, used as a cheap replay boundary; the authoritative value for "what this client may replay" is each entity's own `seq`. A client replays intents for entity `e` with `seq > snapshot.entities[e].seq`.
Lag-comp validation contract: `Shot{shooter, target, tick, claimed}` and `WorldHistory` (tick→WorldState ring). Verdicts: `hit | out-of-range | blocked | cooldown | stale-shot | unknown-entity`, in that validation order after rewind. `claimed` is carried only to prove it is ignored. Range is `dx² + dz²` in bigint mm²; LOS is an integer Bresenham walk over fixed cells with endpoints exempt. No bone or pose data.

NET-006 wire additions: kind `anim` (0x04, 17 B) carries the anim_state by entity; kind `resync` (0x05, 10 B) carries `{client, tick, reason}` where reason is one of `hash-mismatch | missing-entity | timeout`. A resync is a **request**; the server still chooses the snapshot (I1). Protocol v3 refuses v2/v4 hellos instead of silently interoperating.

NET-004 client contract: `SnapshotView{tick, hash, appliedSeq, entities[]}` is the subset of SnapshotFrame the predictor consumes; `appliedSeq` is authoritative per entity (`EntityState.seq`), never inferred from the header. A pending intent carries `{entity, seq, dx, dz, tick}` so replay can step empty ticks back to the intent's original tick. Hashes are compared at the tick named by the snapshot, not at 'now'. The predictor recomputes `hashWorld(entities)` and rejects a snapshot that does not match its own `hash`; a predicted whole-world hash is never compared because other entities' intents are unavailable. `predictionAt(tick)` exposes the own-entity history for measurement and diagnostics.

protocol v1 (JSON, TRACER-001) remains exported until the game client moves to v2. Migration: a version outside the supported range is answered with `reject{reason:'version'}` and the socket closes; it is never coerced.

## 8. Edge cases

1. Intent seq replayed from a previous connection is ignored (seq <= the own entity's seq).
2. Snapshot arrives after two local predictions: both unacked intents replay in order.
3. Hash ack arrives for a tick whose snapshot was not recorded: ignored, not counted as ok.
4. 80 ms packet loss for 2 s: no state divergence; client resumes at next snapshot.
5. Client and server on different integer widths: protocol rejects the version, no silent truncation.
6. Frame with one extra byte: rejected as `trailing-bytes`; a frame is exact, never a prefix.
7. Frame carrying more than 64 entities: rejected at both encode and decode; the AoI cap is 64 (D90).
8. Snapshot names a tick with no recorded prediction: verdict `unknown`, never `ok` and never a desync.
9. Own entity absent from the snapshot: desync, authoritative entity list adopted as-is, resync requested.
10. Duplicate or older snapshot arrives: the presentation buffer ignores it; it never rewinds rendering.
11. Another client moves its entity between snapshots: this client's whole-world predicted hash differs, but its own entity matches; verdict `ok`, never a desync. Whole-world prediction needs an input broadcast, which this protocol does not have.
12. Snapshot hash inconsistent with its entity list: desync even when the own entity matches, because nothing in that snapshot can be trusted.

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
- GIVEN a v1 and a v3 hello WHEN `negotiate` runs THEN both return `reject{reason:'version'}` and neither is coerced.
- GIVEN every v2 message class WHEN it is encoded and decoded THEN the value is identical (round-trip).
- GIVEN a 64-entity snapshot WHEN encoded THEN it is exactly 1 551 bytes and over the 12 KB/s budget, recorded as NET-101's problem.
- GIVEN a local intent and a matching server snapshot WHEN reconciled THEN the verdict is `ok`, the own entity is equal at the acked tick, and only its intents with seq above its own `seq` are replayed.
- GIVEN a wrong snapshot hash, a snapshot hash inconsistent with its entities, or a missing own entity WHEN reconciled THEN the verdict is `desync`, pending intents are cleared, resync is requested and the authoritative state is adopted exactly.
- GIVEN another client's entity moved between snapshots WHEN this client reconciles THEN its own entity still matches and the verdict is `ok`, never `desync`.
- GIVEN four clients, 64 entities and the 24-cell requested RTT 0/50/150/300 ms x loss 0/2/5 % x jitter 0/30 ms matrix (actual 33.3/66.7/166.7/300 ms after 30 Hz quantization; loss client→server), 360 ticks per cell WHEN the harness runs THEN 0 desyncs, 0 snapshot-integrity failures, correction p95 50 mm / max 450 mm / 0 over 2 m, server tick p95 <= 0.4411 ms, and the 12 KB/s budget still fails at 3.79x.
- GIVEN a 30-minute real-time soak at 30 Hz with four clients and 64 entities WHEN the soak finishes THEN wall time >= 30 min, 0 desyncs, 0 snapshot-integrity failures, correction p95 < 300 mm and server tick p95 <= 25 ms.
- GIVEN two snapshots WHEN sampled at render ticks THEN interpolation yields integer millimetres and the buffer never rewinds.
- GIVEN a shot at a tick inside the ring WHEN validated THEN range, LOS and cooldown are checked on that rewound world; a tick outside the ring is `stale-shot`.
- GIVEN a client `claimed` flag WHEN validation runs THEN the verdict is identical with `claimed` true or false.
- GIVEN a v2 hello WHEN negotiated THEN the peer is refused; a v3 anim frame and a resync request round-trip at exact byte lengths.
- GIVEN inter-snapshot gaps WHEN observed THEN the presentation jitter buffer stays inside 3..8 ticks and resets to the floor on resync.

## 16. Perf budget impact

Client frame <= 16.7 ms at 60 fps; server tick p95 <= 25 ms; wire <= 12 KB/s down at 64 entities; no extra allocation per tick (measured in NET-006).

## 17. Explicit out of scope

No physics engine, no Babylon on the server tick, no client-authoritative gameplay, no hero art.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| Is the implemented 3..8 tick jitter range enough at 60 fps under real loss? | qa-engineer | PR-N1 measured corrections at 30 ms jitter on an in-process link; no 60 fps render or kernel-loss measurement exists |
| Are 30-tick rewind and 15-tick cooldown the right values under 2 s of packet loss? | qa-engineer + gameplay-engineer | PR-S1 measured the range/cooldown; a kernel-level loss run is still owed |
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
| 0.8 | 2026-11-18 | PR-N1: 4-client matrix + real 30-minute soak; prediction scope clarified to the own entity, snapshot integrity enforced, speculative ticks are `unknown` | netcode-engineer |
