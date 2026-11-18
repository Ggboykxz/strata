# PR-S3 — quest resolutions + delayed effects

| field | value |
|---|---|
| task | PR-S3 (P2-SYS), deps `[PR-S2]` |
| evidence | `docs/state/evidence/` PR-S3 dir, `01-acc-prs3.log` |
| command | `pnpm vitest run tools/sim/systems/test/prs3.test.ts --reporter=verbose` |
| exit | 0 (5/5) |

## Measured (local greybox)

| metric | value |
|---|---|
| resolutions kept | **2** (two players, options 1 and 2) |
| distinct fact ids | **2** — no global override |
| delayed effects applied | **2** at `fact_tick + 9` in another stratum |
| text-only resolutions refused | **1** |
| reachable quest states | **243** (5 quests × 3 options) |
| FR/EN dialogue keys | **6**, 0 untranslated |
| deterministic across two runs | **true** |

## Design

Availability is derived from the world fact graph; no authored branch bypasses it. Each physical resolution writes
one fact and one delayed consequence scheduled from the **fact tick**, so a shard restore reproduces it. Two players
choosing different options keep separate fact ids (GDD §8.1). A text-only change is refused as a T4 defect (§8.3),
and erasing a prerequisite re-derives availability (§8.4). The greybox blueprint is
`packages/content/blueprints/quests/proto/q_abbey.json`.

## What this is NOT

No renderer, dialogue UI, player, browser or art. The label says "local greybox quest prototype — not a playtest".
FR/EN keys are structural pairs, not story sign-off.

## Blueprint acc repair

`pnpm sim prs3 --assert` could never run (no `sim` script). The acc is now the vitest command above;
`co: [narrative, qa-engineer]` declared.
