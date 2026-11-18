# GDD-WORLD-SIM — DRAFT

| field | value |
|---|---|
| id | GDD-WORLD-SIM |
| version | 0.2 |
| owner | game-designer |
| status | DRAFT |
| validator | `node scripts/validate-gdd.mjs --template` |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED requires re-signature at the next gate.

## 1. Identity, version, owner, status

ID GDD-WORLD-SIM, version 0.2, owner game-designer, status **DRAFT**. Promoted from STUB by PR-S7 with the
measured greybox world-tick contract. The simulated graph is authoritative on the server (I1).

## 2. Player-facing outcome

Over-harvest in one era produces visible Rouille damage in a later era. The causal chain is replayable from the
fact log; an already-erased node is never erased twice.

## 3. High Concept link

I1 server truth; D1 time is a system; visible consequences survive across eras.

## 4. Deterministic rules

1. The tick is the only clock. No wall time, no float, no unseeded randomness.
2. Over-harvest reduces an integer amount and writes one fact when the amount reaches the threshold.
3. Rouille spawns in a later era, erases at most one node per tick, and propagates to at most two neighbours.
4. Propagation stops at `cascadeBoundTicks`; later facts are recorded but do not erase (GDD-ECONOMY §8.5).
5. An erase on an already-erased node writes no second fact (GDD-ECONOMY §8.3).

## 5. Numbers with source

- cascade bound = 12 ticks | SOURCE: tools/sim/world/prs7_worldtick.ts CASCADE_BOUND_TICKS
- propagation fan-out = 2 neighbours per erase | SOURCE: same module MAX_NEIGHBOURS
- over-harvest threshold = 10 minor units | SOURCE: same module OVER_HARVEST_THRESHOLD
- greybox graph = 12 nodes over 3 eras | SOURCE: same module constructor
- reference run = 12 facts, 12 erases, last active tick 10, 9 duplicate-erase refusals | SOURCE: PR-S7 evidence report

## 6. State machine

IDLE → OVER_HARVEST → FACT_WRITTEN → ROUILLE_SPAWN → NODE_ERASED → CASCADE → BOUNDED → MEASURED.

## 7. Data contract

`WorldNode{id, era, amount, neighbours[], erased}` and `RouilleFact{id, tick, era, nodeId}` with integer fields.
Fact ids follow the PR-S2 `f-<hash>-<tick>` shape. Migration: a changed amount rule creates a new fact id; an old
fact is never rewritten.

## 8. Edge cases

1. Over-harvest on an unknown or erased node: refused, no fact.
2. Request larger than the remaining amount: refused, no partial debit.
3. Two spawns target the same node: the first erase wins; the second increments the duplicate-erase counter and writes no fact.
4. A spawn is due after the bound: recorded as dropped, no erase.
5. A node in era 3 spawns into era 1: the later era is `(era % 3) + 1`, never an absent era.

## 9. Failure states

1. Cascade exceeds the bound: stop propagation, emit `dropped_after_bound` in the report.
2. Node graph is smaller than 3 nodes: constructor raises `RangeError`, no simulation starts.
3. Non-integer units or tick: refused before any state change.

## 10. Interaction matrix

GDD-WORLD-SIM × GDD-ECONOMY: over-harvest writes the fact that schedules Rouille. GDD-WORLD-SIM ×
GDD-CONSEQUENCE: fact ids come from the PR-S2 propagation contract. GDD-WORLD-SIM × GDD-STRATA: node layout uses
the 2 m grid and 64 m cells; no real terrain in this prototype.

## 11. Feedback per state change

A node erase is visible as a greybox state change and a `RouilleFact` in the log. A duplicate erase produces a
counter, not a second visual event. No essential information is carried by colour alone.

## 12. Accessibility

Era and node state are emitted as integers and tokens in the report; a renderer must pair them with text labels.
No essential information depends on motion or colour.

## 13. Localization

Era names and node states are tokens; locale copy lives in UI assets, never in the graph.

## 14. Telemetry and success metric

`facts`, `erases`, `dropped_after_bound`, `double_erase_refusals`, `last_active_tick`, `deterministic`.
Success: cascade terminates at or before tick 12 and every erase has exactly one fact.

## 15. Acceptance tests

- GIVEN an over-harvest act WHEN it resolves THEN one Rouille fact affects a later era.
- GIVEN a cascade WHEN 16 ticks pass THEN the last active tick is <= 12 and no node is erased twice.
- GIVEN the same seed and acts WHEN simulated twice THEN the reports are byte-identical.

## 16. Perf budget impact

World-chain work stays off the render thread in production. No browser tick measure is claimed by the local
greybox harness; the 4 ms core tick budget remains a constraint from master §6.

## 17. Explicit out of scope

No terrain mesh, no texture bake, no scene generation, no browser renderer, no AI model, no audio. Greybox only
until NET-GATE is passed and art is scheduled (I2/I4).

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| Are 12 ticks and 2 neighbours the right bounds at 30 Hz under a real 4-client load? | gameplay-engineer + qa-engineer | PR-S7 re-measurement |
| How does a bounded cascade map to the 64 m cell streaming contract? | environment-artist | GB-001 follow-up |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | PR-S7: DRAFT with 19 fields, bounded cascade numbers and acceptance | game-designer |
