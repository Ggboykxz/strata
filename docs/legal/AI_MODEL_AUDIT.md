# AI MODEL & TOOL LICENSE AUDIT — STRATA

| field | value |
|---|---|
| id | AUDIT-2026-11-18-P0-006 |
| date | 2026-11-18 |
| owner | asset-pipeline |
| status | **BINDING** — no model or tool may be used before its row is `APPROVED` |
| resolution | **2026-11-18** — all formerly blocked candidates resolved; every rejection has a fallback |
| authority | master §8.1 (8 steps), §10.4–§10.7, I4 |
| evidence | `docs/state/evidence/20261118T012845Z-P0-006/01-license-metadata.log`, `06-actionforge-third-party-notices.txt` |

This is a **metadata-only audit**. No model weights, tool installers or generated outputs were downloaded,
executed or created. Nothing here licenses a model implicitly: an absent row means NOT_APPLICABLE, not
APPROVED. A version bump is a new audit (§8.1 step 8).

## Resolution 2026-11-18 — nothing left blocked

Director instruction: resolve every blocked and rejected entry. Three outcomes:

1. **ACTIONFORGE was unblocked, not by a waiver but by evidence.** The publisher's own
   `THIRD-PARTY-NOTICES.txt` states the tool is proprietary (all rights reserved) but the animations and rig
   are **CC0 1.0** — "use them for anything, commercial or otherwise, without permission and without
   attribution". §8.1 step 6 asks about *output rights* for hosted tools; they are explicit. Verified text
   sha256 `8b56bdd7ce33780fdb7cf93259b0c7d165759698e8a0aae4f32f5e21631630c1`. The tool's code is **not**
   copied or redistributed; only CC0 outputs may enter the repo. The earlier recommendation to reject was
   based on incomplete evidence and is reversed on the record.
2. **Territory-restricted / community-capped candidates were rejected** (ND-006, ND-007): Hunyuan3D,
   HY-Motion, HY-World and SDXL. A licence that excludes the EU/UK/South Korea cannot be made safe by code,
   and no agent can sign a distribution-scope decision. Each now has an approved fallback.
3. **Rejected candidates keep their status** — non-commercial weights, transitive non-commercial
   dependencies, `curl | bash` installers and NOT_FOUND versions cannot be "fixed" without changing the
   upstream licence. Each has an explicit fallback in the whitelist, and `validate-manifest --audit`
   refuses a rejection without one. Rejection is terminal, not an open question.

The result is **9 approved, 0 blocked, 11 rejected, 11 fallback mappings**. No model was run.

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
| ACTIONFORGE | ActionForge | publisher notices 2026-11-18 | proprietary tool / **CC0 outputs**, notices sha256 `8b56bdd7…` | actionforge.app/THIRD-PARTY-NOTICES.txt | animations, rig and props CC0 1.0 — commercial, no attribution | **APPROVED_WITH_CONDITIONS** — use CC0 outputs only; never copy or redistribute the tool's code |

## Formerly blocked — RESOLVED 2026-11-18 (all rejected except ACTIONFORGE)

These rows are kept for the decision record. Their ids appear in the whitelist's `rejected` section with a
fallback; the validator refuses any open item here.

| id | candidate | evidence | issue | fallback |
|---|---|---|---|---|
| HUNYUAN3D | Hunyuan3D 2.0 (`tencent/Hunyuan3D-2`, HF rev `9cd649ba…`) | `tencent-hunyuan-community`, GitHub LICENSE `a37e08f3…` | community licence excludes EU/UK/South Korea; some source files state NON-COMMERCIAL exceptions | InstantMesh / TripoSR + Blender bake |
| HUNYUAN3D-V25 | requested v2.5 / v3.0 | not verified on 2026-11-18 | **NOT_FOUND** as requested versions; never invent a version | newest audited version only |
| HUNYUAN3D-PAINT | Hunyuan3D-Paint | same community family as HUNYUAN3D | no separate permissive text verified | multiview projection + Blender bake |
| HY-MOTION | HY-Motion 1.0 (HF rev `620dd559…`) | `tencent-hunyuan-community`, GitHub License.txt `163efa92…` | licence expressly does NOT apply in EU/UK/South Korea; check SMPL/AMASS-type research-only body-model dependency | Mesh2Motion CC0 → procedural keyframes |
| HY-WORLD | HY-World 2.0 (HF rev `d78a16c9…`) | `tencent-hy-world-2.0-community`, GitHub License.txt `32c17df3…` | EU/UK/South Korea excluded; full world-generation inference code listed as "coming soon" | procedural heightmap + kit assembly |
| SDXL | SDXL base 1.0 (HF rev `46216598…`) | `openrail++` | community-capped / attribution-bound; needs distribution-scope decision | FLUX.1-schnell |
| ACTIONFORGE | ActionForge browser tool | publisher notices | **REVERSED** — output rights are explicitly CC0; approved above | CC0 outputs only |

