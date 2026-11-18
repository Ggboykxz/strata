# GDD-QUEST — DRAFT

| field | value |
|---|---|
| id | GDD-QUEST |
| version | 0.3 |
| owner | narrative |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships.

## 1. Identity, version, owner, status

ID GDD-QUEST, version 0.3, owner narrative, status **DRAFT**. Derived from VISION v1.0 and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

A major quest offers at least three resolutions, each producing a cross-stratum effect and a delayed effect.

## 3. High Concept link

T4 depth: every major quest has >=3 resolutions, each with a cross-stratum and a delayed effect.

## 4. Deterministic rules

1. Quest state is derived from world facts; no quest uses an authored branch that bypasses the fact graph.
2. Each resolution writes at least one fact and one delayed consequence in another stratum.
3. Dialogue and companions read the same fact log; no private quest-only history.

## 5. Numbers with source

- >= 3 resolutions per major quest | SOURCE: master T4
- >= 1 cross-stratum effect and >= 1 delayed effect per resolution | SOURCE: master T4
- >= 200 reachable world states before GATE:P2 | SOURCE: master T4
- dialogue lines are FR/EN pairs with 0 untranslated keys | SOURCE: master §6 policy

## 6. State machine

AVAILABLE → ACCEPTED → RESOLVING(3 options) → FACT_WRITTEN → DELAYED_EFFECT_PENDING → RESOLVED → LOGGED.

## 7. Data contract

quest_resolution v1 {quest_id, option_id, actor_id, fact_id, delayed_tick, stratum_ids[]}. Migration: a new option gets a new id; old resolutions remain replayable.

PR-S3 reference run: two players choosing options 1 and 2 of `q_abbey` keep **two distinct fact ids**; a
text-only option is refused; the delayed consequence is applied at `fact_tick + 9` (not at the current tick).
243 reachable quest states are derived from 5 quests × 3 options. Six FR/EN dialogue keys have 0 untranslated
entries. No renderer, player or asset was used.

## 8. Edge cases

1. Two players choose different options for the same quest: both fact ids are retained, no global override.
2. Delayed effect is due after shard restore: scheduled from the fact tick, not wall time.
3. Resolution produces a text-only change: rejected as a T4 defect.
4. Quest prerequisite fact is erased by an earlier act: quest re-derives from the new world state.
5. Dialogue references a fact the player never authored: line is suppressed rather than invented.

## 9. Failure states

1. Missing delayed effect: resolution is recorded as concept debt and the quest cannot be signed.
2. Untranslated key: localization gate fails the quest asset before merge.
3. Fact log unavailable: quest stays AVAILABLE and refuses to resolve, no local fallback state.

## 10. Interaction matrix

QUEST × CONSEQUENCE: options write facts. QUEST × DIALOGUE/COMPANION: shared fact log (narrative co-agent).

## 11. Feedback per state change

The HUD names the authored fact and the expected delayed era; no hidden quest flag.

## 12. Accessibility

Resolutions are selectable by keyboard and screen reader; delayed effects are announced as text.

## 13. Localization

All lines are FR/EN key pairs; no concatenated sentences and no locale-dependent formatting in logic.

## 14. Telemetry and success metric

resolutions_per_quest, delayed_effects_pending, untranslated_keys, reachable_states. Success metric: >=3 resolutions with both effects for every signed major quest.

## 15. Acceptance tests

- GIVEN a major quest WHEN all options are enumerated THEN at least 3 resolutions exist.
- GIVEN one resolution WHEN the delayed tick arrives THEN another stratum shows the recorded effect.
- GIVEN the FR/EN pair set WHEN validate-docs runs THEN 0 untranslated keys are reported.

- GIVEN two players choosing different options WHEN resolved THEN both fact ids are retained and no global override occurs.
- GIVEN a delayed consequence WHEN its fact tick plus 9 arrives THEN it is applied in another stratum, and a text-only resolution is refused.

## 16. Perf budget impact

Quest derivation is O(facts in cell), not O(world facts); no extra tick cost above 4 ms.

## 17. Explicit out of scope

No branching script that bypasses the fact graph, no private history, no commercial IP names or lore.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| W | h | i |
| H | o | w |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields, T2/T4 numbers and sources | GDD-003 |
| 0.3 | 2026-11-18 | PR-S3: fact-derived resolutions, delayed effects, FR/EN keys, prototype numbers | narrative |
