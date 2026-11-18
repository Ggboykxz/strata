## 2026-11-18T15:30:00Z | orchestrator -> gameplay-engineer | HANDOFF

**claim.** PR-S7 is the next selectable sig task in P2-SYS (deps `[PR-S2]` satisfied). Deliver a deterministic world
tick with a **bounded** Rouille cascade: over-harvest writes a fact that spawns Rouille and erases nodes in another
era, but the cascade must terminate within a stated tick bound and never erase a node twice.

**inputs.** GDD-WORLD-SIM (currently STUB — promote to DRAFT with the measured contract), GDD-ECONOMY §4.3/§8.3,
PR-S2 fact ids and epoch derivation, PR-N1/S1/S2 harness pattern.

**expected outputs.** `tools/sim/world/prs7_worldtick.ts` + `test/prs7.test.ts`, `docs/qa/prototypes/PRS7.md`,
GDD-WORLD-SIM 0.1 STUB → 0.2 DRAFT (19 fields), PR-S7 acc repaired to a real command, co-owner declared.

**acceptance.** `pnpm vitest run tools/sim/world/test/prs7.test.ts` · `pnpm test` · `pnpm typecheck` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** integer ticks, fixed seed, no wall clock, no float; one erase per node per epoch (GDD §8.3);
cascade bound stated and enforced; greybox only, no art, no GPU/TPU.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T15:30:00Z | orchestrator -> gameplay-engineer | PROPOSAL

**world graph.** A fixed set of nodes per era, each with an integer amount and an `erased` flag. The tick is the
only clock. An over-harvest act writes a fact (PR-S2 style id) that schedules a Rouille spawn in a later era.

**bounded cascade.** Each spawned Rouille erases at most one node per tick and propagates to at most two neighbours.
A `cascadeBoundTicks` constant stops propagation: facts after the bound are recorded but do not erase (matching
GDD-ECONOMY §8.5's "after tick 900 recorded but not counted"). Erasing an already-erased node writes no second
fact. The report names the bound, the facts spawned, erases and the last active tick.

**honest limits.** In-memory graph, no real terrain, no browser, no AI model, no art, no 30 Hz replay. The label
says "local greybox world tick — not a world demo".

**ACK** — gameplay-engineer, same process.
