# GDD-COMBAT — DRAFT

| field | value |
|---|---|
| id | GDD-COMBAT |
| version | 0.3 |
| owner | game-designer |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships.

## 1. Identity, version, owner, status

ID GDD-COMBAT, version 0.3, owner game-designer, status **DRAFT**. Derived from VISION v1.0 and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

A winning short-term combat strategy degrades a later stratum, so the player pays for every victory.

## 3. High Concept link

D4 players antagonize their own future; a strategy with no cross-stratum cost fails the concept.

## 4. Deterministic rules

1. The server owns hit frames and combat math; the client sends intent only.
2. Every destructive act writes a fact whose consequence reaches at least one other stratum.
3. A combat tactic that produces no delayed cost is a design defect, not a balance setting.

## 5. Numbers with source

- hit frame validated on server, 0 client-authoritative hits | SOURCE: GDD-NETCODE and I1
- cross-stratum cost delay >= 1 epoch | TUNABLE 1..3 epochs | plan: ECON-001 simulation
- combat math within the 4 ms core tick budget | SOURCE: master §6 sim tick <= 4 ms
- animation STATE payload <= 64 bytes per entity | SOURCE: master §6 and GDD-ANIM-ARCHITECTURE
- greybox TTK = 36 ticks = 1 200 ms for 100 HP / 25 damage / 9-tick interval / 2-tick hit-stop | SOURCE: tools/sim/world/prs1_combat.ts (PR-S1), 30 Hz tick
- hit-stop cap = 30 ticks = 1 s | SOURCE: tools/sim/world/prs1_combat.ts MAX_HIT_STOP_TICKS; TUNABLE until PR-S1 playtest
- combat math stays integer ticks; the 4 ms core tick budget is a constraint, not a measured number from PR-S1

## 6. State machine

IDLE → WINDUP → ACTIVE → RECOVERY → FACT_WRITTEN → COST_SCHEDULED → RESOLVED.

## 7. Data contract

combat_event v1 {actor_id, target_id, tick, intent_seq, hit_frame, fact_id}; hit_frame is server-generated. Migration: a new hit rule increments the event version and requires a replay proof.

Combat prototype v1 `CombatParams{hp, damage, windupTicks, activeTicks, recoveryTicks, intervalTicks, hitStopTicks}` is evaluated by `tools/sim/world/prs1_combat.ts`. An illegal window (windup or active below 1, negative recovery, interval shorter than the window sum, non-integer value) is **refused**, never clamped. TTK and hit-stop are integer tick counts; milliseconds are presentation derived from the 30 Hz tick.

## 8. Edge cases

1. Client predicts a hit the server rejects: server frame wins and a desync telemetry event is emitted.
2. Two hits land on the same node in one tick: deterministic order by (tick, actor_id).
3. Destructive act has no downstream stratum: the act is refused as concept debt.
4. Delay spans three epochs: cost is still attributed to the original fact id.
5. Combat math exceeds tick budget: act is committed and overrun is recorded, never dropped.

## 9. Failure states

1. Unvalidated hit: event dropped, rate-limit counter incremented.
2. Missing fact id: act is rolled back on the server, no consequence is written.
3. Hit frame disagreement: server snapshot is authoritative, client reconciles.

## 10. Interaction matrix

COMBAT × CONSEQUENCE: every destructive act writes a fact. COMBAT × ECONOMY: repair cost is a sink.

## 11. Feedback per state change

The player sees the immediate result and a named future cost in the HUD overlay; no hidden penalty.

## 12. Accessibility

Hit and cost signals are text plus icon; no essential cue is carried by animation alone.

## 13. Localization

Ability names and cost labels are keys; numerics use locale-independent formatting.

## 14. Telemetry and success metric

unvalidated_hits, cost_delay_epochs, facts_per_act, tick_overruns. Success metric: 0 client-authoritative hits and >=1 delayed cost per strategy.

## 15. Acceptance tests

- GIVEN a client-side hit WHEN the server ticks THEN the server frame is authoritative.
- GIVEN an optimal short-term strategy WHEN simulated THEN a later stratum is degraded.
- GIVEN a destructive act WHEN resolved THEN one attributed fact id is written.

- GIVEN a legal greybox window WHEN simulated THEN TTK and hit-stop are integer ticks and the labelled report is deterministic.
- GIVEN an illegal window WHEN simulated THEN it is refused with a RangeError and no value is clamped.

## 16. Perf budget impact

Combat step within 4 ms tick; no new allocation per hit; animation state only on the wire.

## 17. Explicit out of scope

No client-authoritative hit, no unattributed destruction, no cosmetic-only consequence.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| Does the 1 200 ms greybox TTK feel right in a real 4-client session? | gameplay-engineer + qa-engineer | PR-S2 playtest |
| Is a 2-tick hit-stop perceptible at 30 Hz, and should the cap stay at 30 ticks? | gameplay-engineer | PR-S1 tuning |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields, T2/T4 numbers and sources | GDD-003 |
| 0.3 | 2026-11-18 | PR-S1: greybox TTK/windows/hit-stop, integer tick contract | gameplay-engineer |
