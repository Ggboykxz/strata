# GDD-SHARDING — DRAFT

| field | value |
|---|---|
| id | GDD-SHARDING |
| version | 0.2 |
| owner | backend-engineer |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships and is re-signed at each gate.

## 1. Identity, version, owner, status

ID GDD-SHARDING, version 0.2, owner backend-engineer, status **DRAFT**. Derived from P1-001 VISION and the locked HIGH_CONCEPT.

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

## 6. State machine

QUEUED → IN_FLIGHT → ACKED → APPLIED → FAILED → RETRYING.

## 7. Data contract

shard_commit v1 {fact_id, source_shard, target_shard, retry_count, hash}. Ordering is by (tick, fact_id), never by wall clock. Migration: version gate rejects mixed-version shards.

## 8. Edge cases

1. Two shards commit the same fact id in one window: second is deduplicated by id.
2. Target shard offline: entry stays IN_FLIGHT for at most one window, then RETRYING with backoff.
3. Three retries with different hashes: commit is rejected and escalated to the GM audit log.
4. Fact arrives before its prerequisite fact: queued, not applied, until prerequisite acks.
5. Shard split during commit: both halves use the same fact id; no duplicate history.

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

## 16. Perf budget impact

Commit p95 <= 1 s at 64 shards; queue memory bounded by the configured fan-out; no global lock on the tick path.

## 17. Explicit out of scope

No peer-to-peer history merge, no eventually-consistent currency, no client-visible shard ids in gameplay UI.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| M | a | x |
| B | a | c |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields, sources and ranges | GDD-002 |
