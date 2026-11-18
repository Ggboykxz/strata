# PR-S6 — faction / reputation dynamics

| field | value |
|---|---|
| task | PR-S6 (P2-SYS), deps `[PR-S2]` |
| evidence | `docs/state/evidence/` PR-S6 dir, `01-acc-prs6.log` |
| command | `pnpm vitest run tools/sim/systems/test/prs6.test.ts --reporter=verbose` |
| exit | 0 (5/5) |

## Measured (local greybox)

| metric | value |
|---|---|
| immutable facts recorded | **1 000** |
| reputation changes | **1 000** |
| standing changes | **4** |
| faction switches / refusals | **4 / 4** (hostile faction blocks) |
| replay from fact log | **exact** |
| deterministic across two runs | **true** |

## Design

Standing is **derived from attributed facts**, never an authored bar. Reputation is the integer sum of fact weights
for `(actor, faction)`, clamped to [-100, 100]; hostile <= -20, allied >= 40. A duplicate fact id is refused, a
zero-weight contribution is not a fact, and replaying the immutable log reproduces every reputation value. A
switch needs non-negative standing with the new faction and no hostile standing with the old one.

## What this is NOT

No players, UI, dialogue, art or persistent database. The label says "local greybox faction prototype — not a
balance sign-off". Thresholds are tunables awaiting a real 4-client measurement.

## Blueprint acc repair

`pnpm sim prs6 --assert` could never run (no `sim` script). The acc is now the vitest command above;
`co: [balance-analyst, qa-engineer]` declared. GDD-FACTION promoted STUB → DRAFT with 19 fields.

## Gate consequence

PR-S6 was the **last P2-SYS task**: `GATE:P2SYS` is satisfied. `GATE:P2` still requires HC-003 and GDD-005.
