# PR-N2 — matchmaking, teardown, exact resume

| field | value |
|---|---|
| task | PR-N2 (P2NET), deps `[NET-003]` |
| evidence | `docs/state/evidence/` PR-N2 dir, `01-acc-prn2.log` |
| command | `pnpm vitest run tools/sim/persist/test/prn2.test.ts --reporter=verbose` |
| exit | 0 (2/2) |

## Measured (local greybox)

| metric | value |
|---|---|
| queued clients | 6 |
| rooms created by `(rating, client)` ordering | **3** |
| exact resumes (same entity after inside-window disconnect) | **2** |
| late-handle refusals | **1** |
| rooms torn down after everyone left | **3** |
| deterministic across two runs | **true** |

## Design

A deterministic queue orders by `(rating, client_id)` and fills rooms up to capacity. Resume before the window
returns the **same entity id** (NET-003 contract); a late handle is refused. Teardown happens only after every
member has been gone past the window. No socket to a real matchmaking service, no database, no RTT — the label
says "local greybox rooms — not a matchmaking service".

**Defect found and fixed:** the harness first inferred a room from a global queue client id, but `RoomClient.clientId`
is room-local — a client with queue id 3 had room-local id 2, and the resume was routed to the wrong room. Room
association is now tracked explicitly at join time; both resumes succeed.

## Blueprint acc repair

`pnpm sim prn2 --assert` could never run (no `sim` script). The acc is now the vitest command above.
`co: [qa-engineer]` declared for the append-only report.

## What this unlocks

PR-N2 was the last P2NET task: `GATE:P2NET` is satisfied. `GATE:NET` still needs the Director's formal human
signature; the dossier remains `signed-with-risk` with 8 unmet measurement criteria.
