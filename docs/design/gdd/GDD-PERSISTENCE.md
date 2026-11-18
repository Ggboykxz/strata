# GDD-PERSISTENCE — DRAFT

| field | value |
|---|---|
| id | GDD-PERSISTENCE |
| version | 0.2 |
| owner | backend-engineer |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships and is re-signed at each gate.

## 1. Identity, version, owner, status

ID GDD-PERSISTENCE, version 0.2, owner backend-engineer, status **DRAFT**. Derived from P1-001 VISION and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

After a shard restart, the fact graph and the currency ledger restore byte-identically with zero drift.

## 3. High Concept link

D3 requires the causal chain to be replayable from the fact log with an attributable actor id.

## 4. Deterministic rules

1. Facts are append-only; a fact id is immutable once written.
2. Currency moves use double-entry integer minor units; every entry has an idempotency key.
3. A restore replays facts in tick order and verifies the ledger checksum before the shard accepts clients.

## 5. Numbers with source

- cold start <= 10 s, restore <= 3 s on the measured dataset | SOURCE: master §6 budgets
- ledger drift = 0 under retry storms | TUNABLE retry count 1..1000 | plan: PR-S4 soak
- checkpoint every 600 s | SOURCE: master §17 watchdog interval

## 6. State machine

EMPTY → LOADING → REPLAYING → VERIFYING → READY → WRITING → CHECKPOINTING → READY.

## 7. Data contract

fact_log v1 {fact_id, actor_id, tick, payload_hash}; ledger_entry v1 {id, debit, credit, minor_units, idempotency_key}. Migration: v(n) → v(n+1) requires an offline replay script and a checksum proof.

## 8. Edge cases

1. Idempotency key replayed after a crash produces no second ledger entry.
2. Fact written during checkpoint is included in the next batch, not dropped.
3. Checksum mismatch refuses READY and writes a JOURNAL entry.
4. Two shards restore from the same snapshot with different seek positions: both converge to the same checksum.
5. Snapshot older than the retention window: restore fails with an explicit reason.

## 9. Failure states

1. Disk write failure: checkpoint aborts, shard stays READY with the last verified state.
2. Corrupt fact payload: replay stops at the first bad hash, names the fact id.
3. Ledger imbalance: shard refuses to accept clients and alerts the GM dashboard.

## 10. Interaction matrix

PERSISTENCE × SHARDING: commit queue serializes cross-shard consequences. PERSISTENCE × MODERATION: GM actions write attributed facts.

## 11. Feedback per state change

Restore progress is reported as tick count, not a spinner; operators see checksum status before READY.

## 12. Accessibility

Operator dashboard states are textual; colour is never the only signal.

## 13. Localization

Error codes are stable identifiers; messages are localized at the dashboard layer only.

## 14. Telemetry and success metric

restore_seconds (p95), ledger_drift (must be 0), checkpoint_bytes, replay_fact_count. Success metric: 0 drift over 1000 replayed retry keys.

## 15. Acceptance tests

- GIVEN a snapshot and 1000 retried idempotency keys WHEN restore runs THEN checksum matches and drift is 0.
- GIVEN a corrupt fact payload WHEN replay runs THEN the bad fact id is named and READY is refused.
- GIVEN a killed shard mid-checkpoint WHEN restart runs THEN restore completes within the measured 3 s budget.

## 16. Perf budget impact

Restore p95 <= 3 s on the measured dataset; checkpoint write <= 600 s interval; ledger verification O(n) over facts.

## 17. Explicit out of scope

No cloud database as source of truth, no float currency, no client-side writes to the fact log.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| R | e | t |
| W | h | i |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields, sources and ranges | GDD-002 |
