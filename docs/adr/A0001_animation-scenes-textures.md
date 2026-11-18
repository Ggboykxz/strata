# A0001 — separated mesh, animation and texture architecture

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18** |
| owner | animation-director |
| authority | master §9, I3, GDD-ANIM-ARCHITECTURE, GATE:P0 signed |
| relates to | GDD-ANIM-ARCHITECTURE, GDD-AI-ASSETS, ART_BIBLE |

## Context

Merging a mesh and its animation into one GLB couples geometry to a clip set. That forces a re-export of
the character whenever a clip changes, duplicates skeleton data per clip, and makes it possible to send bone
transforms on the wire. I3 forbids that: mesh GLBs and animation GLBs are never merged, and only animation
**state** crosses the wire.

## Decision

1. One skeleton pack per archetype, stored separately from mesh GLBs. Bone names and parent indices are
   versioned in the pack.
2. Animation clips are separate GLB files referencing a skeleton pack id. A clip change never rewrites a mesh.
3. The wire carries `anim_state v1 {archetype_id, clip_id, state, transition_tick, sequence}`. Bone transforms are never replicated on the wire; joint positions and skinning matrices are client-local.
4. Hit frames are generated and validated on the server; the client's predicted clip never decides damage.
5. Textures use four-channel sets with per-instance fact-variant ids in an instance buffer, not separate
   materials per variant.

## Consequences

- Retarget coverage must be 100 % of animated bones before a pack ships (AN-002).
- A skeleton rename requires a new pack version and a retarget map; old clips stay readable.
- Animation state payload is bounded at 64 bytes per entity per snapshot (GDD-ANIM-ARCHITECTURE).
- No hero asset, texture bake or motion generation before NET-GATE passes (I2) — this ADR defines structure,
  not production.

## Rejected alternative

**Merged mesh+animation GLB.** Rejected: it reintroduces per-clip mesh duplication, makes server-side hit
frames dependent on client clip files, and blurs the I3 boundary. Revisit only if a Director-signed ADR
reverses I3 — which is not proposed.

## Verification

`node scripts/validate-art-bible.mjs` checks that the ART_BIBLE and this ADR still state the separation
rule and the numeric budgets. Retarget and separation validators remain separate tasks (AN-001, AN-002).

## Change log

| version | date | change | by |
|---|---|---|---|
| 1.0 | 2026-11-18 | accepted: separated mesh/animation/skeleton architecture | animation-director |
