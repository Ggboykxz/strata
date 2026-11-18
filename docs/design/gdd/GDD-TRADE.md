# GDD-TRADE — DRAFT

| field | value |
|---|---|
| id | GDD-TRADE |
| version | 0.2 |
| owner | economy-designer |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships.

## 1. Identity, version, owner, status

ID GDD-TRADE, version 0.2, owner economy-designer, status **DRAFT**. Derived from VISION v1.0 and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

Players trade across eras, and short-term arbitrage exposes a delayed cost in the era it exploits.

## 3. High Concept link

N4 paradox as regulator; D4 players antagonise their own future.

## 4. Deterministic rules

1. All prices are integer minor units; listings reference a fact id for the goods provenance.
2. A purchase moves units through the double-entry ledger with an idempotency key.
3. Cross-era arbitrage is allowed only when the destination era carries the recorded consequence.

## 5. Numbers with source

- price unit = 1 minor unit; 100 minor = 1 currency unit | SOURCE: GDD-ECONOMY field 7
- listing TTL <= 600 s | TUNABLE 60..3600 s | plan: ECON-001 simulation
- trade fee 1% rounded down in minor units | TUNABLE 0..5% | plan: ECON-001 measured sink
- arbitrage cost delay >= 1 epoch | TUNABLE 1..3 epochs | plan: ECON-001 report

## 6. State machine

LISTED → MATCHED → LEDGER_COMMITTED → FACT_WRITTEN → COST_SCHEDULED → SETTLED → CANCELLED.

## 7. Data contract

trade_listing v1 {listing_id, seller_id, item_id, price_minor, fact_id, expires_tick}; trade_commit v1 {listing_id, buyer_id, idempotency_key, tick}. Migration: new fee schedule creates a new listing version; old listings remain readable.

## 8. Edge cases

1. Two buyers match one listing in one tick: deterministic winner by (offer_tick, buyer_id).
2. Listing expires during a commit: commit wins if it was accepted before the expiry tick.
3. Fee rounds to 0 minor units: listing is still recorded, fee is 0, no implicit charge.
4. Arbitrage into an era without the consequence: trade is refused with a reason code.
5. Idempotency replay after restore: no second transfer (GDD-PERSISTENCE).

## 9. Failure states

1. Ledger commit fails: listing returns to LISTED and the buyer is refunded by the same key.
2. Provenance fact missing: listing is refused; no item without a fact id can be sold.
3. Fee overflow: trade refused and the amount is reported, never wrapped.

## 10. Interaction matrix

TRADE × ECONOMY: fee is a sink. TRADE × CRAFT: crafted items carry provenance facts.

## 11. Feedback per state change

The HUD shows price, fee and the delayed era cost before confirmation; no hidden fee.

## 12. Accessibility

Confirmation dialog exposes all amounts as text; numeric keys are keyboard reachable.

## 13. Localization

Listing labels are keys; minor-unit formatting is locale-independent in the ledger.

## 14. Telemetry and success metric

trades_per_day, fee_minor, cancelled_listings, arbitrage_cost_epochs. Success metric: 0 duplicate transfers under 1000 idempotency replays.

## 15. Acceptance tests

- GIVEN one listing and two buyers WHEN both offer in one tick THEN exactly one commit succeeds.
- GIVEN an arbitrage trade WHEN the destination tick arrives THEN a delayed cost is recorded.
- GIVEN a replayed idempotency key WHEN the ledger restores THEN one transfer exists.

## 16. Perf budget impact

Matching is O(listings in cell); ledger commit within the 4 ms tick budget.

## 17. Explicit out of scope

No float price, no real-money transaction, no auction house without provenance, no NPC vendor for high-tier goods.

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
