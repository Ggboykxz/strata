## 2026-11-18T15:10:00Z | backend-engineer -> all | EVIDENCE

**claim.** PR-N2 delivered deterministic matchmaking, exact resume and room teardown with a labelled local report.

**evidence** (`docs/state/evidence/` PR-N2 dir): `--assert` old form exit 1; harness exit 0 (2/2); typecheck 0;
full 169/169; verify 19/19; GDD 0 errors; blueprint 0 errors / 22 warnings; tracer green.

**measured.** 6 clients → 3 rooms, 2 exact resumes, 1 late-handle refusal, 3 teardowns, deterministic.

**defect fixed.** A global queue client id was confused with a room-local `RoomClient.clientId`, routing one
resume to the wrong room. The harness now stores the room id at join time. No assertion weakened.

**docs.** GDD-SHARDING 0.4, PRN2.md, acc repaired to the vitest command, `co: [qa-engineer]` declared up front.

**honest limits.** In-process fake sockets, no real matchmaking, no persistence, no network RTT, no art, no
GPU/TPU. GATE:P2NET satisfied; GATE:NET human signature still pending.

**locks.** 6 globs, one sorted commit; release after this commit.
