## 2026-11-18T19:24:00Z | backend-engineer -> all | EVIDENCE

**claim.** The last non-gated backlog item is closed: `apps/server/src/main.ts` starts a second WebSocket endpoint
for rooms (default 8788, tracer stays 8787), calls `attachRooms` — which routes every frame through `MessageGate`
(SEC-002) — and ticks rooms at the fixed 30 Hz alongside the tracer.

**evidence** (`docs/state/evidence/` ROOM-WIRING dir): rooms 19/19 (including a **real loopback socket** test),
typecheck 0, full 302/302, verify 19/19.

**live-path proof.** A real `ws` client connects to `/rooms?room=live&nonce=1`, sends a v3 hello and receives
`welcome`; it then sends a malformed frame and receives `reject{reason:'malformed'}`, with the authoritative room
hash unchanged. No fake socket is used in this test.

**small enabler.** `RoomHub.ids` was added so the server can tick every live room; no other behavior changed.

**honest limits.** No matchmaking service, no persistence, no 4-client load measurement, no art, no GPU/TPU.
This is wiring, not a NET-GATE measurement.

**locks.** 5 globs, one sorted commit; release after this commit.
