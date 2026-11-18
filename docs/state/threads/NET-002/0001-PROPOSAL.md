## 2026-11-18T08:18:00Z | orchestrator -> netcode-engineer | HANDOFF

**claim.** GATE:P1 is signed and NET-001 landed the integer tick. NET-002 is the wire that carries it: the
JSON tracer codec cannot express a 64-entity snapshot within a stated length, has no version handshake, and
would let a peer parse a frame that is one byte too long. NET-002 replaces it with an exact binary contract.

**inputs.** `docs/design/gdd/GDD-NETCODE.md` §4/§7/§8/§9, `packages/protocol/src/tracer.ts` (v1, kept),
`packages/core/src/tick.ts` (`toWireMm`, `EntityState`), `docs/STACK.lock.md` (no new dependency).

**expected outputs.** `packages/protocol/src/binary.ts` (frame table, encode/decode, handshake, protocol
errors), `packages/protocol/src/index.ts` (v2 exported next to v1), tests for every frame class and every
refusal, `GDD-NETCODE` 0.3 → 0.4.

**acceptance.** `pnpm vitest run packages/protocol` · `pnpm test` · `pnpm typecheck` ·
`node scripts/lint-core-math.mjs` · `pnpm verify` · `pnpm tracer --assert`.

**constraints.** no dependency (DataView only); no clock, no Node, no DOM; a version outside the range is
rejected, never coerced; a frame is exact, a trailing byte is an error; no delta compression and no AoI —
those are NET-101 and must not be claimed here.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T08:18:00Z | orchestrator -> netcode-engineer | PROPOSAL

**why binary now.** The GDD already promised binary in NET-002, and the budget line (12 KB/s down) cannot be
reasoned about with JSON whose size depends on field names and numeric formatting. A fixed layout makes the
frame size a constant that a test can assert, and makes "one byte too many" a decidable error instead of a
parser's judgement call.

**why v1 stays.** `apps/game` and `apps/server` still speak the JSON tracer protocol. Deleting v1 in the same
task would force a client rewrite into a netcode task and blur the evidence. v2 is exported alongside;
`PROTOCOL_VERSION` becomes 2, `TRACER_PROTOCOL_VERSION` stays 1 until the game client migrates.

**what "version handshake" means here.** `Hello{version}` → `Welcome{version}` or `Reject{version}`. Exactly
one version is supported today (2..2). A range rather than an equality because NET-004 will need to widen it,
and the shape of the answer must not change when it does.

**hash on the wire.** Core hashes to 8 lowercase hex chars (FNV-1a u32). The wire carries the u32, not the
string: 4 bytes instead of 8, and `hashToU32` refuses anything that is not exactly 8 lowercase hex chars, so a
malformed hash cannot be silently turned into `00000000`.

**length discipline.** Every decoder checks the exact expected length before reading a field. A snapshot
declares its entity count; a count that disagrees with the byte length is rejected, not partially read.

**deliberate omissions.** No delta, no bit-packing, no AoI, no compression, no encryption, no message
classes beyond the six the GDD names. The 64-entity snapshot is 1 551 bytes = 46 530 B/s at 30 Hz, which is
**3.9× over** the 12 KB/s budget. That is measured and recorded as NET-101's problem, not hidden behind an
average.

**ACK** — netcode-engineer, same process.
