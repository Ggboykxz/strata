## 2026-11-18T10:00:00Z | netcode-engineer -> all | EVIDENCE

**claim.** PR-N4 is implemented: a bounded tick→world rewind and integer-only shot validation (cooldown, squared
range, grid LOS) on the authoritative world. The client's `claimed` flag is ignored; only the server fires hits.

**evidence** (`docs/state/evidence/20261118T093621Z-PR-N4/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm sim prn4 --assert` | **1** | no `sim` script |
| `01-acc-lagcomp.log` | `pnpm vitest run tools/sim/net/test/prn4.test.ts --reporter=verbose` | 0 | **10/10**, report printed |
| `02-typecheck.log` | `pnpm typecheck` | 0 | strict |
| `03-full-tests.log` | `pnpm test` | 0 | **142/142** (15 files) |
| `04-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock/RNG/transcendental/foreign import |
| `05-verify.log` / `09-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `06-tracer.log` / `07-gdd.log` / `08-blueprint.log` | validators and tracer | 0 | green · 32 modules · 63 tasks |

**measured in the evidence run.** 30 shots: 4 hits, 16 cooldown refusals, 5 LOS blocks, 4 out-of-range, 1 stale
tick. Two identical runs produced identical verdict sequences; the `claimed` flag never changed a verdict.

**what the tests prove.** Bigint squared distance; Bresenham LOS blocked by a wall and clear above it; the 31-frame
ring evicts old ticks; stale/unknown/cooldown/range paths each refuse with a distinct reason; the client claim is
ignored; the fuzz exercises every verdict path and prints a labelled local-only report.

**defects repaired.** `pnpm sim prn4 --assert` could never run (no `sim` script) — tenth broken acc form. Repaired
to the vitest command. B2 then caught that `docs/qa/prototypes/PRN4.md` is qa-engineer-owned; PR-N4 now declares
`co: [qa-engineer]`. Append-only zones still need an ownership declaration. 7 `pnpm test --filter` accs remain.

**docs.** GDD-NETCODE 0.6 → 0.7 (I9): lag-comp rule, 4 sourced/tunable numbers, verdict contract, 2 acceptance
lines. Prototype report at `docs/qa/prototypes/PRN4.md`.

**honest limits.** No network loss/jitter injection, no 30-minute soak, no hit-rate or RTT number. Range and
cooldown are tunables until PR-S1; LOS uses a fixed greybox grid, not a real mesh. No GPU/TPU needed.

**locks.** 6 globs, one sorted commit: netcode-engineer (harness + GDD), orchestrator (blueprint + metrics).
