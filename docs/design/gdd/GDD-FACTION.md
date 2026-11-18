# GDD-FACTION — DRAFT

| field | value |
|---|---|
| id | GDD-FACTION |
| version | 0.2 |
| owner | game-designer |
| status | DRAFT |
| validator | `node scripts/validate-gdd.mjs --template` |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED requires re-signature at the next gate.

## 1. Identity, version, owner, status

ID GDD-FACTION, version 0.2, owner game-designer, status **DRAFT**. Promoted from STUB by PR-S6 with the measured
greybox reputation contract. Standing is derived from immutable facts; no stored bar is edited directly.

## 2. Player-facing outcome

Attributed consequences change faction standing over time. A player can see which facts moved their standing and
why; a hostile faction blocks a switch.

## 3. High Concept link

D6 collective authorship; I1 server truth; facts from GDD-CONSEQUENCE are the only source of standing.

## 4. Deterministic rules

1. Every contribution is an immutable fact `{id, actor, faction, weight, tick}` with an integer weight.
2. Reputation is `sum(weights)` for `(actor, faction)`, clamped to [-100, 100]. No direct write exists.
3. Standing tiers derive from reputation: hostile <= -20, neutral -19..39, allied >= 40.
4. A duplicate fact id is refused; a zero-weight contribution is not a fact.
5. Replaying the fact log must reproduce every reputation value exactly.

## 5. Numbers with source

- reputation domain = -100..100 integer | SOURCE: tools/sim/systems/prs6_faction.ts REPUTATION_MIN/MAX
- standing thresholds = hostile <= -20, allied >= 40 | SOURCE: same module HOSTILE_THRESHOLD / ALLIED_THRESHOLD
- reference run = 1 000 facts, 1 000 reputation changes, 4 standing changes, 4 switches, 4 refusals, replay exact | SOURCE: PR-S6 evidence report
- faction count = 3, actor count = 10 in the greybox harness | SOURCE: same module constants

## 6. State machine

FACT_RECORDED → REPUTATION_DERIVED → STANDING_DERIVED → SWITCH_REQUESTED → SWITCH_ACCEPTED / SWITCH_REFUSED → LOGGED.

## 7. Data contract

`FactionFact{id, actor, faction, weight, tick}` and derived `reputation(actor, faction)`. Fact ids follow the PR-S2
`f-<hash>-<index>` shape. Migration: a changed weight rule creates a new fact id; an old fact is never rewritten.

## 8. Edge cases

1. Two actors choose opposite actions: each reputation is derived from their own attributed facts.
2. Reputation beyond the domain: clamped without changing any source fact.
3. A switch is requested from a hostile faction: refused, reason recorded, membership unchanged.
4. A duplicate fact id arrives: refused, no second contribution.
5. A fact log is replayed after restore: standing matches the pre-restore values exactly.

## 9. Failure states

1. Unknown actor or faction id: fact refused before mutation.
2. Non-integer weight or tick: refused before mutation.
3. Replay mismatch: hard failure, the derived state is not silently repaired.

## 10. Interaction matrix

GDD-FACTION × GDD-CONSEQUENCE: facts are immutable and attributed. GDD-FACTION × GDD-QUEST: a quest resolution
writes a fact that can change standing. GDD-FACTION × GDD-TRADE: standing may gate trade access after GATE:P2.

## 11. Feedback per state change

A standing change is emitted as a token plus the fact id that caused it. A refused switch emits a reason code.
No essential information is carried by colour or motion alone.

## 12. Accessibility

Actor, faction, reputation and standing are emitted as integers and tokens; a renderer must pair them with text.
No essential information depends on motion or colour.

## 13. Localization

Faction names and standing tokens are locale keys; copy lives in UI assets, never in the fact log.

## 14. Telemetry and success metric

`facts`, `reputation_changes`, `standing_changes`, `switches`, `switch_refusals`, `replay_exact`, `deterministic`.
Success: replay reproduces every reputation value and no standing changes without a recorded fact.

## 15. Acceptance tests

- GIVEN 1 000 attributed facts WHEN reputation is derived THEN replay reproduces every value exactly.
- GIVEN hostile standing WHEN a switch is requested THEN it is refused and membership is unchanged.
- GIVEN the same fact log WHEN simulated twice THEN reports are byte-identical.

## 16. Perf budget impact

Reputation derivation is integer arithmetic in the authoritative tick path; no browser frame measure is claimed by
the local harness. The 4 ms core tick budget remains a constraint from master §6.

## 17. Explicit out of scope

No players, no dialogue, no UI, no art, no faction geometry, no balance sign-off, no persistent database. Greybox
only until NET-GATE is passed and art is scheduled (I2/I4).

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| Do these thresholds survive a 4-client 30-minute run? | balance-analyst + qa-engineer | PR-S6 re-measurement |
| How does reputation gate trade or quest access without hiding the fact chain? | economy-designer + narrative | GATE:P2 |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | PR-S6: DRAFT with 19 fields, derived reputation and threshold numbers | game-designer |
