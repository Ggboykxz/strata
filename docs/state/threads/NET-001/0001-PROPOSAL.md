## 2026-11-18T08:05:00Z | orchestrator -> gameplay-engineer | HANDOFF

**claim.** GATE:P1 is signed, so NET-001 is the first selectable task. TRACER-001 proved a 30 Hz tick with
equal hashes for ONE capsule; NET-001 must make the tick a real world: many entities, canonical intent
application, integer quantization, and a hash that can be compared at the acked tick.

**inputs.** `docs/CONSTITUTION.md` §0.3 (I1, I14), `docs/design/gdd/GDD-NETCODE.md` §4/§7/§15,
`packages/core/src/tracer.ts` (the walking skeleton), `packages/core/src/index.ts`.

**expected outputs.** `packages/core/src/tick.ts` (world, step, quantization bound, FNV-1a hash, hash ring),
`apps/server/src/sim/host.ts` (headless host, no socket, no clock), tests for both, GDD 0.2 → 0.3.

**acceptance.** `pnpm vitest run packages/core` · `pnpm vitest run apps/server` · `pnpm typecheck` ·
`node scripts/lint-core-math.mjs` · `pnpm test` · `pnpm verify` · `pnpm tracer --assert`.

**constraints.** no clock, no `Math.random`, no transcendental, no dependency in core (I14/D147); the client
sends intent only (I1); no authoritative dt from the client (D148); no socket, no Babylon on the server tick
(I3); behaviour change updates the GDD in the same PR (I9); one 30-minute unit.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T08:05:00Z | orchestrator -> gameplay-engineer | PROPOSAL

**why this shape.** The tick must be the *same code* on both sides (D86). So the world, the command
application and the hash live in core; the server owns only the policy around it (validation at ingress,
hash history, snapshots). The host has no timer: the caller decides when a tick happens, which is what makes
the tests deterministic and the future room loop (NET-003) replaceable.

**ordering.** Commands are sorted by (entity, seq) before application. Arrival order is a network artefact;
if it leaked into the state, two identical sessions would hash differently. A non-increasing seq is dropped,
which covers replay and out-of-order delivery without a special case.

**quantization.** Core is already integer millimetres, so "quantization" is not a lossy conversion at the
boundary; it is a *range contract*. `toWireMm` throws on a fraction or on an int32 overflow instead of
truncating (GDD edge case 5: different integer widths must be refused, not silently narrowed).

**hash at the acked tick.** `HashRing` is bounded by tick count, never by a clock. An ack for a tick that is
no longer recorded returns `unknown`, not `ok` (GDD edge case 3).

**known omissions, deliberate.** no wire format (NET-002), no prediction/reconciliation (NET-004), no AoI
(NET-101), no perf measurement (NET-006), no rooms (NET-003). Diagonal movement is axis-independent, as in
the tracer: a tuning question for PR-S1, not a number to invent here.

**ACK** — gameplay-engineer, same process.
