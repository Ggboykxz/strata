## 2026-11-18T08:30:00Z | orchestrator -> animation-director | HANDOFF

**claim.** GATE:P1 is signed, NET-001 gave the tick a world, NET-002 gave it a wire. NET-003 is blocked on a
producer-owned Colyseus pin, so the next selectable sig task is NET-005: the animation state machine in core
plus the clip-event manifest schema. Still greybox — no clip is generated, rigged or shipped (I2/I4).

**inputs.** `docs/design/gdd/GDD-ANIM-ARCHITECTURE.md` §4/§5/§6/§7/§8, `packages/core/src/tick.ts`,
`docs/STACK.lock.md` (no new dependency).

**expected outputs.** `packages/core/src/anim-state/` (manifest loader + state machine),
`packages/core/test/anim-state.test.ts`, `packages/content/animations/schema/` + `examples/`, GDD 0.2 → 0.3.

**acceptance.** `pnpm vitest run packages/core/test/anim-state.test.ts` · `pnpm test` · `pnpm typecheck` ·
`node scripts/lint-core-math.mjs` · `pnpm verify` · `pnpm tracer --assert`.

**constraints.** no clock, no float, no dependency in core (I14); no bone transforms on the wire (I3); server
owns every transition (I1); behaviour change updates the GDD in the same PR (I9); one 30-minute unit.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T08:30:00Z | orchestrator -> animation-director | PROPOSAL

**why core.** The client may predict, but only the server may decide. Putting the machine in `packages/core`
means both sides run the *same* transition code (D86) while the server keeps the authority. It is pure,
tick-driven and integer-only, so `lint-core-math` can prove it is deterministic.

**state table.** IDLE → TRANSITIONING → LOCOMOTION → ACTION → RECOVERY → IDLE, as the GDD already declares.
TRANSITIONING lasts 2 ticks, RECOVERY 3. ACTION ends at `transition_tick + durationTicks`. A request during
ACTION is refused (`busy`): an action is a commitment, not a cancel. A request during RECOVERY is queued and
applied on the recovery's last tick, exactly as GDD §8.1 asks.

**tie-break.** Two queued requests collapse to the smallest `(sequence, clipId)` — GDD §8.4 names the tuple.
A later request cannot steal the queue by arriving again; this is deterministic under reordering.

**manifest.** The clip manifest is content, validated on load. A locomotion clip must loop, an action clip
must not; event ticks must be inside the clip and strictly ordered by `(tick, kind)`. A bad manifest throws
`ManifestError` with a code — it is never partially trusted. The TypeScript loader is authoritative; the
JSON Schema in `packages/content/animations/` publishes the same contract, and a test asserts their enums
and required fields agree.

**numbers, sourced.** 5 states; 2-tick blend; 3-tick recovery; clip duration 1..600 ticks; anim_state fields
= u8 + u8 + u16 + u32 + u32 = 12 bytes, inside the 64-byte budget. No foot-slide or retarget number is
invented here — those remain AN-002 measurements.

**deliberate omissions.** no GLB, no bones, no retarget, no delta/compression, no wire codec (NET-006), no
server room (NET-003), no hit-frame reconciliation test (NET-006). The `node:fs` import lives only in the
test, which reads the checked-in content fixture; `lint-core-math` still bans Node in `packages/core/src`.

**ACK** — animation-director, same process.
