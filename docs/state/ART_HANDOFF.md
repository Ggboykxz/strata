# ART HANDOFF — CPU-safe preparation only

| field | value |
|---|---|
| date | 2026-11-18 |
| Director statement | "gère l'art et go next" (verbatim, this turn) |
| NET-GATE | `signed-with-risk` (A0006), 8/10 criteria unmet — art allowed by **risk acceptance**, not by measurement |
| art produced by this task | **none** |
| hardware in this runtime | **no GPU, no TPU** (`NO_GPU` — `tools/*/detect_tier.py`) |

## 1. What the Director asked and what it can mean here

The Director asked me to handle art and continue. I can handle art **governance, manifests, validators and
handoffs** on CPU. I cannot generate a hero mesh, texture bake, motion clip or scene in this runtime: there is no
accelerator, and I was explicitly told to signal when one becomes necessary (ND-011 runtime update). Generating
an asset now would require downloading a model and running it on hardware that does not exist — impossible and,
if faked, an I5/I13 defect.

## 2. Why art tasks are still not selectable

Blueprint gates outrank the risk-accepted signature for task selection:

| task | deps | state |
|---|---|---|
| AI-001 (ComfyUI + one hero mesh + throughput) | `GATE:P2`, `P0-006` | **blocked** — `GATE:P2` needs `GATE:P2SYS` (PR-S1..S8, GB-001), HC-003 and GDD-005; none complete |
| AI-002 (rig/retopo/LOD, separated GLB) | `AI-001` | blocked transitively |
| WG-001 (world generation) | `GATE:P2`, `AI-002`, `P0-006` | blocked transitively |
| AN-001 / AN-002 (motion) | `AI-002`, `PR-S8` / `AN-001` | blocked transitively |
| P3-001..006 | `AI-002` etc. | blocked transitively |

The constitution also orders P2-SYS greybox **before** P3-ART (master §5.1). The next selectable task remains
**PR-S1**, not an art task.

## 3. Hardware request for the Director (ND-012)

To run AI-001 as specified we need a **T4 16 GB GPU** (the tier `detect_tier.py` already recognises, 15 360 MiB
ECC) in the runtime, or equivalent. The declared future **TPU v5e-1** is not a drop-in generation device: no
audited model targets XLA, and ND-011 remains open. With no GPU/TPU, only the CPU-safe policy applies: CC0
kitbash, procedural geometry/textures/keyframes — no model use (I4).

## 4. Audited models available when hardware arrives

From `tools/asset-pipeline/whitelist.yaml` / `AUDIT-2026-11-18-P0-006`, 9 entries approved: FLUX-SCHNELL
(images, S1+), INSTANTMESH (mesh, S1+), TRIPOSR (mesh, S0+), MESH2MOTION (motion, S0+), KOKORO (audio, S1+),
JSFXR (SFX, S0+), COMFYUI (graph host, conditional), GLTF-TRANSFORM (export, S0+), ACTIONFORGE (conditional).
HUNYUAN3D and HY-MOTION are **rejected** (EU/UK/Korea exclusion) with fallbacks INSTANTMESH and MESH2MOTION.

No model has been downloaded or run. Binaries never enter git; artifacts belong on Hugging Face with provenance.

## 5. What I will do on CPU now, and next

Now: keep ART BIBLE separation rules intact (A0001/I3), keep NET-GATE's seven residual risks attached to any
art decision, record the hardware request, and advance PR-S1 (P2-SYS greybox). When hardware and `GATE:P2` exist:
run the audited Smoke harness (AI-001), export separated mesh/animation GLBs (AI-002), validate with
`validate-anim-separation.mjs`, and record throughput + provenance in `docs/qa/AI_THROUGHPUT.md`. No step is
skipped because the Director signed a gate; the signature accepts risk, it does not manufacture evidence.
