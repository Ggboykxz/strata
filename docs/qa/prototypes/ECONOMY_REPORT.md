# PR-S5 — ECONOMY 1000 bots × 30 days

| field | value |
|---|---|
| date | 2026-11-18 |
| task | PR-S5 (P2-SYS) |
| evidence | `docs/state/evidence/20261118T103750Z-PR-S5/01-acc-prs5.log` |
| command | `pnpm vitest run tools/sim/economy/test/prs5.test.ts --reporter=verbose` |
| exit | 0 (5/5) |

## Result: the economy is structurally sound but the inflation target FAILS

| metric | value | verdict |
|---|---|---|
| bots × time | 1 000 × 30 days = **720 hourly epochs** | compressed, not a 30 Hz replay |
| initial supply | 1 000 000 minor units | named initial faucet |
| minted | 396 540 940 minor units | named faucets |
| burned | 322 893 108 minor units | named sinks |
| final supply | **73 647 832** minor units | exact bigint |
| conservation | `minted − burned == final supply` | **true** |
| inflation | **726 478 bps = 7 264.78 %** | **FAIL** vs ≤ 5 % target |
| Gini | **0,080768** (80 768 micro) | recorded, not asserted |
| negative balances | **0** | pass |
| replayed faucet keys refused | **10** (10-key sample) | pass |
| value-printing cycle | **1** — `script → bundle:economy-replicate → script` | detected, named, refused |
| checksum | `080bf7af` | deterministic |

## Interpretation

The ledger math is correct: every unit has a named faucet/sink origin, the books balance exactly and no balance
goes negative. The **design** is not: the current deterministic faucet rate mints far more than the sinks burn.
Per GDD-ECONOMY §8.4, the faucet rate is flagged **TUNABLE** — it is not silently changed to make the result pass.
A retune decision belongs to the Director/economy-designer with a measured sink, not to this prototype.

Gini is recorded only; no claim is made about whether 0,080768 matches the intended faction economy.

## What this is NOT

- **Not a 30 Hz replay.** 77,76M ticks × 1 000 bots is not a unit test; 720 hourly epochs are simulated.
- No real players, market, faction dynamics or network; no GPU/TPU (ND-012), no art (I2/I4).
- No model was downloaded or run (I4).

## Blueprint acc repair

`pnpm sim prs5 --assert` could not run (no `sim` script). The acc is now the vitest command above.
