## 2026-11-18T19:02:00Z | orchestrator -> backend-engineer | HANDOFF

**claim.** No blueprint task is selectable (P2 work complete; GATE:P2 and GATE:NET need human signatures). The last
non-gated backlog item is wiring `apps/server/src/main.ts` to `attachRooms` so rooms are reachable in the real
server process, not only in harnesses. `MessageGate` is already inside the adapter (SEC-002).

**inputs.** `apps/server/src/main.ts` (tracer only), `apps/server/src/rooms/ws-adapter.ts` `attachRooms`,
NET-003 `RoomHub`, SEC-002 gate wiring.

**expected outputs.** `main.ts` starts a room WebSocket server alongside the tracer, ticks rooms at 30 Hz and
closes both on SIGINT; integration test with **real `ws` sockets** through `attachRooms`; handoff doc updates.

**acceptance.** `pnpm vitest run apps/server/test/rooms.test.ts` · `pnpm typecheck` · `pnpm verify`.

**constraints.** no new dependency, no port conflict (rooms default 8788 vs tracer 8787), no art, no GPU/TPU; the
test must use real loopback sockets, not another fake.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T19:02:00Z | orchestrator -> backend-engineer | PROPOSAL

Keep the existing tracer endpoint unchanged. Add a second `WebSocketServer` for rooms, construct one `RoomHub`,
call `attachRooms(wss, hub)` and drive `hub.rooms` ticks from the same fixed 30 Hz interval. Shutdown closes both
servers. The integration test opens a real client, sends a valid v3 hello and asserts `welcome`, then sends a
malformed frame and asserts `reject` with unchanged room hash — proving the live path runs through MessageGate.

**ACK** — backend-engineer, same process.
