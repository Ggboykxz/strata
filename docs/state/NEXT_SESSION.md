# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T01:00Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| mode | RESUME |
| next task | **TRACER-001** — walking skeleton: 1 capsule, 30 Hz tick, WebSocket, equal state hash |
| blocker | **ND-004 / ND-005 only** — token rotation needs the Director's account. Everything on disk is green. |

---

## 1. State at hand-off

| task | status | evidence |
|---|---|---|
| HC-001 | done (+ v1.1 ND-001, v1.2 T3 signature) | `…T001004Z-HC-001/`, `…T004835Z-DIRECTOR-RESOLUTIONS/` |
| SC-001 | done | `docs/state/evidence/20261118T001004Z-SC-001/` |
| WF-001 | done | `docs/state/evidence/20261118T001004Z-WF-001/` |
| P0-001 | done | `docs/state/evidence/20261118T001004Z-P0-001/` |
| P0-002 | done | `docs/state/evidence/20261118T001004Z-P0-002/` |
| P0-003 | done | `docs/state/evidence/20261118T004153Z-P0-003/` |
| WF-002 | done | `docs/state/evidence/20261118T005800Z-WF-002/` |

Re-verify before touching anything:

```bash
pnpm verify                              # 9/9 enabled steps, exit 0
node scripts/validate-blueprint.mjs      # 63 tasks, 0 errors, 12 declared warnings
node scripts/concept-integrity.mjs --check  # 0 debt at GATE:P0 (re-sign at P1)
```

Decision recorded: **TRACER-001 is selected before P0-004**. Both depend only on P0-003, but TRACER is
`sig` and P0-004 is `amp` (selection order), and D137 puts the walking skeleton before bulk GDD work.

## 2. TRACER-001 — definition of done

Source: `docs/blueprint/BLUEPRINT.yaml` line 41. Agent **tools-engineer**, `scaffold: true`, `sig`,
7 output paths under `packages/core/`, `packages/protocol/`, `apps/server/`, `apps/game/`.
Acceptance: **`pnpm tracer --assert`**.

1. **Core** (`packages/core`): one capsule state at a fixed 30 Hz tick, a seeded PRNG, integer/quantized
   state, and a deterministic state hash. I14 is already enforced by the core-math AST lint — do not weaken
   it. No gameplay, no ECS beyond what one capsule needs.
2. **Protocol** (`packages/protocol`): exactly the messages the tracer needs (intent, snapshot, hash ack),
   versioned. No zod until it has an exact pin in `docs/STACK.lock.md`; plain typed codecs are enough here.
3. **Server** (`apps/server`): authoritative tick, one WebSocket connection, validates intents, broadcasts
   snapshots. Pin the WebSocket library with an exact version and record its license in `STACK.lock.md`.
4. **Client** (`apps/game`): consumes snapshots, predicts locally, reconciles, interpolates, and renders the
   capsule with Babylon. Babylon is **NOT INSTALLED** — pin an exact version in `STACK.lock.md` before its
   first import (MIT, verify from the registry, never from memory). `NullEngine` is allowed in tooling/CI;
   it is banned from the server tick.
5. **`pnpm tracer --assert`**: one command, exit 0 only when the server hash and both client hashes match
   at an acked tick, and when a deliberately desynced replica is *rejected*. Log the command and exit code
   under `docs/state/evidence/<utc>-TRACER-001/`.
6. **Negative tests, logged**: inject a desync → assert exits 1; inject `Math.random` into core → lint exits 1
   (proves the I14 gate still holds while adding real sim code).
7. No hero asset, texture bake, motion or scene generation. **I2**: a capsule is greybox; NET-GATE stays
   unpassed. `art:` remains absent from the task.

## 3. Open decisions carried forward

1. **ND-001 / ND-002 — RESOLVED.** HIGH_CONCEPT v1.2 (EN 25, FR 30, T3 signed at P0) and A0002 option A
   (D-002 closed, WF-002 implemented and wired into `verify`).
2. **ND-003 — DEFERRED.** Keep the repo private on the personal account until GATE:P0.
3. **ND-004 / ND-005 — OPEN, Director action.** The exposed GitHub PAT and HF token must be revoked and
   replaced with fine-grained credentials. The agent cannot do it; pushes still use the compromised PAT.
   Replacing it before rotation would break all pushes, so the known risk is carried, not hidden.

## 4. Order after TRACER-001

1. **P0-004** — 27 CI workflows + real `scripts/validate-workflows.mjs` (currently a stub).
2. P0-005..P0-007, then the `GATE:P0` dossier with its 3 drills.
3. WF-002's duplicated glob compiler → `scripts/lib/ownership.mjs` (tools-engineer, recorded debt).

## 5. Known red (intentional, not regressions)

- `scope-math.mjs --report` exit 2: throughput unmeasured by design.
- `concept-integrity --score` exit 2 until a measured CIS source exists (HC-003, P2).
- 19 validators print `NOT IMPLEMENTED` and exit 1; `pnpm verify` lists them as DEFERRED and does not run them.
- `validate-workflows.mjs` is one of those 19 until P0-004 replaces it.

## 6. Environment notes

- Node **22.23.4**, pnpm **12.21.0** (corepack), TypeScript **6.0.3**, Vitest **5.1.0** — `docs/STACK.lock.md`.
- `pnpm verify` = typecheck → lint (core-math AST ban) → unit → prompt drift → scope → scope-math →
  blueprint → ownership → locks. Fail-fast; DEFERRED groups printed.
- Python 3 with PyYAML 6.0.3 and jsonschema available for cross-checks only.
- Never commit a token. Evidence logs capture commands; secrets must not appear in them.
