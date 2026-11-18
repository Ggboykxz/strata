# A0010 — Client-scoped prediction hash (protocol v4)

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18**, under the Director's blanket instruction (A0006/A0009); no separate reviewed signature |
| accepted_by | Director (`2026-11-18-s02`, blanket authorization) |
| date | 2026-11-18 |
| task | GATE:NET |
| parties | netcode-engineer vs the single global snapshot hash |
| supersedes | the assumption that every client can reproduce `hashWorld` in a multi-client room |

## Context

`SnapshotFrame` carried one hash: the server's FNV-1a hash of **every** entity at that tick. `Predictor`
reproduced that hash from its local world, but a client only knows its own intents. Every remote entity is
server-authoritative, so as soon as another player moves, the client's local world (which leaves remote
entities untouched) cannot reproduce the global hash. Four independent clients in one room therefore turn a
healthy prediction into a reported desync.

The existing two-client room test only compared encoded frames; it never reconciled a client against a world
in which a remote entity had moved. The defect was found while preparing the four-client NET-GATE matrix.

## Decision

Protocol **v4** adds a second 32-bit hash to the snapshot header:

- `hash` — the server audit hash of the whole world (`hashWorld`), unchanged in meaning.
- `viewHash` — the hash of the **recipient's own entity** at that tick (`hashEntity(tick, entity)`), the only
  state that client can predict.

`snapshotFromWorld(world, hash, viewEntityId?, appliedSeq?)` fills `viewHash`. When no recipient is named
(tracer, single-entity replay), `viewHash` equals `hash`, so existing callers keep one hash and one code path.
`Room.snapshotFor` now passes the client's entity id and its own `appliedSeq`; the snapshot still contains the
whole world because remote players are needed for interpolation.

`Predictor` records `hashEntity` in its timeline and verifies `viewHash` when present, falling back to `hash`
only for single-entity callers. The global hash is audit-only and is never compared to a client prediction.

Wire impact: snapshot header **15 → 19 bytes**; a 64-entity snapshot is **1 555 bytes**, i.e. **46 650 B/s** at
30 Hz. That is still 3.80× the 12 288 B/s down budget; NET-101 (AoI + delta) remains the owner of the budget,
and this ADR does not claim it is met.

## Consequences

- A moving remote entity no longer produces a false desync; `apps/game/test/net.test.ts` has an explicit test
  where the global hash differs and the client verdict is `ok`.
- The wire grows by 4 bytes per snapshot. The NET-GATE wire-budget row must be updated from 1 551 / 46 530
  to 1 555 / 46 650; the failure is not hidden.
- v3 peers are refused by the version negotiation (v4 only), as required by GDD-NETCODE §7.
- This does **not** solve latency skew: a client that predicts a tick before the server has applied its intent
  can still report a mismatch. The target-tick input contract is separate work; until it lands, RTT matrix
  numbers must be read as measured, not assumed green.
- Rollback: revert `PROTOCOL_VERSION` to 3, remove `viewHash` from the header, and restore the 15-byte header;
  no persisted data depends on the frame layout.

## Evidence

- `pnpm typecheck` → exit 0
- `pnpm test` → 42 files, 303 tests, exit 0 (includes the new client-scoped-hash test)
- `pnpm verify` → 19/19 enabled steps green, exit 0

Logs are captured under `docs/state/evidence/` when the matrix harness runs; the commands above were run at
`79936e1` plus the working-tree change described here.