## Rejected — do NOT use

| id | candidate | evidence | reason | fallback |
|---|---|---|---|---|
| FLUX-DEV | FLUX.1-dev (HF rev `3de623fc…`) | `flux-1-dev-non-commercial-license` | **NON-COMMERCIAL** — §8.1 step 3 outright reject | FLUX.1-schnell |
| MUSICGEN | MusicGen weights | model card: code MIT (`b93be905…`), weights **CC-BY-NC 4.0** | **NON-COMMERCIAL** weights | CC0/CC-BY music, jsfxr |
| WORLDGEN | WorldGen (github.com/ZiYang-xie/WorldGen) | code Apache-2.0 but README requires accepting gated FLUX.1-dev | transitive NON-COMMERCIAL dependency | procedural terrain + kits |
| ASSETFURNACE | AssetFurnace / image-to-3dlab (`57bc88a1…`) | Apache-2.0 code, but official install is `curl … install.sh | bash` | violates §10.6 supply-chain rule; licence itself is fine | Blender headless — always available |
| WORLDGROW | WorldGrow | paper only on 2026-11-18 | **NOT_FOUND** — no verified release or licence text | procedural heightmap + kit assembly |
| HUNYUAN3D-V25 | requested Hunyuan3D v2.5 / v3.0 | HF API returned 401 on re-check 2026-11-18 | **NOT_FOUND** — no verifiable version; never invent one | InstantMesh |
| HUNYUAN3D-PAINT | Hunyuan3D-Paint | HF API returned 401 on re-check 2026-11-18 | **NOT_FOUND** — no separate permissive text | multiview projection + Blender bake |

## Transitive-dependency notes

- ComfyUI's GPL-3.0 applies to the **tool**, not to generated outputs; custom nodes are a separate audit unit
  and must be recorded in `tools/asset-pipeline/whitelist.yaml` before use.
- WorldGen is the clearest trap: permissive code, non-commercial gated model. This is why step 5 exists.
- MusicGen is the second: permissive code, non-commercial weights. The code licence does not launder the weights.
- HY-Motion's body-model convention (SMPL/AMASS family) is not yet audited; that check is a precondition of any
  Director approval, not a detail to defer.
- jsfxr's master-prompt shorthand says MIT; the actual license file is the Unlicense. The more permissive
  text is recorded, not silently "corrected" in the master.

## Director decisions — RESOLVED 2026-11-18

| id | question | decision | evidence |
|---|---|---|---|
| D-AUDIT-1 | territory-restricted Tencent candidates for FR/EN distribution | **REJECTED** (Director instruction "fix all blocked and rejected") | this document §8.1 step 4; fallbacks InstantMesh / Mesh2Motion / procedural heightmap |
| D-AUDIT-2 | SDXL `openrail++` for public distribution | **REJECTED** | `openrail++` attribution scope; fallback FLUX.1-schnell |
| D-AUDIT-3 | ActionForge output rights | **REVERSED — approved with conditions** | `actionforge.app/THIRD-PARTY-NOTICES.txt`, sha256 `8b56bdd7…`; CC0 outputs, proprietary code untouched |

`tools/asset-pipeline/whitelist.yaml` now has **0 blocked** entries. Every rejected id has a fallback and the
validator fails on a rejection without one. `node scripts/validate-manifest.mjs --audit` also refuses any
decision left `OPEN` and forbids a licence from `NON-COMMERCIAL` or `RESEARCH-ONLY` entering the approved set.

## Hardware note

`tools/colab/detect_tier.py` and `tools/asset-pipeline/detect_tier.py` measured a **Tesla T4**,
15360 MiB reported, nominal **16 GB** tier (ECC-reserved memory). Per §8.3 that permits FLUX.1-schnell
8-bit hero, Hunyuan3D mini/turbo *if approved*, Blender bake and KTX2. No model has been run.

## Change log

| date | change | by |
|---|---|---|
| 2026-11-18 | P0-006 initial audit, 8 approved / 7 blocked / 5 rejected, metadata from GitHub + HF APIs | asset-pipeline |
| 2026-11-18 | resolution: ACTIONFORGE approved on CC0 output evidence; 0 blocked, 11 rejected, 11 fallbacks; D-AUDIT-1/2 rejected, D-AUDIT-3 reversed | Director instruction → asset-pipeline |
