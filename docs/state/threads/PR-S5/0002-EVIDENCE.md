## 2026-11-18T12:52:00Z | economy-designer -> all | EVIDENCE

**claim.** PR-S5 ran the compressed 1000-bot × 30-day economy simulation with exact bigint accounting and an
exploit scan. The books balance; the **inflation target fails at 7 264,78 %** and is reported, not tuned away.

**evidence** (`docs/state/evidence/20261118T103750Z-PR-S5/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm sim prs5 --assert` | **1** | no `sim` script |
| `01-acc-prs5.log` | `pnpm vitest run tools/sim/economy/test/prs5.test.ts --reporter=verbose` | 0 | **5/5**, report printed |
| `02-typecheck.log` | `pnpm typecheck` | 0 | strict |
| `03-full-tests.log` | `pnpm test` | 0 | **166/166** (19 files) |
| `04-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock/RNG/transcendental/foreign import |
| `05-verify.log` / `09-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `06-tracer.log` / `07-gdd.log` / `08-blueprint.log` | validators and tracer | 0 | green · 32 modules · 63 tasks |

**measured.** 720 epochs; minted 396 540 940 − burned 322 893 108 = final 73 647 832 minor units exactly;
inflation **726 478 bps** (target ≤ 500 bps → **FAIL**); Gini 80 768 micro; 0 negative balances; 10 replay
refusals on a 10-key sample; 1 value-printing cycle named `script → bundle:economy-replicate → script`;
checksum `080bf7af`; deterministic across two runs.

**honest interpretation.** Accounting is correct; the faucet/sink design is not. GDD-ECONOMY §8.4 requires the
rate to be flagged TUNABLE rather than silently retuned. The retune is an economy-design decision with a measured
sink, not an agent fix to make a gate pass. Gini is recorded, never asserted against the tunable band.

**docs.** GDD-ECONOMY 0.2 → 0.3 (I9): measured inflation/Gini/conservation, compressed-epoch contract, three
acceptance lines, corrupted §18 table repaired. Report at `docs/qa/prototypes/ECONOMY_REPORT.md`.

**defect repaired.** `pnpm sim prs5 --assert` could never run (no `sim` script) — fifteenth broken acc form.
`co: [qa-engineer]` was declared up front for the append-only report, avoiding the earlier O3/B2 CI failures.
7 `pnpm test --filter` accs remain.

**limits.** Compressed hourly epochs, not a 30 Hz replay; no real market, players, faction dynamics or network;
no GPU/TPU, no art, no model downloaded.

**locks.** 4 globs, one sorted commit: economy-designer (harness + GDD), orchestrator (metrics).
