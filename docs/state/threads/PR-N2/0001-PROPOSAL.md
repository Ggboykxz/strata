## 2026-11-18T14:55:00Z | orchestrator -> backend-engineer | HANDOFF

**claim.** PR #1 is merged into `main` (`096fdfe`, Director merge with recorded admin bypass). The next
deterministic task is **PR-N2** (P2NET, sup, deps `[NET-003]` satisfied): matchmaking, room teardown and exact
resume. It is the last P2NET task, so `GATE:P2NET` becomes satisfied afterwards. PR #2 remains open but its unique
evidence was ported at `d51a5c0`.

**inputs.** NET-003 `RoomHub` / resume handles / reconnect window, GDD-SHARDING §5/§7, PR-N1/N3 harness pattern.

**expected outputs.** `tools/sim/persist/prn2_rooms.ts` + `test/prn2.test.ts`, `docs/qa/prototypes/PRN2.md`,
GDD-SHARDING version bump, PR-N2 acc repaired to a real command, `co: [qa-engineer]` declared up front.

**acceptance.** `pnpm vitest run tools/sim/persist/test/prn2.test.ts` · `pnpm test` · `pnpm typecheck` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** integer ticks only; no client-chosen identity; teardown only after the configured window;
labelled local greybox simulation, no real matchmaking service, no art, no GPU/TPU.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T14:55:00Z | orchestrator -> backend-engineer | PROPOSAL

**matchmaking.** A deterministic queue orders clients by `(rating, client_id)` and fills rooms up to capacity.
Same input order always yields the same rooms — no wall clock, no random.

**exact resume.** A disconnect keeps the handle alive for `reconnectTicks`; a resumed client must get its
**original entity id** and a snapshot at the current tick. A late handle is refused and the entity freed only
after the window (NET-003 contract).

**teardown.** A room is removed once every client has been gone past the window; a room with any live member is
never torn down. The report counts rooms created, exact resumes, late-handle refusals and teardowns.

**honest limits.** In-process fake sockets, no real matchmaking backend, no persistent database, no network RTT.
The label says "local greybox rooms — not a matchmaking service".

**ACK** — backend-engineer, same process.
