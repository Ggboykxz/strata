# GDD-CORE — DRAFT

| field | value |
|---|---|
| id | GDD-CORE |
| version | 0.2 |
| owner | game-designer |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships.

## 1. Identity, version, owner, status

ID GDD-CORE, version 0.2, owner game-designer, status **DRAFT**. Derived from VISION v1.0 and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

A player observes one deterministic rule system at 30 Hz across all three strata; no rule reads wall time.

## 3. High Concept link

D1 time is a system: epoch state is computed from the fact graph, never scripted.

## 4. Deterministic rules

1. The simulation advances only on an integer tick; the wall clock stays in apps/server/src/main.ts.
2. State is integer fixed-point (milli-units); randomness comes from a seeded PRNG with an explicit seed.
3. The only clock-dependent operations are outside packages/core, which I14 rejects by AST lint.

## 5. Numbers with source

- 30 Hz tick, 33.333 ms per tick | SOURCE: packages/core/src/index.ts TICK_HZ
- tick budget <= 4 ms server-side | TUNABLE 2..8 ms | plan: measure in soak test NET-006
- state hash = FNV-1a 32-bit over 5 integer fields | SOURCE: packages/core/src/tracer.ts
- reachable states >= 200 before GATE:P2 | TUNABLE 200..2000 | plan: T4 reachability audit

## 6. State machine

TICK_IDLE → TICK_WITH_INPUT → FACTS_WRITTEN → EPOCH_RECOMPUTED → SNAPSHOT_HASHED → TICK_IDLE.

## 7. Data contract

core_state v1 {tick, x, z, vx, vz, seed} plus fact_graph v1 {fact_id, actor_id, tick, payload_hash}. Integer-only fields; wire encoding in GDD-NETCODE field 7. Migration requires a replay proof from the fact log.

## 8. Edge cases

1. Two intents with the same seq in one tick: the lower (tick, seq, actor_id) wins deterministically.
2. Fixed-point overflow at 2^31 milli-units: clamp and emit a bounds fact rather than wrap.
3. Seed replay on Node and Chromium produces different hashes: package rejected until diagnosed.
4. Epoch recomputation cost exceeds 4 ms: tick is still committed; telemetry records the overrun.
5. A rule reads Math.random: lint exits 1 before the build, not at runtime.

## 9. Failure states

1. Non-deterministic call detected: AST lint fails the build and names the file/line.
2. State hash mismatch across replicas: desync event with the last 60 ticks captured.
3. Reachability below 200 states: T4 debt is recorded and GATE:P2 is blocked.

## 10. Interaction matrix

CORE × CONSEQUENCE: facts are the only history. CORE × NETCODE: the hash is the ack contract.

## 11. Feedback per state change

Each tick emits one hash and one fact-count delta to telemetry; no per-tick UI message.

## 12. Accessibility

No essential state is conveyed by motion alone; the HUD overlay exposes tick and fact count as text.

## 13. Localization

State names and rule ids are tokens; numeric formatting is locale-independent in core.

## 14. Telemetry and success metric

tick_duration_ms (p95), state_hash, reachable_states, facts_per_tick. Success metric: 0 nondeterminism findings and equal hashes on Node and Chromium.

## 15. Acceptance tests

- GIVEN the core source WHEN pnpm lint runs THEN no banned clock/RNG/transcendental is reported.
- GIVEN two runtimes WHEN 1000 seeded ticks replay THEN the hash at each acked tick is equal.
- GIVEN the concept WHEN T4 is audited THEN at least 200 reachable states are proven.

## 16. Perf budget impact

sim tick p95 <= 4 ms; no allocation per tick beyond the fact batch; memory bounded by the AoI set.

## 17. Explicit out of scope

No wall clock, unseeded RNG, transcendental, DOM or Node API in packages/core; no gameplay content.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| W | h | i |
| H | o | w |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields, T2/T4 numbers and sources | GDD-003 |
