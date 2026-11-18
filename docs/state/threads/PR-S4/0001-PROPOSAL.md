## 2026-11-18T12:14:00Z | orchestrator -> economy-designer | HANDOFF

**claim.** PR-S4 is the next selectable sig task (deps `PR-N3` satisfied). Deliver a deterministic crafting-chain
prototype with **infinite-profit cycle detection**, all money as bigint minor units (D150), provenance fact ids and
a tier guard (GDD-CRAFT). No art, no GPU/TPU.

**inputs.** GDD-CRAFT §4/§5/§7/§8 (2..8 inputs, ≤3-tick craft, tier ≤4, provenance ≥1 fact), PR-N3 ledger
(zero-sum minor units), PR-S2 fact ids, PR-N1/N3 harness pattern.

**expected outputs.** `tools/sim/economy/prs4_craft.ts` + `test/prs4.test.ts`, `docs/qa/prototypes/PRS4.md`,
GDD-CRAFT version bump, PR-S4 acc repaired to a command that exists.

**acceptance.** `pnpm vitest run tools/sim/economy/test/prs4.test.ts` · `pnpm test` · `pnpm typecheck` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** bigint minor units only; a positive-value cycle is detected and refused, not averaged away;
no new dependency; report labelled local greybox economy, not an ECON-001 result; no art (I2/I4).
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T12:14:00Z | orchestrator -> economy-designer | PROPOSAL

**value graph.** Each recipe is a directed edge from its input bundle to its output bundle. Edge weight is
`outputValue - inputValue` in bigint minor units, with values derived deterministically from item kinds
(FNV-1a), not remembered prices. A Bellman-Ford style relaxation over a fixed node count detects a **positive
cycle** — the infinite-profit exploit — and returns the cycle path so it can be named, not just a boolean.

**conservation.** A craft consumes inputs through a named sink and writes an output fact carrying its input fact
ids (GDD §4.1/4.2). A recipe whose output exceeds its inputs without a documented sink is flagged before it can
enter a chain. Tier above 4 is refused without silent downgrade (GDD §8.3).

**determinism.** Recipes and items are processed in sorted id order. Two crafters reserving the same material in
one tick resolve by `(tick, actor_id)` (GDD §8.2). A mid-craft restore resumes from the reserved-input fact, never
wall time (GDD §8.5).

**honest limits.** No 1000-bot 30-day simulation (ECON-001/PR-S5), no inflation/Gini number, no real market.
This is structural cycle detection on a local script; the label says so.

**ACK** — economy-designer, same process.
