## 2026-11-18T09:28:00Z | orchestrator -> netcode-engineer | HANDOFF

**claim.** A0005 records the Director's "bypass les limites et go next". NET-006 therefore includes the three
previously deferred items: a resync frame in the wire, an adaptive jitter buffer, and a local measurement harness
(checkpointed separately as PR-N1). The core task stays anim STATE replication, server-validated transitions
and server-owned hit frames.

**inputs.** `packages/core/src/anim-state/*` (NET-005 machine), `apps/game/src/net/predictor.ts` (resync flag),
`packages/protocol/src/binary.ts` (frame table v2), GDD-ANIM-ARCHITECTURE §4/§7/§15, A0001 separation.

**expected outputs.** `packages/protocol/src/anim.ts` + wire v3, `apps/server/src/combat/*`,
`apps/game/src/net/jitter.ts`, tests, GDD-ANIM-ARCHITECTURE and GDD-NETCODE updates, NET-006 acc repaired.

**acceptance.** `pnpm vitest run packages/protocol/test/anim.test.ts` · `pnpm vitest run apps/server/test/combat.test.ts`
· `pnpm vitest run apps/game/test/jitter.test.ts` · `pnpm test` · `pnpm typecheck` · `pnpm verify` · `pnpm tracer --assert`.

**constraints.** no bone transforms on the wire (I3/A0001), no client-authoritative hit (I1), no art (I2),
no new dependency, no fake measurement (I13).
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T09:28:00Z | orchestrator -> netcode-engineer | PROPOSAL

**wire v3.** Add `AnimFrame` (12-byte state + entity id) and `ResyncFrame` (client, acked tick, reason) to the
frame table and bump `PROTOCOL_VERSION` 2 → 3 with the supported range 3..3. v2 frames stay decodable where their
layout is unchanged, but the handshake refuses v2 peers: a wire change must not silently interoperate. All
existing v2 tests are updated to v3 rather than left asserting an obsolete constant.

**server authority.** The server keeps an `AnimRuntime` per entity. A client anim request is validated with
`applyRequest`; an illegal transition is refused with a reason and never mutates the authoritative runtime. Hit
frames come from `eventsAt` on the server at the exact absolute tick; a client claiming a hit is ignored (I1/I3).

**jitter buffer.** Presentation-only, 100–250 ms (D149), integer ticks: `renderTick = latestServerTick - bufferTicks`.
The buffer adapts between 3 and 8 ticks at 30 Hz using observed inter-snapshot gaps, and never changes simulation
state. No number is claimed as a network measurement — it is a tunable.

**PR-N1 separate.** A `tools/sim/net/` harness will measure local tick CPU p95 and framed byte rates with a
logged command. Those numbers are labelled as local simulation measurements, not client RTT.

**ACK** — netcode-engineer, same process.
