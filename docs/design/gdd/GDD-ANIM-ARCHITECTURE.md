# GDD-ANIM-ARCHITECTURE — DRAFT

| field | value |
|---|---|
| id | GDD-ANIM-ARCHITECTURE |
| version | 0.3 |
| owner | animation-director |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships and is re-signed at each gate.

## 1. Identity, version, owner, status

ID GDD-ANIM-ARCHITECTURE, version 0.3, owner animation-director, status **DRAFT**. Derived from P1-001 VISION and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

A character changes clip without changing skeleton; only animation state crosses the wire and hit frames stay authoritative.

## 3. High Concept link

I3: mesh GLBs and animation GLBs are never merged; N2 propagation is visible through physical variants, not bone data.

## 4. Deterministic rules

1. One skeleton pack per archetype; mesh and animation GLBs are separate files with separate hashes.
2. The wire carries state enum + transition tick + clip id, never bone transforms or joint positions.
3. Server validates every transition against the state machine and owns hit frames.

## 5. Numbers with source

- <= 20 full-rate skeletons per client | SOURCE: master §6 budgets
- retarget coverage = 100% of animated bones | TUNABLE 0.98..1.00 | plan: AN-002 retarget audit
- foot slide <= 2 cm over a 1 m walk | TUNABLE 0..5 cm | plan: AN-002 clip proof
- animation state payload <= 64 bytes per entity per snapshot | TUNABLE 32..128 | plan: NET-006
- states = 5 (idle, transitioning, locomotion, action, recovery) | SOURCE: packages/core/src/anim-state/machine.ts ANIM_STATES
- blend window = 2 ticks = 66.7 ms at 30 Hz | TUNABLE 2..4 | plan: NET-006 measures hit-frame drift against the server
- recovery window = 3 ticks = 100 ms at 30 Hz | TUNABLE 2..5 | plan: PR-S1 feel pass; the number is a commitment, not a guess
- clip duration = 1..600 ticks (0.033..20 s) | SOURCE: packages/core/src/anim-state/manifest.ts MIN_CLIP_TICKS / MAX_CLIP_TICKS
- anim_state v1 fields = 12 bytes (u8 archetype + u8 state + u16 clip + u32 tick + u32 seq) | SOURCE: ANIM_STATE_WIRE_BYTES; 52 B under the 64 B budget

## 6. State machine

STATE_IDLE → TRANSITIONING → LOCOMOTION → ACTION → RECOVERY → STATE_IDLE. Server copy is authoritative; client copy is predictive.

| state | leaves when | next |
|---|---|---|
| IDLE | a clip is accepted | TRANSITIONING |
| TRANSITIONING | `transition_tick + 2` | LOCOMOTION (loop clip) or ACTION (action clip) |
| LOCOMOTION | a new clip is accepted | TRANSITIONING |
| ACTION | `transition_tick + duration_ticks` | RECOVERY |
| RECOVERY | `action_end + 3` | the queued clip (TRANSITIONING) or IDLE |

Requests: accepted from IDLE, LOCOMOTION and TRANSITIONING (a new clip replaces the blend); **queued** during RECOVERY and applied on its last tick; **refused** during ACTION (`busy` — an action is a commitment, not a cancel). Unknown clip, wrong archetype and a non-increasing sequence are refused with a reason code; the state is unchanged.

## 7. Data contract

anim_state v1 {archetype_id u8, state u8, clip_id u16, transition_tick u32, sequence u32} = 12 bytes. `sequence` is the anti-replay counter: a request with `sequence <= current` is refused, never reapplied. STATE is one of the five tokens in §6; clip_id 0 means "no clip".

clip manifest v1 {version: 1, clips[]}, each clip {id u16, archetype u8, kind: locomotion|action, durationTicks, loop, events[{tick, kind: hit|footstep}]}. Locomotion clips loop, action clips do not; events are strictly ordered by (tick, kind) and must fall inside the clip. The executable validator is `packages/core/src/anim-state/manifest.ts`; the published JSON Schema is `packages/content/animations/schema/anim_manifest.v1.schema.json`, and the greybox example is `packages/content/animations/examples/humanoid.greybox.v1.json`.

Skeleton pack v1 lists exact bone names and parent indices. Migration: bone rename requires a retarget map and a new pack version.

## 8. Edge cases

1. Clip requested while in RECOVERY: server queues it and applies it on the recovery's last tick, not on the request tick.
2. Client predicts a transition the server rejects: client snaps back to the authoritative state.
3. Retarget map missing one bone: pack is rejected, no clip is shipped.
4. Two clips request the same transition tick: deterministic tie-break by (sequence, clip_id), smallest wins; a later request cannot steal the queue.
5. Hosted text-to-motion output without a licence id: rejected by the P0-006 whitelist before import.
6. Clip requested during ACTION: refused with `busy`; no cancel, no queue.
7. Action shorter than the 2-tick blend: it enters RECOVERY directly, at the blend tick.

## 9. Failure states

1. Unknown clip id: transition refused, state machine stays in previous state.
2. Retarget mismatch: asset is quarantined and the manifest names the missing bone.
3. Server hit frame disagrees with client prediction: server frame wins, desync telemetry emitted.

## 10. Interaction matrix

ANIM-ARCHITECTURE × NETCODE: state fields are part of SnapshotMessage. ANIM-ARCHITECTURE × AI-ASSETS: generated clips require a whitelist entry.

## 11. Feedback per state change

Transition rejection emits a reason code; the player sees the authoritative pose, not a silent mismatch.

## 12. Accessibility

Motion reduction option replaces camera shake and large transitions with numeric cues; no essential info is carried by motion alone.

## 13. Localization

State names are tokens; locale copy lives in UI assets, never in clip names.

## 14. Telemetry and success metric

transition_rejections, retarget_coverage, anim_state_bytes, foot_slide_cm. Success metric: 100% coverage and 0 bone transforms on the wire.

## 15. Acceptance tests

- GIVEN one archetype and two clips WHEN a transition is requested THEN only anim_state v1 is serialized.
- GIVEN a missing bone in a retarget map WHEN validate-retarget runs THEN it exits 1 and names the bone.
- GIVEN a client-side hit frame WHEN the server ticks THEN the server hit frame is authoritative.
- GIVEN the greybox manifest WHEN it is loaded THEN every clip validates, and a duplicate id, a looping action, an event past the clip or an unordered event pair is refused.
- GIVEN IDLE and a walk clip WHEN the blend tick arrives THEN the state is LOCOMOTION; GIVEN an action WHEN its last tick arrives THEN RECOVERY, then IDLE 3 ticks later.
- GIVEN RECOVERY and one queued clip WHEN the last recovery tick arrives THEN the clip starts on that tick, and a tie is broken by (sequence, clip_id).

## 16. Perf budget impact

<= 64 bytes per entity per snapshot; <= 20 full-rate skeletons; no additional mesh allocation on transition.

## 17. Explicit out of scope

No merged GLB, no bone transform replication, no hosted generation before license audit, no scene generation before NET-GATE.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| Who owns the hit-frame tick offset — the clip manifest or the combat system? | animation-director + netcode-engineer | NET-006 |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.3 | 2026-11-18 | NET-005: state table, 12-byte contract, manifest schema, measured windows | animation-director |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields, sources and ranges | GDD-002 |
