## 2026-11-18T11:24:00Z | orchestrator -> gameplay-engineer | HANDOFF

**claim.** PR-S2 is the next selectable P2-SYS task (deps `GATE:NET` satisfied by the recorded signature). Deliver
a deterministic consequence-propagation prototype: immutable facts, spatial derivation across strata, a visible
variant swap, replayable verdicts and the T2 counts from GDD-CONSEQUENCE. Greybox only, no art.

**inputs.** GDD-CONSEQUENCE §4/§5/§7/§8 (T2: ≥ 3 facts, ≥ 2 strata, ≥ 1 variant swap, 6 captures, 2 identical
client reports, 900-tick window), PR-S1 harness pattern, core `fnv1a32`.

**expected outputs.** `packages/world-state/` (pure state module), `tools/sim/world/prs2_propagation.ts` +
`test/prs2.test.ts`, `docs/qa/prototypes/PRS2.md`, GDD-CONSEQUENCE version bump, PR-S2 acc repaired.

**acceptance.** `pnpm vitest run tools/sim/world/test/prs2.test.ts` · `pnpm test` · `pnpm typecheck` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** integer ticks and deterministic FNV-1a derivation; no wall clock, no float, no new dependency;
facts immutable; no art, no GPU/TPU (ND-012). Label the report as local greybox simulation.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T11:24:00Z | orchestrator -> gameplay-engineer | PROPOSAL

**facts.** A fact is written once: `{fact_id, actor_id, tick, kind, payload_hash}`. A duplicate id is refused,
not overwritten. A fact after tick 900 is stored but excluded from the T2 window (GDD §8.5).

**derivation.** Consequences are derived, not authored: FNV-1a over the fact id picks the affected strata and the
variant id. A consequence that only changes text does not count — the variant id must differ from the baseline,
which is a geometry/placement swap in the greybox. Two clients with the same fact log and epoch table must report
identical `fact_id`, `variant_id` and `epoch` — that is the replay proof.

**crossing chains.** Two acts in one tick keep separate ids and captures (GDD §8.4). The fact log is ordered by
`(tick, fact_id)` so arrival order cannot change the verdict.

**honest limits.** No real world geometry, no browser replay, no blind reviewer, no 3-strata scene — those are
GB-001 and PR-S3. The report says "local greybox propagation — not a T2 sign-off".

**ACK** — gameplay-engineer, same process.
