# GDD-ECONOMY — DRAFT

| field | value |
|---|---|
| id | GDD-ECONOMY |
| version | 0.2 |
| owner | economy-designer |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships.

## 1. Identity, version, owner, status

ID GDD-ECONOMY, version 0.2, owner economy-designer, status **DRAFT**. Derived from VISION v1.0 and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

A player can see where currency enters and leaves the world, and over-harvest in one era penalises a later one.

## 3. High Concept link

N4 paradox as economic regulator; D4 optimal short-term play degrades a later stratum.

## 4. Deterministic rules

1. Every currency unit is created by a named faucet and removed by a named sink; no implicit mint exists.
2. Amounts are integer minor units; the ledger is double-entry and idempotent (GDD-PERSISTENCE).
3. Over-harvest writes a fact that spawns Rouille and erases nodes in another era.

## 5. Numbers with source

- simulation: 1000 bots x 30 days | SOURCE: master §7 economy sim
- inflation target <= 5% over 30 simulated days | TUNABLE 0..15% | plan: ECON-001 measured run
- Gini coefficient recorded, not asserted | TUNABLE 0.20..0.60 | plan: ECON-001 report
- currency amounts are integer minor units | SOURCE: master §6 double-entry ledger

## 6. State machine

FAUCET_MINT → LEDGER_ENTRY → SINK_BURN → FACT_WRITTEN → ROUILLE_SPAWN → ERA_EFFECT → MEASURED.

## 7. Data contract

faucet v1 {id, amount_minor, actor_id, tick, fact_id}; sink v1 {id, amount_minor, fact_id}. Tables live in packages/content/economy/{faucets,sinks}.yaml. Migration: a changed rate creates a new id, never rewrites history.

## 8. Edge cases

1. Two faucets fire in one tick: order is by (tick, faucet_id), both entries are kept.
2. Sink exceeds available balance: transaction refused, reason code recorded.
3. Rouille spawns in an era whose node was already erased: no second erase, one fact only.
4. Simulated inflation above target: faucet rate is flagged TUNABLE, not silently changed.
5. Ledger idempotency key replayed after restore: no second entry (GDD-PERSISTENCE).

## 9. Failure states

1. Ledger imbalance: shard refuses clients and names the entry id.
2. Unnamed faucet: transaction refused; no currency enters the world.
3. Simulation missing: inflation and Gini print NOT COMPUTABLE instead of a guess.

## 10. Interaction matrix

ECONOMY × CRAFT: craft is a sink. ECONOMY × TRADE: prices cross eras with integer minor units.

## 11. Feedback per state change

The HUD overlay shows faucet and sink names with amounts; no hidden mint is possible.

## 12. Accessibility

Currency deltas are textual with sign; colour is never the only indicator.

## 13. Localization

Faucet and sink names are keys; minor-unit formatting is locale-independent in the ledger.

## 14. Telemetry and success metric

minted_minor, burned_minor, inflation_pct, gini, exploit_cycles. Success metric: zero ledger drift over 1000 bots x 30 days.

## 15. Acceptance tests

- GIVEN every mint in the ledger WHEN summed against sinks THEN drift is 0 minor units.
- GIVEN 1000 bots over 30 days WHEN the sim runs THEN inflation and Gini are reported with a source.
- GIVEN an over-harvest act WHEN it resolves THEN one Rouille fact affects another era.

## 16. Perf budget impact

Ledger verification O(n) over entries; no economy work above 1 ms of the 4 ms tick budget.

## 17. Explicit out of scope

No float currency, no implicit mint, no unmeasured inflation number, no commercial IP pricing model.

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
