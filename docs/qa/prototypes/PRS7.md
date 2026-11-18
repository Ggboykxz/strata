# PR-S7 — world tick + bounded Rouille cascade

| field | value |
|---|---|
| task | PR-S7 (P2-SYS), deps `[PR-S2]` |
| evidence | `docs/state/evidence/` PR-S7 dir, `01-acc-prs7.log` |
| command | `pnpm vitest run tools/sim/world/test/prs7.test.ts --reporter=verbose` |
| exit | 0 (4/4) |

## Measured (local greybox)

| metric | value |
|---|---|
| cascade bound | **12 ticks** |
| fan-out per erase | **2** neighbours |
| over-harvest threshold | **10** minor units |
| facts / erases | **12 / 12** — exactly one fact per erase |
| last active tick | **10** (within the bound) |
| duplicate-erase refusals | **9** |
| deterministic across two runs | **true** |

## Design

A 12-node graph over 3 eras is stepped with integer ticks only. Over-harvest reduces an amount and writes one
PR-S2-style fact when the amount reaches the threshold. Rouille spawns in a later era, erases at most one node per
tick, propagates to at most two neighbours and **stops at tick 12**; later due spawns are recorded as dropped,
not applied. An already-erased node produces a refusal counter and no second fact.

## What this is NOT

No terrain mesh, texture bake, scene generation, browser renderer, AI model or audio — the label says
"local greybox world tick — not a world demo". No 30 Hz replay and no browser tick measure.

## Blueprint acc repair

`pnpm sim prs7 --assert` could never run (no `sim` script). The acc is now the vitest command above.
`co: [qa-engineer]` declared for the append-only report. GDD-WORLD-SIM promoted STUB → DRAFT (19 fields).
