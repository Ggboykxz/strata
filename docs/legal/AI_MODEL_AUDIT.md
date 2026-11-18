# AI MODEL & TOOL LICENSE AUDIT — STRATA

| field | value |
|---|---|
| id | AUDIT-2026-11-18-P0-006 |
| date | 2026-11-18 |
| owner | asset-pipeline |
| status | **BINDING** — no model or tool may be used before its row is `APPROVED` |
| authority | master §8.1 (8 steps), §10.4–§10.7, I4 |
| evidence | `docs/state/evidence/20261118T012845Z-P0-006/01-license-metadata.log` |

This is a **metadata-only audit**. No model weights, tool installers or generated outputs were downloaded,
executed or created. Nothing here licenses a model implicitly: an absent row means NOT_APPLICABLE, not
APPROVED. A version bump is a new audit (§8.1 step 8).

## Rule applied (§8.1)

1. fetch model card + LICENSE + terms; record URL, version/date and a license-text hash;
2. classify PERMISSIVE / COMMUNITY-CAPPED / NON-COMMERCIAL / RESEARCH-ONLY;
3. reject NON-COMMERCIAL and RESEARCH-ONLY outright;
4. territory-restricted or attribution-bound licences need a recorded note **and Director approval**;
5. audit transitive dependencies, including research-only body models (SMPL/AMASS) and gated models;
6. for hosted tools, verify rights over OUTPUTS and commercial use;
7. verify the exact version exists and is downloadable now; never invent a version;
8. pin the version (commit SHA / weight revision); any bump is a new audit.

`NOT_FOUND` and `REJECTED` do not block the project: the fallback in the last column applies.

## Approved — safe to use under the recorded conditions

