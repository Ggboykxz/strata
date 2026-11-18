# TDD-ANIM — separated animation architecture

| field | value |
|---|---|
| id | TDD-ANIM |
| status | DRAFT |
| owner | animation-director |
| gdd | GDD-ANIM-ARCHITECTURE |

## Context

A0001 separates mesh GLBs, animation GLBs and skeleton packs. Only animation state crosses the wire and hit
frames are server-authoritative. This TDD states the observable behaviour before AN-001/AN-002 implement it.

## Acceptance

1. **GIVEN** a clip change **WHEN** the asset is exported **THEN** the mesh GLB is byte-identical and only
   the animation GLB changes.
2. **GIVEN** a retarget map missing one bone **WHEN** `validate-retarget` runs **THEN** it exits 1 and names
   the bone.
3. **GIVEN** a client-side hit frame **WHEN** the server ticks **THEN** the server frame is authoritative.
4. **GIVEN** one entity in a snapshot **WHEN** animation state is serialized **THEN** the payload is at most
   64 bytes and contains no bone transform.

## Out of scope

No merged GLB, no bone-transform replication, no generation before the P0-006 whitelist.
