# GDD-CONSEQUENCE — DRAFT

| field | value |
|---|---|
| id | GDD-CONSEQUENCE |
| version | 0.3 |
| owner | game-designer |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships.

## 1. Identity, version, owner, status

ID GDD-CONSEQUENCE, version 0.3, owner game-designer, status **DRAFT**. Derived from VISION v1.0 and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

One player act lands at least three attributed facts in two strata within 900 ticks, and any observer can replay the chain.

## 3. High Concept link

T2 is the blocking demo: 1 act, <=900 ticks, >=3 facts, >=2 strata, >=1 physical variant, 6 captures.

## 4. Deterministic rules

1. A fact is immutable: fact_id, actor_id, tick and payload_hash are written once.
2. Propagation is spatial and derived; a consequence that only changes text does not satisfy T2.
3. The causal chain is replayable from the fact log by any client with the same epoch table.

## 5. Numbers with source

- 900 ticks maximum = 30 s at 30 Hz | SOURCE: master §1.4 T2
- >= 3 facts, >= 2 strata, >= 1 variant swap | SOURCE: master T2
- 6 before/after captures per replay | SOURCE: master T2
- 2 clients must report identical fact_id, variant_id and epoch | SOURCE: master T2 / D137
- fact id and consequence derivation = FNV-1a over immutable fact fields | SOURCE: packages/world-state/src/index.ts (PR-S2)
- variant ids = 1..4 over 3 strata, baseline 0 | SOURCE: packages/world-state/src/index.ts deriveConsequence; a text-only change does not satisfy T2

## 6. State machine

ACT → FACTS_WRITTEN(3+) → PROPAGATED(2+ strata) → VARIANT_SWAPPED → CAPTURED(6) → VERDICT.

## 7. Data contract

fact v1 {fact_id, actor_id, tick, kind, payload_hash}; consequence v1 {fact_id, stratum_id, variant_id, epoch, capture_ids[]}. Migration: a changed payload_hash creates a new fact id, never rewrites an old one.

PR-S2 reference implementation: `packages/world-state/` holds the immutable `FactLog`, the deterministic `deriveConsequence`, the per-client `ClientReport` and the `t2Verdict`. Client agreement is compared on `{factIds, variantIds, epoch}` only — the `client` id is not part of the proof. Facts are stored even after tick 900 but excluded from the replay window.

## 8. Edge cases

1. One act produces only 2 facts: T2 fails and the verdict names the missing fact.
2. A consequence lands in 3 strata but changes no geometry: T2 fails the variant requirement.
3. A blind reviewer cannot infer the chain from captures: the demo is rejected even if hashes match.
4. Two acts in one tick produce crossing chains: each chain keeps its own fact ids and captures.
5. A fact is written after tick 900: it is recorded but not counted in this replay.

## 9. Failure states

1. Chain not replayable: verdict fails with the first fact id that cannot be resolved.
2. Attribution missing: the fact is refused at write time, not repaired later.
3. Capture files missing: the demo cannot be signed at GATE:P2.

## 10. Interaction matrix

CONSEQUENCE × STRATA: variants are the physical proof. CONSEQUENCE × QUEST: resolutions must create facts.

## 11. Feedback per state change

The demo emits six numbered captures and a verdict line; no adjective is used as evidence.

## 12. Accessibility

Captures carry textual alt descriptions of the physical change, not only images.

## 13. Localization

Capture labels are keys; fact and variant ids are locale-independent.

## 14. Telemetry and success metric

facts_per_act, strata_affected, variant_swaps, capture_count, reviewer_inference_ok. Success metric: T2 passes with two equal-hash clients.

## 15. Acceptance tests

- GIVEN one act WHEN 900 ticks pass THEN >=3 facts land in >=2 strata with >=1 variant swap.
- GIVEN six captures WHEN a blind reviewer reads them THEN the causal chain is inferred.
- GIVEN two clients WHEN the replay runs THEN fact_id, variant_id and epoch are identical.

- GIVEN an immutable fact script WHEN derived on two clients THEN fact_id, variant_id and epoch reports are byte-identical.
- GIVEN fewer than 3 facts, fewer than 2 strata, no geometry variant swap or one client WHEN verdict is computed THEN it fails and names the requirement.

## 16. Perf budget impact

Propagation completes within the 900-tick budget; no chain work on the render thread; captures are generated off the tick path.

## 17. Explicit out of scope

No text-only consequence, no pre-authored epoch change, no single-client-only demo.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| Can a blind reviewer infer the chain from the 6 captures in this greybox form? | qa-engineer + narrative | PR-S3 replay |
| What real geometry swap does variant_id 1..4 map to in Oakhollow? | level-designer | GB-001 |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields, T2/T4 numbers and sources | GDD-003 |
| 0.3 | 2026-11-18 | PR-S2: immutable facts, FNV derivation, T2 verdict contract | gameplay-engineer |
