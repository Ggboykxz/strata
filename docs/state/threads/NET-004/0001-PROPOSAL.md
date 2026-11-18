## 2026-11-18T09:35:00Z | orchestrator -> netcode-engineer | HANDOFF

**claim.** NET-001 owns the authoritative tick and hash, NET-002 the frames, NET-003 the rooms. NET-004 is the
client half: predict locally, reset to the server snapshot, replay only unacked intents, and raise a desync when
the client hash disagrees **at the acked tick**. Greybox only — no art, no new dependency (A0004).

**inputs.** `docs/design/gdd/GDD-NETCODE.md` §4/§6/§7/§8/§9, `packages/core/src/tick.ts` (`stepWorld`,
`hashWorld`, `HashRing`), `apps/server/src/rooms/room.ts` (`snapshotFor`, per-entity `appliedSeq`),
`packages/protocol/src/binary.ts` (`SnapshotFrame`).

**expected outputs.** `packages/core/src/hash.ts` (client tick→hash timeline),
`apps/game/src/net/{predictor,interpolate,snapshot-buffer,index}.ts`, `apps/game/test/net.test.ts`,
GDD-NETCODE 0.4 → 0.5, NET-004 acc repaired to the test file path.

**acceptance.** `pnpm vitest run apps/game/test/net.test.ts` · `pnpm test` · `pnpm typecheck` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** no client-authoritative truth (I1): the server snapshot always wins; a hash mismatch produces a
desync and is rejected, never silently reconciled (GDD §4.3); integers for simulation maths; no new dependency.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T09:35:00Z | orchestrator -> netcode-engineer | PROPOSAL

**why a client timeline.** The server's `HashRing` compares acks at the tick they name. The client needs the
mirror image: remember the hash it predicted at each tick, then compare it with the server's snapshot hash for
**that same tick**. `packages/core/src/hash.ts` is that bounded, pruneable timeline. It is a separate type from
`HashRing` because its eviction follows the snapshot stream, not the ack stream.

**reconciliation order.** On a snapshot: (1) compare the predicted hash at `snapshot.tick` with `snapshot.hash`;
(2) adopt the server state exactly, no blending of authoritative positions; (3) drop pending intents with
`seq <= entity.appliedSeq`; (4) replay the survivors in `(tick, seq)` order, stepping empty ticks when needed.
A mismatch skips replay entirely: desync is a rejection plus a resync request, not a silent correction (D86/I1).

**interpolation.** Presentation only, between two snapshots, with integer `(numerator, denominator)` maths — no
float leak into the deterministic domain. The snapshot buffer never changes the simulated state, only what is
rendered. A desync clears the buffer so a stale pose cannot be shown after a resync.

**honest limits.** no jitter buffer yet (D149: 100–250 ms is a later number), no protocol message for resync
requests (sent as an intent with a fresh seq until NET-006 owns it), no bandwidth measurement (NET-006), no
cross-room handoff (NET-003), no auth (SEC-001). Tick p95 stays unmeasured.

**ACK** — netcode-engineer, same process.
