# VERTICAL SLICE SPEC — STRATA

| field | value |
|---|---|
| id | VERTICAL_SLICE_SPEC |
| version | 1.0 |
| owner | producer |
| status | ACTIVE |
| authority | HIGH_CONCEPT v1.3 T2, TRACER-001, GDD-CONSEQUENCE |
| validated by | `node scripts/validate-docs.mjs` |

## 1. The slice in one act

One player act writes an attributed fact; within **900 ticks** (30 s at 30 Hz) at least **3 facts** land in
at least **2 strata**, with at least **1 physical variant swap** per affected stratum. Two clients observe
the same `fact_id`, `variant_id` and `epoch` and produce equal state hashes. Six before/after captures are
archived for a blind reviewer.

## 2. Observable sequence

| tick | event | evidence |
|---|---|---|
| 0 | intent accepted by server | intent seq, actor id |
| 1..29 | fact graph written, epochs recomputed | fact ids, variant ids |
| 30 | first variant swap visible in a second stratum | capture 1 before/after |
| 31..899 | delayed consequence lands in a third stratum | captures 2..6 |
| 900 | verdict | two equal hashes, reviewer chain inferred |

The tick table is a contract, not a forecast. Any overrun is recorded as T2 debt, never hidden.

## 3. Inclusion set

Included: one capsule, one 2 m kit grid cell, two strata readings, one fact-driven variant, one HUD overlay
element naming the fact and the era. Excluded: hero art, terrain baking, motion generation, scene generation,
public multiplayer, economy simulation content, audio. NET-GATE is unpassed (I2).

## 4. Exit evidence

- `pnpm tracer --assert` exit 0 on the current head.
- `hc_demo_30s` replay (HC-003) with six captures and two equal-hash clients.
- `concept-integrity --check` exit 0 with T1 and T3 signed at the current gate.
- GDD-CONSEQUENCE DRAFT with the 900-tick budget intact (validator enforces it).

## 5. Risks

| risk | owner | deadline | mitigation |
|---|---|---|---|
| T1 sentence or T3 signature drifts | high-concept-guardian | each gate | drift validator |
| throughput unmeasured, months NOT COMPUTABLE | producer | ECON-001 | no date promised |
| territory-restricted licences | Director | ND-006 | reject for now, use fallbacks |
| dependency graph 403 | Director | before release | local pin/licence validators block instead |

## 6. Change log

| version | date | change | by |
|---|---|---|---|
| 1.0 | 2026-11-18 | T2-derived slice, inclusion set, exit evidence and risks | producer |
