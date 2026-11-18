# TDD-ECONOMY — ledger and paradox

| field | value |
|---|---|
| id | TDD-ECONOMY |
| status | DRAFT |
| owner | economy-designer |
| gdd | GDD-ECONOMY, GDD-TRADE |

## Context

Faucets and sinks are named; currency is integer minor units and double-entry. Over-harvest spawns Rouille
that erases nodes in another era. This TDD states the observable behaviour before ECON-001 implements it.

## Acceptance

1. **GIVEN** 1000 bots over 30 simulated days **WHEN** the sim runs **THEN** inflation and Gini are reported
   with a source, or `NOT COMPUTABLE` while unmeasured.
2. **GIVEN** 1000 replays of one idempotency key **WHEN** the ledger restores **THEN** exactly one entry exists
   and drift is 0 minor units.
3. **GIVEN** an over-harvest fact **WHEN** the delayed tick arrives **THEN** Rouille erases a node in another
   era and the fact id is attributed.
4. **GIVEN** a sink larger than the balance **WHEN** the transaction runs **THEN** it is refused and the
   reason is logged.

## Out of scope

No float currency, no real-money transaction, no invented throughput or date.
