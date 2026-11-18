# PR-N4 — lag compensation rewind and server-side shot validation

| field | value |
|---|---|
| date | 2026-11-18 |
| task | PR-N4 |
| evidence | `docs/state/evidence/20261118T093621Z-PR-N4/01-acc-lagcomp.log` |
| command | `pnpm vitest run tools/sim/net/test/prn4.test.ts --reporter=verbose` |
| exit | 0 (10/10) |

## Measured (local structural fuzz)

| metric | value |
|---|---|
| shots evaluated | **30** |
| hits | **4** |
| cooldown refusals | **16** |
| blocked by LOS | **5** |
| out of range | **4** |
| stale tick refused | **1** |
| client claims ignored | **true** (identical verdict with `claimed` true/false) |
| deterministic | **true** (two identical scripts give identical verdict sequences) |

## Design

- `WorldHistory` is a 31-frame tick→WorldState ring. A shot names the shooter's tick; a tick outside the ring is
  `stale-shot`, never approximated with the newest state.
- Validation order after rewind: identity → cooldown → squared range → integer-cell LOS → verdict.
- Range uses `dx² + dz²` in **bigint mm²** — no `Math.sqrt`, no trigonometry, no float (D147).
- LOS is an integer Bresenham walk over 1 000 mm cells; endpoints are exempt; a wall cell blocks.
- The `claimed` flag is carried only to prove it is ignored. Only the server's NET-006 `HitLedger` fires hits.

## What this is NOT

- **Not network RTT**, not a 30-minute soak, not a real loss/jitter matrix. The label says so.
- No real weapon numbers: 12 000 mm range and 15-tick cooldown are TUNABLE until PR-S1 measures them.
- No hit-rate or p95 claim. These are structural verdict counts from a deterministic local script.

## Blueprint acc repair

`pnpm sim prn4 --assert` could not run (no `sim` script). The acc is now the vitest command above. Tenth distinct
broken acc form found; 7 `pnpm test --filter` accs remain.