| id | candidate | version / revision | licence + hash | source | output rights | verdict |
|---|---|---|---|---|---|---|
| FLUX-SCHNELL | FLUX.1-schnell | HF rev `741f7c3c…` | apache-2.0 (model card + repo `LICENSE`, `261eeb9e…`) | huggingface.co/black-forest-labs/FLUX.1-schnell | commercial use allowed; attribute per licence | **APPROVED** — hero 2D, 16 GB tier |
| INSTANTMESH | InstantMesh | GitHub main | Apache-2.0, blob `261eeb9e…` | github.com/TencentARC/InstantMesh | commercial use allowed | **APPROVED** — geometry fallback |
| TRIPOSR | TripoSR | GitHub main | MIT, blob `6c440ca1…` | github.com/VAST-AI-Research/TripoSR | commercial use allowed | **APPROVED** — geometry fallback |
| MESH2MOTION | Mesh2Motion app | GitHub main | code MIT `1edc9340…`, art CC0 `94ad1fbd…` | github.com/Mesh2Motion/mesh2motion-app | CC0 animations, commercial use, no credit required | **APPROVED** — rig + creature animation |
| KOKORO | Kokoro-82M | HF rev `f3ff3571…` | apache-2.0 | huggingface.co/hexgrad/Kokoro-82M | check weight card per release before shipping | **APPROVED** — TTS |
| JSFXR | jsfxr | GitHub master | **Unlicense** `6d9eabbb…` (public domain, not MIT as the master's shorthand said) | github.com/chr15m/jsfxr | free and unencumbered outputs | **APPROVED** — SFX |
| COMFYUI | ComfyUI | GitHub master | GPL-3.0 tool, blob `f288702d…` | github.com/Comfy-Org/ComfyUI | outputs unencumbered; tool licence does not infect outputs | **APPROVED_WITH_CONDITIONS** — versioned workflow JSON, every custom node separately audited and pinned |
| GLTF-TRANSFORM | glTF-Transform | GitHub main | MIT, blob `066192ec…` | github.com/donmccurdy/glTF-Transform | commercial use allowed | **APPROVED** — Draco/KTX2 export tooling |

## Blocked pending Director approval — do NOT use yet

These are not rejected: they are community/territory-restricted or attribution-bound. §8.1 step 4 requires a
Director decision after checking where STRATA will be distributed and played. STRATA is public and intended
for FR/EN distribution, so the EU exclusion is material.

| id | candidate | evidence | issue | fallback |
|---|---|---|---|---|
| HUNYUAN3D | Hunyuan3D 2.0 (`tencent/Hunyuan3D-2`, HF rev `9cd649ba…`) | `tencent-hunyuan-community`, GitHub LICENSE `a37e08f3…` | community licence excludes EU/UK/South Korea; some source files state NON-COMMERCIAL exceptions | InstantMesh / TripoSR + Blender bake |
| HUNYUAN3D-V25 | requested v2.5 / v3.0 | not verified on 2026-11-18 | **NOT_FOUND** as requested versions; never invent a version | newest audited version only |
| HUNYUAN3D-PAINT | Hunyuan3D-Paint | same community family as HUNYUAN3D | no separate permissive text verified | multiview projection + Blender bake |
| HY-MOTION | HY-Motion 1.0 (HF rev `620dd559…`) | `tencent-hunyuan-community`, GitHub License.txt `163efa92…` | licence expressly does NOT apply in EU/UK/South Korea; check SMPL/AMASS-type research-only body-model dependency | Mesh2Motion CC0 → procedural keyframes |
| HY-WORLD | HY-World 2.0 (HF rev `d78a16c9…`) | `tencent-hy-world-2.0-community`, GitHub License.txt `32c17df3…` | EU/UK/South Korea excluded; full world-generation inference code listed as "coming soon" | procedural heightmap + kit assembly |
| SDXL | SDXL base 1.0 (HF rev `46216598…`) | `openrail++` | community-capped / attribution-bound; needs distribution-scope decision | FLUX.1-schnell |
| ACTIONFORGE | ActionForge browser tool | actionforge.app/help/main-page | tool © CGstuff all rights reserved; animations CC0; **output rights not stated** | Blender IK + socket parenting |

## Rejected — do NOT use

| id | candidate | evidence | reason | fallback |
|---|---|---|---|---|
| FLUX-DEV | FLUX.1-dev (HF rev `3de623fc…`) | `flux-1-dev-non-commercial-license` | **NON-COMMERCIAL** — §8.1 step 3 outright reject | FLUX.1-schnell |
| MUSICGEN | MusicGen weights | model card: code MIT (`b93be905…`), weights **CC-BY-NC 4.0** | **NON-COMMERCIAL** weights | CC0/CC-BY music, jsfxr |
| WORLDGEN | WorldGen (github.com/ZiYang-xie/WorldGen) | code Apache-2.0 but README requires accepting gated FLUX.1-dev | transitive NON-COMMERCIAL dependency | procedural terrain + kits |
| ASSETFURNACE | AssetFurnace / image-to-3dlab (`57bc88a1…`) | Apache-2.0 code, but official install is `curl … install.sh | bash` | violates §10.6 supply-chain rule; licence itself is fine | Blender headless — always available |
| WORLDGROW | WorldGrow | paper only on 2026-11-18 | **NOT_FOUND** — no verified release or licence text | procedural heightmap + kit assembly |

## Transitive-dependency notes

- ComfyUI's GPL-3.0 applies to the **tool**, not to generated outputs; custom nodes are a separate audit unit
  and must be recorded in `tools/asset-pipeline/whitelist.yaml` before use.
- WorldGen is the clearest trap: permissive code, non-commercial gated model. This is why step 5 exists.
- MusicGen is the second: permissive code, non-commercial weights. The code licence does not launder the weights.
- HY-Motion's body-model convention (SMPL/AMASS family) is not yet audited; that check is a precondition of any
  Director approval, not a detail to defer.
- jsfxr's master-prompt shorthand says MIT; the actual license file is the Unlicense. The more permissive
  text is recorded, not silently "corrected" in the master.

## Director decisions requested

1. Approve or reject the territory-restricted Tencent candidates (HUNYUAN3D, HY-MOTION, HY-WORLD) for
   FR/EN distribution. Recommendation: **reject for now**, use the audited fallbacks; revisit if legal
   counsel confirms the EU exclusion does not cover shipped game assets.
2. Approve or reject SDXL `openrail++` for public distribution. Recommendation: **reject**, use FLUX.1-schnell.
3. Approve or reject ActionForge given unstated output rights. Recommendation: **reject**, use Blender IK.

Until the Director signs, `tools/asset-pipeline/whitelist.yaml` contains only the APPROVED rows above.
`node scripts/validate-manifest.mjs --audit` enforces that a forbidden licence can never enter the whitelist.

## Hardware note

`tools/colab/detect_tier.py` and `tools/asset-pipeline/detect_tier.py` measured a **Tesla T4**,
15360 MiB reported, nominal **16 GB** tier (ECC-reserved memory). Per §8.3 that permits FLUX.1-schnell
8-bit hero, Hunyuan3D mini/turbo *if approved*, Blender bake and KTX2. No model has been run.

## Change log

| date | change | by |
|---|---|---|
| 2026-11-18 | P0-006 initial audit, 8 approved / 7 blocked / 5 rejected, metadata from GitHub + HF APIs | asset-pipeline |
