# ART BIBLE — STRATA

| field | value |
|---|---|
| id | ART_BIBLE |
| version | 1.0 |
| owner | animation-director |
| status | ACTIVE |
| authority | HIGH_CONCEPT v1.3, A0001, GDD-ANIM-ARCHITECTURE, I2 |
| validated by | `node scripts/validate-art-bible.mjs` |

This document fixes the **structure** of art before any art is produced. NET-GATE is unpassed: no hero
asset, texture bake, motion generation or scene generation. Everything below is greybox geometry and rules.

## 1. Separation rule (A0001 / I3)

Mesh GLBs and animation GLBs are separate files. One skeleton pack per archetype; clips reference the pack
by id. Animation **state** crosses the wire, never bone transforms. Hit frames are server-authoritative.
A merged GLB is a P0 defect, not a style choice.

## 2. Kits and cells

Gameplay space is a kit on a 2 m grid, streamed in 64 m cells. A generated scene is a reference board, not
a level. Props are placed by fact-driven variants; a variant changes geometry or placement, not only text.

## 3. Instancing and variants

Repeated props use thin instances with a per-instance variant id in an instance buffer, never duplicated
meshes or per-variant materials. Fact variants: burnt, ruined, flooded, neon. Variant id is recorded in the
fact log and in the snapshot (GDD-CONSEQUENCE).

## 4. LOD and streaming

LOD0/1/2 plus impostors beyond 120 m. Cells load through an AssetContainer with add/remove/dispose, never a
leak. Static props are never replicated. Gaussian splats are allowed only as distant backdrops beyond 120 m,
never collidable, never the gameplay floor, and at most 25 % of a cell GPU budget.

## 5. Lighting and materials

One IBL for the whole game, three locked lighting presets, PBRMetallicRoughnessMaterial (or OpenPBR if the
pinned Babylon version supports it). Four-channel texture sets with faction tints. Every generated asset
reacts to the same presets.

## 6. Numeric budgets

| budget | limit | source |
|---|---|---|
| draw calls per cell | <= 250 | master §6 |
| triangles | <= 1.5 M | master §6 |
| GPU textures | <= 350 MB | master §6 |
| load compressed | <= 25 MB | master §6 |
| full-rate skeletons | <= 20 | master §6 |
| animation state payload | <= 64 bytes per entity per snapshot | GDD-ANIM-ARCHITECTURE |
| splat share | <= 25 % of cell GPU budget | master §8.7 |
| time to play | <= 8 s | master §6 |

These are ceilings, not targets to fill. No number here is estimated; each cites its source.

## 7. Licence and provenance

No asset enters the repo without a manifest citing the P0-006 audit id, a licence id and a model revision.
Nine entries are approved; territory-restricted candidates are rejected for now (ND-006). No Mixamo asset,
no non-commercial weight, no binary in git. Throughput stays NOT COMPUTABLE until AI-001 measures it.

## 8. Gate order

No hero art before NET-GATE (I2). AN-001 validates separation, AN-002 validates retarget coverage, WG-001
validates scene budget and collision parity. This bible is the contract those validators enforce.

## 9. Change log

| version | date | change | by |
|---|---|---|---|
| 1.0 | 2026-11-18 | art structure, budgets and separation rule before any asset | animation-director |
