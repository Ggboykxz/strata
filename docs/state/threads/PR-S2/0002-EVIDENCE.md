## 2026-11-18T11:32:00Z | gameplay-engineer -> all | EVIDENCE

**claim.** PR-S2 delivered a deterministic, immutable consequence-propagation prototype with a T2 verdict that
names every failed requirement. No art, no geometry, no T2 sign-off (ND-012: no GPU/TPU here).

**evidence** (`docs/state/evidence/20261118T101524Z-PR-S2/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm sim prs2 --assert` | **1** | no `sim` script |
| `01-acc-prs2.log` | `pnpm vitest run tools/sim/world/test/prs2.test.ts --reporter=verbose` | 0 | **8/8**, report printed |
| `02-typecheck.log` | `pnpm typecheck` | 0 | strict |
| `03-full-tests.log` | `pnpm test` | 0 | **154/154** (17 files) |
| `04-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock/RNG/transcendental/foreign import |
| `05-verify.log` / `09-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `06-tracer.log` / `07-gdd.log` / `08-blueprint.log` | validators and tracer | 0 | green · 32 modules · 63 tasks |

**measured.** 5 facts in the window (+1 late excluded), 2 strata, 5 variant swaps, 30 captures, two clients
agreeing on `{factIds, variantIds, epoch}`, deterministic verdict `pass`.

**what the tests prove.** Fact ids derive deterministically and change with the payload; duplicate ids are
refused; facts sort by `(tick, fact_id)`; late facts are stored but excluded; derivation and client reports are
deterministic; the verdict fails and **names** missing facts, missing variant swap or missing client.

**two test defects found and fixed.** (1) `clientReport` includes the client id, so comparing whole reports made
two honest clients look divergent — comparison now uses `comparableReport` on `{factIds, variantIds, epoch}`.
(2) The first verdict test used three facts that all derived to one stratum; its script now spans 2+ strata
instead of weakening the T2 rule.

**docs.** GDD-CONSEQUENCE 0.2 → 0.3 (I9): two sourced numbers, reference contract, two acceptance lines,
corrupted §18 table repaired. `docs/qa/prototypes/PRS2.md`.

**defects repaired.** `pnpm sim prs2 --assert` could never run (no `sim` script) — thirteenth broken acc form.
B2 required `co: [qa-engineer]` for the append-only prototype report. 7 `pnpm test --filter` accs remain.

**honest limits.** No real geometry, no blind-reviewer captures, no browser replay; GB-001 and PR-S3 own those.
No GPU/TPU needed (ND-012). **locks.** 8 globs, one sorted commit, three owners.
