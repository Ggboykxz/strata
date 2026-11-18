## 2026-11-18T16:52:00Z | orchestrator -> prototype-engineer | HANDOFF

**claim.** PR-S3 is the next selectable task (deps `[PR-S2]` satisfied). Deliver a deterministic quest-resolution
prototype: facts derived from the world graph, 3 options, cross-stratum delayed effects, two players retaining
separate fact ids, and no text-only resolution.

**inputs.** GDD-QUEST §4/§5/§7/§8, PR-S2 fact ids and epoch derivation, PR-N1/S1/S2/S7/S8 harness pattern.

**expected outputs.** `tools/sim/systems/prs3_quests.ts` + `test/prs3.test.ts`,
`packages/content/blueprints/quests/proto/` (greybox blueprints), `docs/qa/prototypes/PRS3.md`,
GDD-QUEST version bump, PR-S3 acc repaired to a real command, qa-engineer co-owner declared.

**acceptance.** `pnpm vitest run tools/sim/systems/test/prs3.test.ts` · `pnpm test` · `pnpm typecheck` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** integer ticks, deterministic seed, delayed effects scheduled from the fact tick (never wall time),
FR/EN pairs with 0 untranslated keys, greybox only, no art, no GPU/TPU.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T16:52:00Z | orchestrator -> prototype-engineer | PROPOSAL

**fact-derived.** Availability and resolution are derived from the fact graph; no authored branch bypasses it. A
resolution writes one fact and one delayed consequence in another stratum. Two players choosing different options
both keep their fact ids — no global override (GDD §8.1).

**delay.** The effect is due at `fact_tick + delayTicks` and is applied at that tick from the fact, so a shard
restore reproduces it (GDD §8.2). A text-only change is refused as a T4 defect (GDD §8.3). An erased prerequisite
re-derives the quest from the new world state (GDD §8.4).

**honest limits.** In-memory deterministic prototype, no dialogue renderer, no player, no browser, no art. The
report says "local greybox quest prototype — not a playtest".

**ACK** — prototype-engineer, narrative, same process.
