# GDD-STRATA — DRAFT

| field | value |
|---|---|
| id | GDD-STRATA |
| version | 0.2 |
| owner | game-designer |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships.

## 1. Identity, version, owner, status

ID GDD-STRATA, version 0.2, owner game-designer, status **DRAFT**. Derived from VISION v1.0 and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

The player sees the same topology read three ways; a change in one era rewrites the others without a scripted transition.

## 3. High Concept link

D2 consequences are spatial and D5 epochs are computed from world state, never hand-authored.

## 4. Deterministic rules

1. Each stratum derives its epoch from the fact graph at the current tick; no epoch trigger is authored.
2. A fact swaps geometry or placement in at least two other strata; a text-only change does not count.
3. Stratum layout is a kit on a 2 m grid plus 64 m cells; generated backdrops are reference boards only.

## 5. Numbers with source

- 3 strata, 64 m cells, 2 m kit grid | SOURCE: master §7 and §8.7
- geometry variant swap <= 1 tick after the fact is committed | TUNABLE 1..3 ticks | plan: T2 replay
- draw calls <= 250, tris <= 1.5 M per cell | SOURCE: master §6 budgets
- heightmap 1 m resolution, 16-bit, quantized | SOURCE: master §8.7

## 6. State machine

EPOCH_STONE → EPOCH_ABBEY → EPOCH_MEGACITY is derived, not sequential; any epoch may be recomputed from facts.

## 7. Data contract

stratum_view v1 {cell_id, stratum_id, epoch, variant_ids[], fact_ids[]}. Variant id is an instance buffer, not a separate material. Migration: new variant requires a new id and a before/after capture pair.

## 8. Edge cases

1. Two facts affect one cell in the same tick: variant resolution is deterministic by fact_id order.
2. Fact removes a node that another stratum uses as a route: navigation recomputes in the same tick.
3. Backdrop contains a splat beyond 120 m: allowed as vista only, never collidable or server-referenced.
4. Client and server heightmap samples differ by > 1 cm: parity test rejects the cell.
5. A stratum has no affected variant for a fact: the fact is recorded but T2 does not count it.

## 9. Failure states

1. Parity mismatch: cell is rejected and the fact id is named.
2. Missing variant asset: kit fallback is rendered and the gap is recorded as content debt.
3. Epoch derivation loop: tick aborts with an explicit cycle error instead of hanging.

## 10. Interaction matrix

STRATA × NAVIGATION: routes change with variants. STRATA × CONSEQUENCE: variants are the visible proof.

## 11. Feedback per state change

A variant swap emits one capture pair and one fact id; the HUD names the era, not the implementation.

## 12. Accessibility

Era changes are announced as text and icon; no colour-only cue carries the change.

## 13. Localization

Era and stratum names are keys; no concatenated sentences in UI strings.

## 14. Telemetry and success metric

variant_swaps_per_fact, parity_error_cm, draw_calls_per_cell, splat_share. Success metric: >=1 physical variant per affected stratum in the T2 replay.

## 15. Acceptance tests

- GIVEN one forest burn WHEN 900 ticks pass THEN at least two strata show a geometry variant swap.
- GIVEN a cell WHEN client and server sample 10k points THEN heights agree within 1 cm.
- GIVEN a scripted epoch trigger WHEN reviewed THEN no such trigger exists in the fact graph.

## 16. Perf budget impact

draw calls <= 250, tris <= 1.5 M, load <= 25 MB compressed; splat share <= 25% of a cell GPU budget.

## 17. Explicit out of scope

No monolithic generated zone, no scripted epoch, no gameplay splat, no server physics engine.

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
