# GDD-SHARDING — DRAFT

| field | value |
|---|---|
| id | GDD-SHARDING |
| version | 0.4 |
| owner | backend-engineer |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships and is re-signed at each gate.

## 1. Identity, version, owner, status

ID GDD-SHARDING, version 0.4, owner backend-engineer, status **DRAFT**. Derived from P1-001 VISION and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

A consequence written on shard A is visible on shard B within one commit window, with one fact id and one author.

## 3. High Concept link

D6 collective authorship: consequences are shard-wide and named, not private to the actor.

## 4. Deterministic rules

1. Cross-shard consequences enter a serialized, attributed, idempotent commit queue.
2. A fact id is unique across shards; a shard never invents a second id for the same act.
3. The queue commits only after the destination shard acks the fact hash.

## 5. Numbers with source

- commit window <= 1 s at 64 players per shard | TUNABLE 0.2..2 s | plan: PR-S7 shard storm test
- cross-shard fan-out <= 64 shards per fact | TUNABLE 8..64 | plan: PR-S7
- duplicate commits = 0 under retry | SOURCE: master §6 double-entry idempotency
- room capacity = 2 authoritative entities by default | SOURCE: apps/server/src/rooms/room.ts (A0004, ws transport)
- reconnect window = 30 ticks = 1 s at 30 Hz | TUNABLE 0..120 ticks | plan: PR-N2 loss/jitter matrix; eviction at `tick - disconnectTick > window`
- resume handle = 4 dot-separated fields (room, client, nonce, 8-hex FNV-1a signature) | SOURCE: apps/server/src/rooms/tokens.ts — a tamper detector, not a credential

## 6. State machine

QUEUED → IN_FLIGHT → ACKED → APPLIED → FAILED → RETRYING.

Room lifecycle (instances, NET-003): **OPEN → DRAINING → CLOSED**. OPEN while at least one socket is attached;
DRAINING when every client is away but a handle is still inside the reconnect window; CLOSED when the window
expires and the hub removes the room. A resumed client reclaims its original entity id, never a new one.

## 7. Data contract

shard_commit v1 {fact_id, source_shard, target_shard, retry_count, hash}. Ordering is by (tick, fact_id), never by wall clock. Migration: version gate rejects mixed-version shards.

room_session v1 {room, client, nonce, signature} travels in the WebSocket upgrade query (`?room=…&token=…` or
`?room=…&nonce=…`), because protocol v2 has no field for it (NET-002 scope). The server sends a snapshot on
resume; the client resets to it and replays only intents with seq greater than the entity's `appliedSeq`
(GDD-NETCODE §4, client side in NET-004). The server never replays intents on resume: that would double-apply.
A handle is a **resume hint, not authentication**; SEC-001 owns auth, rate limits and anti-cheat.

PR-N2 reference contract: a deterministic queue ordered by `(rating, client_id)` fills rooms up to capacity.
A disconnected handle keeps its entity for `reconnectTicks`; resuming before expiry returns the **same** entity
id, while a late handle is refused and the room is torn down once no member remains. Global queue ids and
room-local client ids are distinct — an implementation must track the room id explicitly, never infer it from a
client id (that defect was found and fixed in the harness).

## 8. Edge cases

1. Two shards commit the same fact id in one window: second is deduplicated by id.
2. Target shard offline: entry stays IN_FLIGHT for at most one window, then RETRYING with backoff.
3. Three retries with different hashes: commit is rejected and escalated to the GM audit log.
4. Fact arrives before its prerequisite fact: queued, not applied, until prerequisite acks.
5. Shard split during commit: both halves use the same fact id; no duplicate history.
6. Intent with a seq already submitted by that entity: refused at ingress with a rejection event; never enqueued twice.
7. Resume with another client's handle, or a tampered signature: refused; the socket gets `reject{unauthorized}`.
8. Room full: the ninth join attempt for an 8-entity room is refused; no entity is reassigned while away inside the window.
9. Resume after the window: the handle is dead, the client must join as a new member with a new entity id.

## 9. Failure states

1. Queue overflow: new facts are refused with an explicit backpressure signal, never silently dropped.
2. Hash mismatch: commit rejected, both shard snapshots captured for triage.
3. Network partition: no cross-shard commit; shards continue local ticks with queued facts.

## 10. Interaction matrix

SHARDING × PERSISTENCE: commit is durable before ack. SHARDING × MODERATION: GM actions use the same queue and carry a reason.

## 11. Feedback per state change

Operators see queue depth and oldest in-flight age; players see the consequence when it lands, not a pending marker.

## 12. Accessibility

Queue alarms are textual events in the GM dashboard with severity, not colour alone.

## 13. Localization

Shard ids and fact ids are locale-independent tokens; messages are keys.

## 14. Telemetry and success metric

queue_depth, commit_latency_ms (p95), duplicate_commits, retry_count. Success metric: 0 duplicate commits and 0 lost facts in a 30 min storm.

## 15. Acceptance tests

- GIVEN 64 shards and one fact WHEN the queue commits THEN each shard reports the same fact id and hash.
- GIVEN 1000 retries of one commit WHEN the queue processes them THEN exactly one ledger/fact entry exists.
- GIVEN a target shard offline WHEN the window closes THEN the entry is RETRYING and no fact is lost.
- GIVEN two clients WHEN they join a room THEN they receive distinct entity ids; a third join over capacity is refused.
- GIVEN a disconnected client WHEN it resumes inside the window THEN it gets the same entity id and a snapshot with its applied seq; outside the window the handle is dead.
- GIVEN one room id and one intent script WHEN two hubs run it THEN their hashes are equal at every tick.

- GIVEN a deterministic queue WHEN matched THEN the same input produces the same room layout.
- GIVEN two disconnects inside the window WHEN resumed THEN both entities are identical; a late handle is refused and the empty room is torn down.

## 16. Perf budget impact

Commit p95 <= 1 s at 64 shards; queue memory bounded by the configured fan-out; no global lock on the tick path.

## 17. Explicit out of scope

No peer-to-peer history merge, no eventually-consistent currency, no client-visible shard ids in gameplay UI.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| Does the resume handle move into an authenticated wire frame, and who owns the session secret? | security-auditor + backend-engineer | SEC-001 |
| What reconnect window survives a 2 s loss burst at 64 players? | qa-engineer | PR-N2 |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields, sources and ranges | GDD-002 |
| 0.3 | 2026-11-18 | NET-003: room lifecycle, ws transport (A0004), resume handles, ingress replay check | backend-engineer |
| 0.4 | 2026-11-18 | PR-N2: deterministic matchmaking, exact resume, teardown; id-collision defect fixed | backend-engineer |
