# GDD-WORKFLOW — DRAFT

| field | value |
|---|---|
| id | GDD-WORKFLOW |
| version | 0.2 |
| owner | orchestrator |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships and is re-signed at each gate.

## 1. Identity, version, owner, status

ID GDD-WORKFLOW, version 0.2, owner orchestrator, status **DRAFT**. Derived from P1-001 VISION and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

Conflicts fail closed: one writer per path, locks acquired in one commit, ACP threads with at most three rounds, and a recorded arbitration ladder.

## 3. High Concept link

D6 collective authorship requires attribution; I6 single writer and I15 one file per event make the attribution machine-checkable.

## 4. Deterministic rules

1. The most specific glob in OWNERSHIP.yaml wins; a tie is a map error, never a judgement call.
2. A lock acquisition writes every path glob in one commit on state/locks; a rejected push means retry.
3. A task writes outside owner ∪ co only when scaffold:true is declared and the exemption is printed.

## 5. Numbers with source

- 32 owners, 166 globs, 0 ties | SOURCE: docs/state/OWNERSHIP.yaml and validate-ownership.mjs
- lock TTL 60 min, heartbeat every 10 min | SOURCE: docs/state/LOCKS.yaml
- ACP rounds <= 3 before the 5-level ladder | SOURCE: master §4.6
- signature ratio >= 0.40 for sig tasks | SOURCE: BLUEPRINT.yaml policy

## 6. State machine

PROPOSAL → CRITIQUE → COUNTER → EVIDENCE → DECISION → HANDOFF → MERGE_QUEUE. A VETO halts the thread until resolved.

## 7. Data contract

thread files are docs/state/threads/<task>/NNNN-<EVENT>.md; one event per file. Handoffs name inputs, outputs, acceptance commands, constraints, deadline and rollback. Commits carry Agent: and Task: trailers.

## 8. Edge cases

1. Two agents claim one glob with equal specificity: validate-ownership exits 1 before the task starts.
2. A handoff without an acceptance command is invalid and refuses the task.
3. Three ACP rounds without DECISION: escalation to the ladder is mandatory.
4. Guardian VETO: work stops; only the Director can override after recorded evidence.
5. Expired active lock: watchdog fails closed and names the path with a JOURNAL reclaim instruction.

## 9. Failure states

1. Push rejected: keep the commit, write PENDING_PUSH.md, retry with backoff.
2. Missing validator: fail closed, never accept by omission.
3. Author equals reviewer: PR is refused; the Director needs a different reviewer.

## 10. Interaction matrix

WORKFLOW × all domains: every cross-domain write goes through a HANDOFF. WORKFLOW × P0-004: workflow.yml enforces the map, locks and self-validation.

## 11. Feedback per state change

Each state change writes one event file; the dashboard reads generated views, never its own truth.

## 12. Accessibility

Thread events are plain text with explicit event labels; no colour-only status.

## 13. Localization

Repository artifacts are English; the Director speaks French. Event labels are fixed tokens.

## 14. Telemetry and success metric

open_disputes, refused_ownership_count, lock_expiries, avg_acp_rounds, signature_ratio. Success metric: 0 ownership violations and 0 unrecorded decisions.

## 15. Acceptance tests

- GIVEN two identical globs with different owners WHEN validate-ownership runs THEN it exits 1 and names both.
- GIVEN a handoff without acceptance WHEN the orchestrator selects it THEN the task is refused.
- GIVEN an expired active lock WHEN the watchdog runs THEN it fails closed with the reclaim instruction.

## 16. Perf budget impact

Ownership validation over 166 globs and 63 tasks completes in under 1 s; no CI step exceeds its timeout-minutes.

## 17. Explicit out of scope

No self-merge, no silent special case, no direct edit of another owner's path, no force-push on main.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| W | h | o |
| S | h | o |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields, sources and ranges | GDD-002 |
