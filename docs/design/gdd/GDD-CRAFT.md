# GDD-CRAFT — DRAFT

| field | value |
|---|---|
| id | GDD-CRAFT |
| version | 0.2 |
| owner | economy-designer |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships.

## 1. Identity, version, owner, status

ID GDD-CRAFT, version 0.2, owner economy-designer, status **DRAFT**. Derived from VISION v1.0 and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

High-tier goods are made by players from materials whose provenance names the fact that produced them.

## 3. High Concept link

D3 traceability; D4 a crafted advantage carries a cross-stratum cost.

## 4. Deterministic rules

1. Every crafted item carries the fact ids of its inputs, not just a recipe id.
2. Craft consumes materials through a named sink and writes a new fact for the output.
3. A recipe that produces an item with no delayed cost in another era is concept debt.

## 5. Numbers with source

- recipe input count 2..8 | TUNABLE 2..8 | plan: ECON-001 crafting sim
- craft duration <= 3 ticks at 30 Hz | TUNABLE 1..10 ticks | plan: PR-S2 prototype
- output tier <= 4 | SOURCE: master §2.3 capacity tiers S0..S4
- provenance fact ids per output >= 1 | SOURCE: GDD-CONSEQUENCE field 7

## 6. State machine

RECIPE_SELECTED → INPUTS_RESERVED → CRAFTING → OUTPUT_WRITTEN → FACT_WRITTEN → COST_SCHEDULED → OWNED.

## 7. Data contract

crafted_item v1 {item_id, recipe_id, input_fact_ids[], output_fact_id, tier}. Migration: a recipe change creates a new recipe id; old items keep their provenance.

## 8. Edge cases

1. Input material was erased by an earlier fact: craft refuses and names the missing fact id.
2. Two crafters reserve the same material in one tick: deterministic winner by (tick, actor_id).
3. Output tier above the authorized tier: craft refused, no silent downgrade.
4. Recipe produces no delayed cost: item is flagged concept debt and cannot be signed.
5. Restore happens mid-craft: craft resumes from the reserved-input fact, not wall time.

## 9. Failure states

1. Missing input: reservation rolls back, no sink entry is written.
2. Ledger write failure: output is not created, provenance is not written.
3. Tier violation: recipe is disabled and the audit log records the actor.

## 10. Interaction matrix

CRAFT × ECONOMY: material consumption is a sink. CRAFT × TRADE: output carries provenance for listing.

## 11. Feedback per state change

The HUD names the input facts and the delayed cost before the craft is confirmed.

## 12. Accessibility

Recipe steps are textual; no essential prerequisite is shown by icon only.

## 13. Localization

Recipe and item names are keys; quantities use locale-independent formatting.

## 14. Telemetry and success metric

crafts_per_day, inputs_per_output, tier_distribution, cost_scheduled_count. Success metric: 0 outputs without provenance fact ids.

## 15. Acceptance tests

- GIVEN a recipe and two inputs WHEN craft completes THEN the output names both input fact ids.
- GIVEN an erased input material WHEN craft is attempted THEN it is refused with the fact id.
- GIVEN the tier ledger WHEN an output is written THEN it is at or below the authorized tier.

## 16. Perf budget impact

Craft resolution O(inputs); no work above 1 ms of the 4 ms tick budget.

## 17. Explicit out of scope

No NPC vendor for high-tier goods, no untracked material, no item without a delayed cost.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| W | h | i |
| H | o | w |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields and sourced economy numbers | GDD-004 |
