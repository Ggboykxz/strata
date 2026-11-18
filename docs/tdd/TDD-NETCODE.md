# TDD-NETCODE — wire and authority

| field | value |
|---|---|
| id | TDD-NETCODE |
| status | DRAFT |
| owner | netcode-engineer |
| gdd | GDD-NETCODE |

## Context

The server owns truth; the client sends intent. GDD-NETCODE fixes the 30 Hz tick, the snapshot hash and the
desync contract. This TDD states the observable behaviour before NET-001 implements it.

## Acceptance

1. **GIVEN** two clients and 5 authoritative ticks **WHEN** `pnpm tracer --assert` runs **THEN** both hashes
   equal the server hash at each acked tick.
2. **GIVEN** a replica that acks a wrong hash **WHEN** the server compares it **THEN** the verdict is `desync`
   and the command exits 1.
3. **GIVEN** an intent with `dx=2` **WHEN** the server validates it **THEN** state is unchanged and reason
   `RANGE` is logged.
4. **GIVEN** a snapshot with `appliedSeq=N` **WHEN** the client reconciles **THEN** only intents with seq>N
   are replayed.

## Out of scope

No physics engine, no bone transforms on the wire, no client-authoritative hit frame.
