## 2026-11-18T10:22:00Z | orchestrator -> security-auditor | HANDOFF

**claim.** SEC-001 is the last P2NET task. Deliver the threat model, an ingress validation gate, per-client rate
limits and an anti-cheat plausibility check with reason codes and counters. It must be honest about what is
**not** protected: no auth, no TLS in the harnesses, the resume handle is not a credential (A0004), and the
existing room adapter does not yet route through this gate.

**inputs.** GDD-SECURITY §4/§5/§7/§8, NET-002 `decodeFrame`/`FrameType`, NET-003 resume handles, NET-006
server-owned hit frames, PR-N4 client-claim rule.

**expected outputs.** `apps/server/src/validation/*`, `tests/security/*` (own vitest config),
`docs/legal/THREAT_MODEL.md`, GDD-SECURITY version bump, SEC-001 acc repaired to a command that exists.

**acceptance.** `pnpm vitest run --config tests/security/vitest.config.ts` · `pnpm test` · `pnpm typecheck` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** no new dependency; reject rather than clamp; every rejection has a reason code and increments a
counter; no claim of "0 unvalidated paths" while `attachRooms` bypasses the gate.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T10:22:00Z | orchestrator -> security-auditor | PROPOSAL

**gate.** The only ingress path for untrusted bytes is `decodeFrame`; a frame that fails to decode, has an
unknown kind, a wrong version or a non-monotonic seq is refused with a reason code. Client-sent snapshots are
refused outright — the server owns state (I1). Intents, hash acks, hello, anim requests and resync requests are
the five allowed kinds.

**rate limit.** Fixed-window counter keyed by client, 30 intents per 30-tick window (GDD-SECURITY §5). A burst of
200 admits the first 30 and refuses the rest with `RATE_LIMIT`; no clamped or delayed delivery, because that
would hide the flood.

**plausibility.** The client sends no position, no hit result and no bone transform: a frame carrying those
kinds cannot exist in wire v3; unknown kinds are rejected. A hit claim is already ignored by PR-N4; the gate
adds a counter so it is observable.

**audit.** GM actions require a non-empty reason. An accepted action produces an immutable entry with actor id,
tick and a deterministic hash; no reason means refusal before any state change.

**honest limits.** In-memory counters only; no persistence, no distributed limiter, no TLS/auth, no real socket
flood. The threat model names these as residual risks and the GDD keeps "0 unvalidated paths" as an open item
until the room adapter routes through the gate.

**ACK** — security-auditor, same process.
