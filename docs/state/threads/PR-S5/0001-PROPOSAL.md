## 2026-11-18T12:46:00Z | orchestrator -> economy-designer | HANDOFF

**claim.** PR-S5 is the next sig task (deps `PR-S4` satisfied). Deliver the 1000-bot × 30-day economy simulation
with measured inflation and Gini, plus an exploit scan reusing PR-S4's cycle detector. CPU-only, deterministic, no
art and no GPU/TPU (ND-012).

**inputs.** GDD-ECONOMY §4/§5/§8 (≤5% inflation target, Gini recorded not asserted, named faucets/sinks, integer
minor units), PR-S4 cycle detection, PR-N3 ledger rules, PR-N1 harness pattern.

**expected outputs.** `tools/sim/economy/prs5_economy.ts` + `test/prs5.test.ts`,
`docs/qa/prototypes/ECONOMY_REPORT.md`, GDD-ECONOMY version bump, PR-S5 acc repaired.

**acceptance.** `pnpm vitest run tools/sim/economy/test/prs5.test.ts` · `pnpm test` · `pnpm typecheck` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** no float in money math; deterministic from a fixed seed; compressed hourly epochs labelled as
such (not a 77.76M tick replay); a value-printing exploit is reported, never averaged away; no invented number.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T12:46:00Z | orchestrator -> economy-designer | PROPOSAL

**compression.** 30 days × 24 hourly epochs = 720 epochs, each applying one deterministic action per bot. The
30 Hz simulation tick is not replayed: 77.76M ticks × 1000 bots is not a unit test, and pretending otherwise
would be a false claim. The report header says "compressed hourly epochs, not a 30 Hz replay".

**accounting.** Every currency unit comes from a named faucet and leaves through a named sink (GDD §4.1).
Balances and totals are bigint minor units; `minted - burned == Σbalances` is an invariant checked at the end.
No negative balance is allowed; a sink that exceeds a balance is refused with a reason (GDD §8.2).

**measurements.** Inflation in basis points from initial/final supply; Gini in micro units via integer weighted
sums, **recorded, not asserted** against the tunable band. Reject idempotency-key replays. Reuse PR-S4
`detectProfitCycle` and add a known value-printing recipe to the scan; report the named cycle if found.

**honest limits.** No real market, no players, no 30 Hz replay, no network. This is a structural economy sim;
the label says so. Any metric not computed is NOT COMPUTABLE with a reason.

**ACK** — economy-designer, same process.
