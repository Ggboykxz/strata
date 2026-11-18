## 2026-11-18T09:15:00Z | backend-engineer -> all | EVIDENCE

**claim.** NET-003 is implemented on the pinned `ws` 8.23.0 (A0004, Director: "bypass pin colyseus"): room
membership, lifecycle, reconnect with session resume handles, a `ws` adapter, and authoritative frame handling
around the NET-001 host and NET-002 codec. No dependency was added and no lockfile changed.

**evidence** (`docs/state/evidence/20261118T085724Z-NET-003/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm test --filter @strata/server -t reconnect` | **1** | `CACError: Unknown option --filter` |
| `01-acc-rooms.log` | `pnpm vitest run apps/server/test/rooms.test.ts` | 0 | **17/17** |
| `02-server-all.log` | `pnpm vitest run apps/server` | 0 | **25/25** |
| `03-typecheck.log` | `pnpm typecheck` | 0 | strict, no error |
| `04-full-tests.log` | `pnpm test` | 0 | **90/90** |
| `05-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock · 0 RNG · 0 transcendental · 0 foreign import |
| `06-verify.log` / `10-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `07-gdd.log` | `node scripts/validate-gdd.mjs` | 0 | 32 modules |
| `08-blueprint.log` | `node scripts/validate-blueprint.mjs` | 0 | 63 tasks, 12 declared warnings |
| `09-tracer.log` | `pnpm tracer --assert` | 0 | equal hashes, desync rejected |

**what the tests actually prove.**
- Ids are assigned by the room (1, 2); a third join over capacity is refused. Room id seeds the host:
  same id → same hash, two hubs with the same script → identical hashes for 40 ticks.
- Handles are deterministic, room-scoped and tamper-detecting; a malformed handle is refused without throwing.
- Disconnect → DRAINING; resume inside the window reclaims the **same entity** and emits `reconnected`; resume
  after the window fails and the member is evicted; a handle belonging to a still-connected client is refused.
- Snapshot carries the entity's `appliedSeq`, so the client knows what to replay (NET-004).
- Intents apply to the authoritative host and one snapshot is broadcast per connected client; a replayed seq is
  refused at ingress with a `rejected-intent` event; hello/welcome and version reject work; a wrong hash emits
  exactly one `desync` while an unknown tick is ignored; malformed bytes and client-sent snapshots are refused;
  the `ws` adapter sends `reject{unauthorized}` and closes an unauthenticated connection.

**defect found and fixed while implementing.** `SimHost.submit` only validates format: two intents with the same
seq queue before a tick and the second is silently dropped by `stepWorld`, so no rejection was visible.
`Room` now tracks the highest submitted seq per entity and refuses a replay at ingress with a reason event.
This is correctness, not anti-cheat (SEC-001 still owns that).

**GDD / blueprint.** GDD-SHARDING 0.2 → 0.3 (I9): room lifecycle, 3 sourced numbers, resume-handle contract,
4 edge cases, 3 acceptance lines, and its corrupted §18 open-questions table replaced with two real questions.
NET-003's acc was the broken `pnpm test --filter` form; repaired to the test file path. **9 accs remain broken.**

**A0004.** `docs/adr/A0004_ws-room-transport.md` carries the Director's verbatim statement and the consequences:
no new dependency, stale `STACK.lock.md` line left as a record, handles are not credentials, no main.ts wiring.
No GPU or TPU needed; the current runtime has neither.

**honest limits.** no matchmaking, no persistence across restart, no auth, no rate limit, no cross-shard routing,
no `main.ts` wiring (the adapter is exported for a later task). Tick p95 remains unmeasured (NET-006).

**locks.** 8 globs, one sorted commit on `state/locks`: backend-engineer (rooms + GDD), gameplay-engineer
(server test), orchestrator (blueprint + gates).
