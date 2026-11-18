## 2026-11-18T17:32:00Z | orchestrator -> prototype-engineer | HANDOFF

**claim.** PR-S6 is the last P2-SYS task (deps `[PR-S2]` satisfied). Deliver a deterministic faction/reputation
prototype where standing is **derived from attributed facts**, never an authored bar, and promote GDD-FACTION from
STUB to DRAFT with all 19 fields.

**inputs.** GDD-FACTION (STUB), PR-S2 fact ids and attribution, GDD-CONSEQUENCE fact immutability,
PR-N1/S1/S2/S3/S7/S8 harness pattern.

**expected outputs.** `tools/sim/systems/prs6_faction.ts` + `test/prs6.test.ts`, `docs/qa/prototypes/PRS6.md`,
GDD-FACTION 0.1 STUB → 0.2 DRAFT, PR-S6 acc repaired to a real command, qa-engineer co-owner declared.

**acceptance.** `pnpm vitest run tools/sim/systems/test/prs6.test.ts` · `pnpm test` · `pnpm typecheck` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** integer deltas, deterministic seed, standing derived from facts only, no client-authoritative
reputation, greybox, no art, no GPU/TPU. Labelled local simulation, not a balance sign-off.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T17:32:00Z | orchestrator -> prototype-engineer | PROPOSAL

**attribution.** Every fact carries an actor and a target faction with a signed integer weight. Reputation is the
sum of weights for that actor/faction, clamped to [-100, 100]. Standing tiers derive from thresholds; no stored bar
is edited directly. A fact is immutable, so reprocessing the fact log reproduces the same standing.

**switching.** A faction change is allowed only when the new faction's standing is non-negative; a hostile faction
blocks the switch. Integer ticks only, no wall clock.

**honest limits.** In-memory simulation, no players, no UI, no art, no balance claim. The report says "local greybox
faction prototype — not a balance sign-off".

**ACK** — prototype-engineer, balance-analyst, same process.
