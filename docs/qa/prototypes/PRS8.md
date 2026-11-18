# PR-S8 — server anim state machine + illegal-state fuzz

| field | value |
|---|---|
| task | PR-S8 (P2-SYS), deps `[NET-006]` |
| evidence | `docs/state/evidence/` PR-S8 dir, `01-acc-prs8.log` |
| command | `pnpm vitest run tools/sim/anim/test/prs8.test.ts --reporter=verbose` |
| exit | 0 (2/2) |

## Measured (local greybox)

| metric | value |
|---|---|
| requests fuzzed | **10 000** |
| legal accepted | **2 500** |
| illegal refused | **7 500** (replayed seq / unknown clip / wrong archetype) |
| state mutations on refusal | **0** |
| server hit frames fired | **833** |
| deterministic across two runs | **true** |

## Design

Requests go through the authoritative NET-005 `AnimRuntime`. A refusal carries a reason and must leave the runtime
byte-identical; no exception escapes the fuzz. Hit frames come from `eventsAt` on the server at absolute ticks,
never from a client claim (I1/I3). The report says "local greybox anim fuzz — not a playtest".

**Defect found and fixed:** the harness compared `eventsAt` objects directly to a tick number, so hits counted as 0
despite firing. It now compares `event.tick` and `event.kind`; 833 hits are observed. No implementation weakened.

## What this unlocks

AN-002 (Mesh2Motion rigs + Babylon runtime retargeting) depends on PR-S8 — that dependency is now satisfied.
Retarget coverage and foot slide remain unmeasured (AN-002). No GLB, motion clip, art or GPU/TPU was used.

## Blueprint acc repair

`pnpm sim prs8 --assert` could never run (no `sim` script). The acc is now the vitest command above.
`co: [qa-engineer]` declared for the append-only report.
