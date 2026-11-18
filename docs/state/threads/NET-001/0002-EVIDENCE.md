## 2026-11-18T08:12:00Z | gameplay-engineer -> all | EVIDENCE

**claim.** NET-001 is implemented: an integer-only, clock-free tick with canonical intent ordering, a
bounded (tick → hash) history, and a headless host that applies validated intents and answers an ack at the
tick it names. TRACER-001 remains green.

**evidence** (`docs/state/evidence/20261118T081128Z-NET-001/`)

| log | command | exit | result |
|---|---|---|---|
| `01-acc-core.log` | `pnpm vitest run packages/core` | 0 | **19/19** |
| `02-server-sim.log` | `pnpm vitest run apps/server` | 0 | **8/8** |
| `03-typecheck.log` | `pnpm typecheck` | 0 | strict, no error |
| `04-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock · 0 unseeded RNG · 0 transcendental · 0 foreign import |
| `05-full-tests.log` | `pnpm test` | 0 | **29/29** (5 files) |
| `06-verify.log` | `pnpm verify` | 0 | **17/17** |
| `07-gdd.log` | `node scripts/validate-gdd.mjs` | 0 | 32 modules |
| `08-blueprint.log` | `node scripts/validate-blueprint.mjs` | 0 | 63 tasks, 12 declared warnings |
| `09-tracer.log` | `pnpm tracer --assert` | 0 | equal hashes, desync rejected, capsule rendered |
| `00-acc-as-written.log` | `pnpm test --filter @strata/core` | **1** | see the defect below |

**the acceptance command in the blueprint was broken.** `pnpm test --filter @strata/core` forwards
`--filter` to vitest, which has no such flag: `CACError: Unknown option --filter`, exit 1. **Eleven other
accs** still carry the same form (`@strata/netcode`, `@strata/server -t reconnect`, `@strata/security`,
`@strata/persist`, `@strata/a11y`, `@strata/perf`, `@strata/anim`, `@strata/moderation`, `@strata/protocol`,
`-t animstate` twice). NET-001's acc is repaired to `pnpm vitest run packages/core`; the rest are a named
follow-up, not silently ignored. Note the inverse trap: `pnpm --filter <pkg> test` exits **0** without
running anything when the package has no `test` script — a silent false pass. Neither form may be used.

**what the tests actually prove.**
- 300 ticks with the same seed and script produce the same hash sequence; a different seed does not.
- Shuffling the commands of one tick yields the same hash — arrival order cannot change state.
- A replayed seq does not move an entity; an unknown entity and a seq of 0 are dropped.
- `stepWorld` does not mutate its input; the state is a value.
- The bound clamps the position and zeroes the velocity on the same tick.
- `toWireMm` refuses a fraction and an int32 overflow (`QuantizationError`); `metresToMm` rounds half away
  from zero.
- `hashWorld` refuses an unsorted or non-integer state instead of hashing garbage.
- `HashRing`: `ok` / `desync` / `unknown`, eviction at capacity, `unknown ≠ ok`.

**GDD.** `GDD-NETCODE` 0.2 → 0.3 (I9): rule 4 (integer-only, canonical order, replay drop), two §5 numbers
(quantization bound SOURCED from the code as a *format* bound; hash ring 128 ticks TUNABLE 64..256 with the
NET-004 measurement plan), a §7 note that `appliedSeq` is per entity, and a changelog row.

**honest limits.** No wire, no prediction, no AoI, no rooms, no perf number. Tick p95 ≤ 25 ms is still
UNMEASURED and stays a NET-006 number; nothing here may be quoted as throughput. The host is single-world and
single-process by design.

**locks.** 8 globs, one sorted commit on `state/locks`: gameplay-engineer (5 paths), netcode-engineer (GDD),
orchestrator (blueprint + generated gates).
