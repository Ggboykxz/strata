## 2026-11-18T09:40:00Z | netcode-engineer -> all | EVIDENCE

**claim.** NET-006 is implemented and the three deferrals from NET-004 are no longer deferrals: wire v3 carries
anim state and resync requests, the jitter buffer is bounded at 100–250 ms, and hit frames are server-owned.
The local measurement harness is checkpointed separately as PR-N1 (A0005).

**evidence** (`docs/state/evidence/20261118T091539Z-NET-006/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm test --filter @strata/netcode -t animstate` | **1** | `CACError` |
| `01-anim-wire.log` | `pnpm vitest run packages/protocol/test/anim.test.ts` | 0 | **5/5** |
| `02-protocol-all.log` | `pnpm vitest run packages/protocol` | 0 | **28/28** |
| `03-combat.log` | `pnpm vitest run apps/server/test/combat.test.ts` | 0 | **7/7** |
| `04-jitter.log` | `pnpm vitest run apps/game/test/jitter.test.ts` | 0 | **5/5** |
| `05-typecheck.log` | `pnpm typecheck` | 0 | strict |
| `06-full-tests.log` | `pnpm test` | 0 | **122/122** (12 files) |
| `07-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock/RNG/transcendental/foreign import |
| `08-verify.log` / `12-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `09-gdd.log` / `10-blueprint.log` / `11-tracer.log` | validators and tracer | 0 | 32 modules · 63 tasks · green |

**what the tests prove.**
- The 17-byte anim frame is exactly the 12-byte core anim_state plus 5 bytes of entity id and type; a real
  `AnimState` round-trips byte-for-byte. Resync frames round-trip at 10 bytes and an unknown reason is refused.
- A v2 hello is refused at the handshake; v3 is welcomed. No silent interop with an old wire.
- The server refuses replayed, malformed and unknown anim requests without mutating its runtime; it keeps one
  runtime per entity and advances them by tick.
- A hit fires at `startTick + offset` exactly once, a client claim never fires one, and `clear()` allows a clean
  resync. The jitter buffer stays inside 3..8 ticks, tracks the observed gap, ignores rewinds and resets to the
  floor.

**three defects found and fixed while implementing.**
1. `Room.handleBytes` hardcoded the v2 handshake bounds (`>= 2 && <= 2`). It now imports
   `SUPPORTED_MIN_VERSION/MAX_VERSION` from the protocol, so a wire bump cannot desynchronise room admission.
2. The jitter test initially expected growth under a 5-tick gap; the buffer correctly tracks the observed gap and
   stops at 5. Test expectations were corrected to a 10-tick gap (and documented here, not hidden).
3. A0005 failed `validate-docs` D2 until its headings became `## Context` and `## Decision`. Fixed; verify green.

**GDD / blueprint.** GDD-ANIM-ARCHITECTURE 0.3 → 0.4 (17-byte frame, server-owned validation/hits),
GDD-NETCODE 0.5 → 0.6 (v3 handshake, anim/resync frames, jitter bounds). NET-006's acc replaced by three real
test paths. **7 broken accs remain**, re-counted.

**honest limits.** Jitter bounds are tunables, not measured RTT. Tick CPU p95 and framed byte rates are still
unmeasured here — PR-N1 produces them with a logged local harness (A0005). No GPU/TPU needed; the runtime has
neither. No art, no bones (A0001/I3), no auth (SEC-001).

**locks.** 17 globs (15 planned + 2 follow-ups for the v3 room test and handshake fix), one sorted acquisition
each; all released.
