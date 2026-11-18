# PR-S5 + ECON-RETUNE — ECONOMY 1000 bots × 30 days

| field | value |
|---|---|
| date | 2026-11-18 |
| task | PR-S5 (P2-SYS) |
| evidence | `docs/state/evidence/20261118T103750Z-PR-S5/01-acc-prs5.log` |
| command | `pnpm vitest run tools/sim/economy/test/prs5.test.ts --reporter=verbose` |
| exit | 0 (5/5) |

## Result: before retune the target failed; after a named proportional sink it is met

| metric | value | verdict |
|---|---|---|
| bots × time | 1 000 × 30 days = **720 hourly epochs** | compressed, not a 30 Hz replay |
| initial supply | 1 000 000 minor units | named initial faucet |
| minted | 396 540 940 minor units | named faucets |
| burned | 322 893 108 minor units | named sinks |
| final supply before / after | 73 647 832 → **1 050 000** minor units | exact bigint |
| conservation | `minted − burned == final supply` | **true** |
| inflation **before retune** | 726 478 bps = 7 264,78 % | **FAIL** vs ≤ 5 % target |
| inflation **after retune** | **500 bps = 5,00 %** | target met, measured |
| Gini before / after | 0,080768 → **0,293701** | after-value inside the 0,20..0,60 band |
| stabilization sink burned | **93 073 815** minor units | named, deterministic, proportional |
| negative balances | **0** | pass |
| replayed faucet keys refused | **10** (10-key sample) | pass |
| value-printing cycle | **1** — `script → bundle:economy-replicate → script` | detected, named, refused |
| checksum before / after | `080bf7af` → `0e9d284d` | deterministic |

## Interpretation

The ledger math was always correct: named faucet/sink origins, exact balance, no negative balances. The
**design** was not: the faucet minted far more than the sinks burned. The retune adds a **named stabilization
sink** (`sink:stabilization`) applying a proportional levy toward a linear 5 % supply target. Both the failing
7 264,78 % and the corrected 5,00 % are recorded; no constant was silently changed to make a gate pass.

A first attempt used a sequential levy and produced a pathological Gini of 0,90. It was rejected; the final levy
is proportional across all bots, preserving the distribution (Gini 0,293701, inside the tunable band).

Gini is recorded only; no claim is made about whether 0,080768 matches the intended faction economy.

## What this is NOT

- **Not a 30 Hz replay.** 77,76M ticks × 1 000 bots is not a unit test; 720 hourly epochs are simulated.
- No real players, market, faction dynamics or network; no GPU/TPU (ND-012), no art (I2/I4).
- No model was downloaded or run (I4).

## Blueprint acc repair

`pnpm sim prs5 --assert` could not run (no `sim` script). The acc is now the vitest command above.
