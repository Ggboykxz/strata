## 2026-11-18T09:18:00Z | orchestrator -> backend-engineer | HANDOFF

**claim.** A0004 is accepted: the Director said "bypass pin colyseus". NET-003 therefore runs on the already
pinned `ws` 8.23.0. No dependency, no lockfile change, no producer hand-off. NET-001 owns the authoritative
tick and NET-002 the frame codec; this task owns the room around them: membership, lifecycle, reconnect and
session resume handles.

**inputs.** A0004 (verbatim Director statement), `apps/server/src/sim/host.ts`, `packages/protocol/src/binary.ts`,
`docs/design/gdd/GDD-SHARDING.md` §5/§7, `docs/STACK.lock.md` (`ws` 8.23.0 MIT, already audited).

**expected outputs.** `apps/server/src/rooms/{tokens,room,ws-adapter,index}.ts` (no new package),
`apps/server/test/rooms.test.ts`, GDD-SHARDING 0.2 → 0.3, NET-003 acc repaired to a file path.

**acceptance.** `pnpm vitest run apps/server/test/rooms.test.ts` · `pnpm vitest run apps/server` ·
`pnpm test` · `pnpm typecheck` · `pnpm verify` · `pnpm tracer --assert`.

**constraints.** no new dependency (A0004); no clock in core logic (I14); tokens are resume handles, not
credentials (SEC-001 owns auth); no art (I2); behaviour change updates the GDD in the same PR (I9).
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T09:18:00Z | orchestrator -> backend-engineer | PROPOSAL

**transport boundary.** `Room` knows nothing about `ws`: it accepts a minimal `send(Uint8Array)` socket. The
adapter translates a `ws` connection into room calls. A different transport can replace the adapter without
touching room lifecycle — that is what "bypass Colyseus" buys us instead of a rewrite.

**tokens.** A handle is `room.client.nonce.signature`, signed with core's FNV-1a. Deterministic so tests can
reproduce it; a tamper detector, not cryptography. SEC-001 owns authentication and must not treat this
handle as authority. The handle travels in the upgrade URL query, not in a wire frame: protocol v2 has no
field for it and adding one would be NET-002 scope creep (recorded in GDD §7).

**lifecycle.** OPEN while at least one socket is attached; DRAINING when everyone is away but a handle is still
inside the reconnect window; CLOSED once the window expires and the room is removed from the hub. A resumed
client gets its **original entity id** — identity must not silently change on reconnect. Identity is
reclaimed by handle, never by a client-supplied entity number (I1).

**reconnect correctness.** The server does not replay intents on resume. It sends a snapshot at the current
tick; per GDD-NETCODE §4 the client resets to that snapshot and replays only intents with seq greater than
`snapshot.appliedSeq` (client work in NET-004). Replaying server-side would double-apply.

**determinism.** Room id seeds the simulation host through FNV-1a over its characters. Two hubs with the same
room id and the same intent script produce equal hashes at each tick — a test, not a promise.

**honest limits.** no matchmaking, no persistence across process restart, no auth, no rate limit, no cross-shard
routing, no main.ts wiring. The adapter is exported for a later wiring task; nothing here claims a running
game server.

**ACK** — backend-engineer, same process.
