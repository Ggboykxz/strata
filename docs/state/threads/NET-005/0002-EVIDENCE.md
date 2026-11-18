## 2026-11-18T08:55:00Z | animation-director -> all | EVIDENCE

**claim.** NET-005 is implemented: a deterministic, server-authoritative anim state machine in core plus a
validated clip-event manifest and its published JSON Schema. No clip, rig or texture was generated (I2/I4).

**evidence** (`docs/state/evidence/20261118T083402Z-NET-005/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm test --filter @strata/core -t animstate` (blueprint's old acc) | **1** | `CACError: Unknown option --filter` |
| `00b-acc-t-false-pass.log` | `pnpm vitest run packages/core -t animstate` | **0** | **3 files skipped, 41 tests skipped** — a false pass |
| `01-acc-anim.log` | `pnpm vitest run packages/core/test/anim-state.test.ts` | 0 | **22/22** |
| `02-typecheck.log` | `pnpm typecheck` | 0 | strict, no error |
| `03-full-tests.log` | `pnpm test` | 0 | **73/73** (7 files) |
| `04-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock · 0 RNG · 0 transcendental · 0 foreign import |
| `05-verify.log` | `pnpm verify` | 0 | **17/17** |
| `06-gdd.log` | `node scripts/validate-gdd.mjs` | 0 | 32 modules |
| `07-blueprint.log` | `node scripts/validate-blueprint.mjs` | 0 | 63 tasks, 12 declared warnings |
| `08-tracer.log` | `pnpm tracer --assert` | 0 | equal hashes, desync rejected |
| `09-schema-consistency.log` | `pnpm vitest run … -t "JSON Schema"` | 0 | schema enums match the code |

**the acceptance trap got worse, and it was caught.** Repairing `pnpm test --filter … -t animstate` to
`pnpm vitest run packages/core -t animstate` still exits **0** while skipping all 41 tests: the pattern
`animstate` matches no test name (the describe block is "animation state machine", with spaces). `passWithNoTests:
false` does not help because files were found. The acc now names the **file**:
`pnpm vitest run packages/core/test/anim-state.test.ts`. General rule: an acceptance command must name a
path, or a `-t` pattern proven to match at least one test. Both failing/zero-match forms are logged.

**what the tests actually prove.**
- The checked-in greybox manifest loads; a duplicate id, a looping action, a non-looping locomotion, an event
  past the clip and an unordered event pair are each refused.
- IDLE → TRANSITIONING → LOCOMOTION at the blend tick; ACTION → RECOVERY at `transitionTick + duration`;
  RECOVERY → IDLE three ticks later. An action shorter than the blend enters RECOVERY directly.
- A request during ACTION is refused (`busy`); during RECOVERY it is queued and applied on the last recovery
  tick; the tie-break keeps the smallest `(sequence, clipId)`.
- Unknown clip, wrong archetype, non-increasing sequence and malformed requests are refused with a reason
  and leave the runtime untouched. A new clip may replace the blend; `advanceAnim` does not mutate input.
- A hit event fires at the absolute tick the server schedules; the published JSON Schema's enums and required
  fields match the TypeScript validator.

**GDD.** `GDD-ANIM-ARCHITECTURE` 0.2 → 0.3 (I9): full state table with exit conditions, 12-byte contract,
5 sourced/tunable numbers, queue and tie-break edge cases, schema acceptance. Two pre-existing doc defects
were repaired: stub §18 open-questions table (`| W | h | i |`) replaced with the real hit-frame ownership
question, and the changelog's missing rows were left missing rather than invented (0.3 row added only).

**honest limits.** No GLB, no bones, no retarget proof, no foot-slide number, no wire codec (NET-006), no
hit-frame reconciliation, no server rooms (NET-003). Tick p95 and foot slide stay unmeasured.

**parallel branch, not part of this task.** The Director asked about the dashboard; PR #2
(`session/20261118-dashboard-truth`) repairs its hardcoded false values on a separate branch based on the
session head, with its own locks and evidence. Nothing from it is mixed into NET-005.

**locks.** 11 globs, one sorted commit on `state/locks`: animation-director (state machine, content, GDD),
gameplay-engineer (core export, test, tsconfig), orchestrator (blueprint + generated gates).
