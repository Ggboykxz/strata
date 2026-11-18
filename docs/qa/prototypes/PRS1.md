# PR-S1 — greybox combat math (TTK / windows / hit-stop)

| field | value |
|---|---|
| date | 2026-11-18 |
| task | PR-S1 (P2-SYS) |
| evidence | `docs/state/evidence/20261118T100756Z-PR-S1/01-acc-prs1.log` |
| command | `pnpm vitest run tools/sim/world/test/prs1.test.ts --reporter=verbose` |
| exit | 0 (4/4) |

## Measured (local greybox math)

| metric | value |
|---|---|
| HP / damage | 100 / 25 |
| hits to kill | **4** |
| cycle | **11 ticks** (max of 9-tick interval and 3+2+4+2 window-with-stop) |
| TTK | **36 ticks = 1 200 ms** at 30 Hz |
| hit-stop total | **8 ticks = 267 ms** (2 ticks × 4 hits) |
| legality | integer ticks only; illegal windows refused, never clamped |

## Design

One attacker, one target, fixed integer damage. The cycle is `windup → active → recovery`, with an interval
floor and a hit-stop freeze after each landed hit. TTK is the tick at which cumulative damage reaches HP. A
window is legal only with windup ≥ 1, active ≥ 1, recovery ≥ 0, interval ≥ window sum, hit-stop in 0..30 ticks
and integer values. An illegal window raises `RangeError` — the same refusal rule the anim machine applies.

## What this is NOT

- **Not a playtest**, not FUN validation, not a TTK feel sign-off. The label says so.
- Not a browser or network measurement; milliseconds are presentation derived from the 30 Hz tick.
- The 4 ms core tick budget remains a GDD constraint, not a number measured here.
- No art, VFX, audio or asset (I2). No GPU/TPU was used (none available, ND-012).

## Blueprint acc repair

`pnpm sim prs1 --assert` could not run (no `sim` script). The acc is now the vitest command above.
