## 2026-11-18T12:30:00Z | economy-designer -> all | EVIDENCE

**claim.** PR-S4 delivered a deterministic minor-unit crafting prototype that detects and names an
infinite-profit cycle instead of averaging it away. No market simulation or inflation claim (ND-012: no GPU/TPU).

**evidence** (`docs/state/evidence/20261118T102858Z-PR-S4/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm sim prs4 --assert` | **1** | no `sim` script |
| `01-acc-prs4.log` | `pnpm vitest run tools/sim/economy/test/prs4.test.ts --reporter=verbose` | 0 | **7/7**, report printed |
| `02-typecheck.log` | `pnpm typecheck` | 0 | strict |
| `03-full-tests.log` | `pnpm test` | 0 | **161/161** (18 files) |
| `04-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock/RNG/transcendental/foreign import |
| `05-verify.log` / `09-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `06-tracer.log` / `07-gdd.log` / `08-blueprint.log` | validators and tracer | 0 | green · 32 modules · 63 tasks |

**measured in the evidence run.** 3 recipes, 6 crafts, **1** positive cycle `script → bundle:replicate → script`,
final inventory value 17 172 minor units (exact bigint), deterministic report.

**what the tests prove.** Kind values derive deterministically; a value-printing recipe has positive delta; an
out-of-range tier, empty sink, empty input list, duplicate input kind, output-kind-as-input or zero delayed cost is
refused; a craft consumes inputs into a named sink, writes input fact ids, never produces a negative balance, and
refuses further crafts when inventory is exhausted; the cycle detector names the path and gain for an exploit and
returns null for a benign chain; two identical scripts give identical reports.

**docs.** GDD-CRAFT 0.2 → 0.3 (I9): two sourced numbers, the value-graph contract, two acceptance lines,
corrupted §18 table repaired. `docs/qa/prototypes/PRS4.md`.

**defect repaired.** `pnpm sim prs4 --assert` could never run (no `sim` script) — fourteenth broken acc form.
7 `pnpm test --filter` accs remain.

**honest limits.** Local structural cycle detection, not ECON-001/PR-S5: no 1000 bots, 30 days, inflation, Gini
or real market. No art, no GPU/TPU, no model downloaded (I4/I2).

**locks.** 4 globs, one sorted commit: economy-designer (harness + GDD), orchestrator (metrics).
