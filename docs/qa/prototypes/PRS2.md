# PR-S2 — consequence propagation depth (greybox)

| field | value |
|---|---|
| date | 2026-11-18 |
| task | PR-S2 (P2-SYS) |
| evidence | `docs/state/evidence/20261118T101524Z-PR-S2/01-acc-prs2.log` |
| command | `pnpm vitest run tools/sim/world/test/prs2.test.ts --reporter=verbose` |
| exit | 0 (8/8) |

## Measured (local greybox simulation)

| metric | value |
|---|---|
| facts in T2 window | **5** (3 scripted + 2 crossing acts in one tick) |
| late facts (tick > 900) | **1** stored, excluded from replay |
| strata reached | **2** |
| geometry variant swaps | **5** |
| captures | **30** (6 per consequence) |
| clients agree on fact_id / variant_id / epoch | **true** |
| T2 verdict | **pass**, no failed requirement |
| deterministic | **true** (two identical scripts → identical reports) |

## Design

`packages/world-state/` holds an immutable `FactLog`, FNV-1a derivation of fact ids and consequences, per-client
reports and a `t2Verdict` that names every failed requirement. Client agreement compares only
`{factIds, variantIds, epoch}` — the `client` id is deliberately excluded from the proof. Duplicate fact ids are
refused, never overwritten; a fact after tick 900 stays in the log but is excluded from the replay window.

## What this is NOT

- **Not a T2 sign-off.** The label says "local greybox propagation — not a T2 sign-off".
- No real world geometry, no 6 visual captures for a blind reviewer, no browser replay: GB-001 owns greybox
  Oakhollow ×3 strata, PR-S3 owns quest resolutions and replay.
- No art, no GPU/TPU (ND-012). No model was downloaded.

## Blueprint acc repair

`pnpm sim prs2 --assert` could not run (no `sim` script). The acc is now the vitest command above.
