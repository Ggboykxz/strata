# A0004 — NET-003 rooms on the pinned `ws` transport

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18**, Director instruction recorded verbatim; PR stays draft and may be reversed before merge |
| accepted_by | Director (`2026-11-18-s02`) |
| date | 2026-11-18 |
| task | NET-003 |
| parties | Director vs blueprint task title |
| supersedes | the "Colyseus" dependency in the NET-003 title (stack decision only) |

## Director statement

> bypass pin colyseus

Spoken in direct answer to the hand-off note: "NET‑003 is blocked on a producer-owned Colyseus pin; `docs/STACK.lock.md`
still says `Colyseus | NOT INSTALLED | NET-001`."

## Context

`docs/blueprint/BLUEPRINT.yaml` names NET-003 "Colyseus rooms + lifecycle + reconnect + session tokens".
`docs/STACK.lock.md` has no Colyseus entry, and `docs/**` is the producer's ownership glob, so an agent could
not pin it without a producer hand-off. The Director has chosen to bypass that pin instead.

## Decision

NET-003 is implemented on **`ws` 8.23.0**, which is already pinned in `docs/STACK.lock.md` and used by
`apps/server/src/tracer.ts`. Its licence (MIT) is already audited there. **No dependency is added**, no
lockfile change is made, and `docs/STACK.lock.md` is not edited. The blueprint task id, phase, tier, agent,
outputs and acceptance stay the same; only the transport named in the title is superseded.

## Consequences

- Rooms own their lifecycle, reconnect window and session-token handling; the transport is an adapter over the
  existing `ws` connection, so a different transport can be substituted later without rewriting the machine.
- Session tokens are **opaque resume handles, not credentials**. Authentication, rate limits and anti-cheat stay
  with SEC-001; nothing here claims security.
- The stale `docs/STACK.lock.md` line ("Colyseus NOT INSTALLED | NET-001") remains stale by instruction; it is a
  known record, not a silent edit. A future Director decision may reintroduce Colyseus without invalidating
  the room lifecycle.
- No GPU or TPU is needed: this is CPU-only server logic. The current runtime has neither.
