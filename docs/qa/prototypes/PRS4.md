# PR-S4 — crafting chain and infinite-profit cycle detection

| field | value |
|---|---|
| date | 2026-11-18 |
| task | PR-S4 (P2-SYS) |
| evidence | `docs/state/evidence/20261118T102858Z-PR-S4/01-acc-prs4.log` |
| command | `pnpm vitest run tools/sim/economy/test/prs4.test.ts --reporter=verbose` |
| exit | 0 (7/7) |

## Measured (local greybox economy)

| metric | value |
|---|---|
| recipes in script | **3** (smelt, forge, replicate) |
| crafts completed | **6** |
| positive-value cycles detected | **1** |
| cycle path | `script → bundle:replicate → script` |
| final inventory value | **17 172 minor units** (bigint, exact) |
| deterministic | **true** |

## Design

All value is bigint minor units (D150). Unit values derive deterministically from item kind via FNV-1a — no
remembered price. A multi-input recipe becomes a bundle node with one edge per input (`-inputValue`) and one edge
to the output (`+outputValue`). Bellman-Ford max-relaxation over a fixed node count detects a **positive cycle**;
the result names the path and the gain, never just a boolean. Inputs are consumed through a named sink and the
output fact carries its input fact ids (GDD §4.1/4.2). Tier above 4, missing sink, duplicate input kinds, fewer
than two inputs or insufficient inventory are refused without silent downgrade or negative balance.

## What this is NOT

- **Not ECON-001 / PR-S5**: no 1000-bot 30-day run, no inflation, no Gini, no real market. The label says so.
- No art, no GPU/TPU (ND-012). No model was downloaded (I4).

## Blueprint acc repair

`pnpm sim prs4 --assert` could not run (no `sim` script). The acc is now the vitest command above.
