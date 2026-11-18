# GDD-SECURITY — DRAFT

| field | value |
|---|---|
| id | GDD-SECURITY |
| version | 0.4 |
| owner | security-auditor |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships and is re-signed at each gate.

## 1. Identity, version, owner, status

ID GDD-SECURITY, version 0.4, owner security-auditor, status **DRAFT**. Derived from P1-001 VISION and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

A forged, malformed or flooding message cannot change authority; every GM action has a reason and an audit entry.

## 3. High Concept link

D3 traceability: every visible consequence resolves to a fact id and an actor id.

## 4. Deterministic rules

1. Every client message is schema-validated, rate-limited and plausibility-checked before it reaches the tick.
2. Server-side state changes are authoritative; a client never sends a position, a hit result or an animation bone transform.
3. GM actions require a reason string and write an immutable audit entry with actor id and tick.

## 5. Numbers with source

- max 30 intents/s per client | TUNABLE 10..60 | plan: PR-N3 flood test
- snapshot encode <= 2 ms per client per tick | SOURCE: master §6 budgets
- audit log retention >= 90 days | TUNABLE 30..365 days | plan: OPS-001 runbook
- 0 unvalidated message paths on the live room path | SOURCE: SEC-002, apps/server/src/rooms/ws-adapter.ts routes every frame through MessageGate; regression test in apps/server/test/rooms.test.ts
- rate limit = 30 intents per 30-tick window | SOURCE: apps/server/src/validation/rate-limit.ts
- burst proof = 200 messages → 30 admitted, 170 refused with RATE_LIMIT | SOURCE: tests/security/message-gate.test.ts

## 6. State machine

RECEIVED → VALIDATED → RATE_CHECKED → PLAUSIBLE → APPLIED → REJECTED → LOGGED.

## 7. Data contract

validation v1 rejects unknown kinds, wrong versions, out-of-range fields and non-monotonic seq. Rejection emits reason code and increments a per-client counter. Wire schema and version live in GDD-NETCODE field 7.
Reason codes: `malformed | unknown-kind | wrong-version | client-snapshot | rate-limited | non-monotonic-seq`. Client-sent snapshots are always refused (I1); a hit claim has no valid frame kind and is ignored by PR-N4. A GM action without a non-empty reason is refused before any state change; an accepted action writes an immutable audit entry `{id, actor, tick, action, reason, hash}` (FNV-1a). Audit retention is OPS-001, not a promise of this task.

## 8. Edge cases

1. Intent with dx = 2 is rejected before the tick, not clamped.
2. Burst of 200 messages in 1 s: first 30 accepted, rest rejected with reason code RATE_LIMIT.
3. Client sends a hit result: message kind unknown, dropped and logged.
4. GM action without a reason: refused at the dashboard before it reaches the server.
5. Replayed session token after logout: rejected by the token store, not by string comparison.

## 9. Failure states

1. Validation error: message dropped, counter incremented, no state change.
2. Flood: per-client budget exhausted; connection is throttled, not the whole shard.
3. Audit write failure: GM action is rolled back; no unreported action is allowed.

## 10. Interaction matrix

SECURITY × NETCODE: validation sits before prediction. SECURITY × MODERATION: reports and GM actions share the audit log.

## 11. Feedback per state change

Rejection reason codes are returned once and recorded; operators see counter deltas per reason.

## 12. Accessibility

GM action dialogs expose reason and consequences as text before confirmation.

## 13. Localization

Reason codes are tokens; localized copy lives in the dashboard, never in the wire message.

## 14. Telemetry and success metric

rejected_messages_by_code, rate_limit_events, gm_actions_without_reason (must be 0), audit_write_failures. Success metric: 0 authority changes from unvalidated input.

## 15. Acceptance tests

- GIVEN an intent with dx=2 WHEN the server validates it THEN state is unchanged and reason RANGE is logged.
- GIVEN 200 messages in 1 s WHEN rate limiting runs THEN at most 30 reach the tick.
- GIVEN a GM action without reason WHEN submitted THEN it is refused and no audit entry is created.

- GIVEN 200 intents in one tick-window WHEN the gate runs THEN exactly 30 are admitted and 170 are refused with `RATE_LIMIT`.
- GIVEN a client-sent snapshot or a wrong hello version WHEN validated THEN it is refused with a reason and the counter increments.
- GIVEN a GM action without a reason WHEN audited THEN it is refused and no entry is written.

- GIVEN a malformed frame on the live room socket WHEN received THEN the adapter answers `reject` and the room state hash is unchanged.
- GIVEN a valid hello frame WHEN received THEN it reaches the room and a `welcome` is returned.

## 16. Perf budget impact

Validation <= 0.2 ms per message; rate-limit check is O(1) per client; audit write is off the tick path.

## 17. Explicit out of scope

No client-side trust, no anti-cheat telemetry uploaded from the render process, no secret in logs or binaries.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| When does `attachRooms` route every frame through the gate, and who verifies no bypass remains? | security-auditor + backend-engineer | SEC-002 |
| Which durable store keeps audit entries for the 90-day retention target? | sre-engineer | OPS-001 |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields, sources and ranges | GDD-002 |
| 0.3 | 2026-11-18 | SEC-001: ingress gate, rate limit, reason counters, GM audit, honest residual risks | security-auditor |
| 0.4 | 2026-11-18 | SEC-002: gate wired into the live room path; residual risk 3 mitigated | security-auditor |
