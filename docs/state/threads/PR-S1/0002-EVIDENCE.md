## 2026-11-18T11:12:00Z | gameplay-engineer -> all | EVIDENCE

**claim.** PR-S1 delivered a deterministic greybox combat math prototype: TTK, attack windows and hit-stop as
integer ticks with a labelled local report. No art, no asset, no playtest claim (ND-012: no GPU/TPU here).

**evidence** (`docs/state/evidence/20261118T100756Z-PR-S1/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm sim prs1 --assert` | **1** | no `sim` script |
| `01-acc-prs1.log` | `pnpm vitest run tools/sim/world/test/prs1.test.ts --reporter=verbose` | 0 | **4/4**, report printed |
| `02-typecheck.log` | `pnpm typecheck` | 0 | strict |
| `03-full-tests.log` | `pnpm test` | 0 | **146/146** (16 files) |
| `04-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock/RNG/transcendental/foreign import |
| `05-verify.log` / `09-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `06-tracer.log` / `07-gdd.log` / `08-blueprint.log` | validators and tracer | 0 | green · 32 modules · 63 tasks |

**measured.** 100 HP / 25 damage → 4 hits; 11-tick cycle; **36 ticks = 1 200 ms** TTK; 8-tick hit-stop = 267 ms.
Illegal windows (windup 0, active 0, negative recovery, short interval, zero damage, non-integer damage,
hit-stop above the 30-tick cap) are refused with `RangeError`; nothing is clamped. Two identical runs give the
same report.

**docs.** GDD-COMBAT 0.2 → 0.3 (I9): three sourced numbers, the integer window contract, two acceptance lines,
corrupted §18 table repaired. Prototype report at `docs/qa/prototypes/PRS1.md`.

**defects repaired.** `pnpm sim prs1 --assert` could never run (no `sim` script) — twelfth broken acc form.
Repaired to the vitest command. B2 caught that the append-only prototype report belongs to qa-engineer; PR-S1 now
declares `co: [qa-engineer]`. 7 `pnpm test --filter` accs remain.

**honest limits.** Local math, not a playtest or FUN sign-off; 4 ms core budget not measured here; no art/VFX/audio;
no GPU/TPU (ND-012). TTK feel stays a PR-S2 playtest question.

**locks.** 6 globs, one sorted commit: gameplay-engineer (harness), game-designer (GDD), orchestrator
(blueprint + metrics).
