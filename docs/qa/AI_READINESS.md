# AI READINESS — Tesla T4 16 GB (AI-001 preflight)

| field | value |
|---|---|
| id | AI-READINESS |
| task | AI-001 (readiness only — no generation) |
| owner | asset-pipeline |
| date | 2026-11-18 |
| status | **BLOCKED — I2: NET-GATE not ready (8/10 criteria unmet)** |
| worktree | `/tmp/strata-art`, branch `session/20261118-netgate-art`, head `79936e1` |
| evidence | `docs/state/evidence/20261118T194833Z-AI-READINESS/` |
| installs performed | **none** |
| models downloaded | **none** |
| inference runs | **none** |
| generated assets | **none** |
| HF token read or used | **no** |
| network downloads / uploads by this task | **none** |

**Reading rule.** This dossier proves what the runtime *is* and what AI-001 *would* require. It does not
authorize AI-001. The generation plan in §5 is **not executed**; I2 is still in force (§8). Every number below
is followed by the log file that produced it; a value that cannot be measured before a download is marked
**NOT COMPUTABLE**, never guessed.

## 1. Authority, scope and what was deliberately not done

Inputs read for this task: `AGENTS.md`, `docs/state/GPU_HANDOFF.md`, `docs/legal/AI_MODEL_AUDIT.md`
(AUDIT-2026-11-18-P0-006), `docs/design/gdd/GDD-AI-ASSETS.md`, `docs/CONSTITUTION.md` §0. The approved-model
set is exactly the nine whitelist rows of §4; nothing outside it is proposed here.

In scope: rerun both tier probes and the environment probes; record stdout, stderr and `EXIT=<n>` per command;
write this dossier; run the two documentation acceptances.

Out of scope and not done: `pip install`, `uv pip install`, ComfyUI install, model download, GPU inference,
texture bake, Blender run, HF token use, any model/weight fetch or artifact upload, any change to `tools/asset-pipeline/**`,
`docs/legal/AI_MODEL_AUDIT.md`, `docs/state/SESSION.md`, `docs/state/LOCKS.yaml`, or art files.

## 2. Exact hardware (measured 2026-11-18T19:48Z)

| fact | value | source |
|---|---|---|
| GPU | Tesla T4, 1 device, no process using it | `01-nvidia-smi.log`, `17-nvidia-smi-query.log` |
| driver / CUDA (driver) | 580.82.07 / 13.0 | `01-nvidia-smi.log` |
| VRAM reported by the driver | **15 360 MiB** | `01-nvidia-smi.log`, `17-nvidia-smi-query.log` |
| VRAM free at idle probe | 14 913 MiB | `17-nvidia-smi-query.log` |
| VRAM visible to torch after context init | **14 912 MiB** | `12-torch-presence.log` |
| measured delta (driver total − torch total) | 448 MiB (= 15 360 − 14 912) | arithmetic over the two logs above |
| ECC | Enabled | `17-nvidia-smi-query.log` |
| compute capability | 7.5 | `17-nvidia-smi-query.log` |
| power cap / idle draw / temperature | 70.00 W / 14.52 W / 47 C | `17-nvidia-smi-query.log` |
| CPU | Intel Xeon @ 2.00 GHz, 2 vCPU (1 socket, 1 core, 2 threads) | `18-lscpu.log`, `34-memory-and-cpu-count.log` |
| RAM | 12 975 MiB total, 11 075 MiB available, **0 swap** | `34-memory-and-cpu-count.log` |
| Disk `/` (also `/content`, `/tmp`) | overlay, 120 942 624 768 B total, **118 837 534 720 B available** | `19-df-targets.log`, `28-python-alias-and-counts.log` |
| OS / kernel | Ubuntu 24.04.4 LTS / 6.6.159+ x86_64 | `23-os-and-tooling-versions.log` |
| Python | 3.13.16 at `/usr/bin/python3`; `python` is a wrapper that execs `python3` | `06`, `29`, `30` |
| nvcc | 13.0.88 (CUDA 13.0) | `08-nvcc-version.log` |
| OpenSSL / ffmpeg | 3.0.13 / 6.1.1-3ubuntu5 | `09`, `10` |
| Node / pnpm / uv / hf | v22.23.4 / 12.21.0 / 0.13.4 / 1.33.0 | `23-os-and-tooling-versions.log` |

Verbatim tier probes (both rerun in this worktree):

```json
{"gpu": true, "gpu_name": "Tesla T4", "vram_mib": 15360, "vram_gb": 15.0, "tier": "16GB", "policy": "T4 nominal 16 GB (ECC-reserved); FLUX-schnell 8-bit hero, Blender bake, KTX2", "source": "nvidia-smi", "audit": "AUDIT-2026-11-18-P0-006"}
EXIT=0
```

```json
{"gpu": true, "gpu_name": "Tesla T4", "vram_mib": 15360, "vram_gb": 15.0, "tier": "16GB", "policy": "T4 nominal 16 GB (ECC-reserved); quantized/offload generation; Blender bake; KTX2", "source": "nvidia-smi"}
EXIT=0
```

Sources: `02-asset-pipeline-detect-tier.log` and `03-colab-detect-tier.log`. Both report `tier: 16GB`,
`vram_mib: 15360`, `source: nvidia-smi`, and neither invents a number when the device is absent.

**VRAM accounting rule for AI-001.** The driver reports 15 360 MiB; CUDA allocations see 14 912 MiB. Every
budget in §6 uses **14 912 MiB**, never 16 384 MiB and never "16 GB" as an allocation number. The 448 MiB
difference is measured (two logs above), not an estimate of what any model needs.

## 3. Installed versus missing (probed, never installed)

### 3.1 Usable today

| tool | version / state | log |
|---|---|---|
| `nvidia-smi` | 580.82.07, T4 visible, EXIT 0 | `01`, `17` |
| `python3` / `python` | 3.13.16, same interpreter via wrapper, EXIT 0 | `06`, `29`, `30` |
| pip environment | 722 distributions, EXIT 0 | `07-pip-list.log`, `28` |
| PyTorch | 2.14.1+cu130, `cuda_available True`, 1 device, T4, EXIT 0 | `12-torch-presence.log` |
| torchvision / torchaudio | 0.29.1+cu130 / 2.11.0+cu130 | `07-pip-list.log` |
| diffusers | 0.42.1, EXIT 0 | `13-diffusers-presence.log` |
| transformers / safetensors / accelerate | 5.22.1 / 0.8.0 / 1.15.0 | `13`, `07` |
| huggingface_hub / `hf` CLI | 1.33.0, `download` and `upload` subcommands verified by `--help` | `23`, `31` |
| uv | 0.13.4; `pip compile --generate-hashes`, `pip sync`, `venv --python` verified | `23`, `32`, `33` |
| nvcc | 13.0.88, EXIT 0 | `08-nvcc-version.log` |
| ffmpeg | 6.1.1-3ubuntu5, EXIT 0 | `10-ffmpeg-version.log` |
| openssl | 3.0.13, EXIT 0 | `09-openssl-version.log` |
| git / node / pnpm | git present, v22.23.4, 12.21.0 | `20`, `23` |

### 3.2 Missing, and required by the AI-001 path

| tool | probe result | log |
|---|---|---|
| ComfyUI | no `comfy`/`comfyui` binary, `import comfy` fails, no pip package, no directory in the four standard locations | `14-comfyui-presence.log` |
| Blender | `blender --version` → `command not found`, **EXIT 127** | `11-blender-version.log`, `15-blender-presence.log` |
| glTF-Transform | `@gltf-transform/core` and `/cli` not resolvable, no binary | `26-gltf-transform-presence.log` |
| trimesh | `ModuleNotFoundError` | `24-mesh-tooling-presence.log` |
| mcubes | `ModuleNotFoundError` | `24-mesh-tooling-presence.log` |
| pytorch_lightning | `ModuleNotFoundError` | `24-mesh-tooling-presence.log` |
| nvdiffrast | `ModuleNotFoundError` | `25-instantmesh-dependency-presence.log` |
| xatlas | `ModuleNotFoundError` | `25-instantmesh-dependency-presence.log` |
| rembg / onnxruntime | `ModuleNotFoundError` | `25-instantmesh-dependency-presence.log` |
| `obj2gltf` | not on `PATH` | `24-mesh-tooling-presence.log` |
| git-lfs | `git: 'lfs' is not a git command` | `20-python-and-hf-tooling.log` |
| model weights / HF cache | no `~/.cache/huggingface`, no `*flux*`, `*instantmesh*` or `*comfyui*` path found | `22-model-cache-presence.log` |
| asset-manifest validator | `validate-manifest.mjs` accepts **only** `--audit` (anything else exits 64) and reads no asset manifest | `27-manifest-validator-scope.log` |

Notes that change how the install must be done:

1. The 722 system distributions are a preinstalled image. `pip list` proves versions, not pins, hashes or
   provenance. Per §10.6 every AI-001 dependency must live in an isolated venv installed from a
   hash-pinned lock (`uv pip compile --generate-hashes`), never from unpinned names in the system Python.
   The system stack is measured at 20 GiB (`/usr/local/lib/python3.13/dist-packages`), of which torch is
   1.2 GiB and the `nvidia*` wheels are 6.7 GiB (`21-python-package-footprint.log`).
2. `python` exists and delegates to `python3` (`30-python-wrapper.log`). The blueprint's AI-001 acceptance
   line `python tools/asset-pipeline/smoke.py` therefore runs here; the `python`→`python3` repair suggested
   in `GPU_HANDOFF` §5 is not required on this runtime. Recorded, not acted on.
3. ComfyUI's GPL-3.0 tool licence is approved **with conditions**: versioned workflow JSON and every custom
   node separately audited and pinned. No custom node is installed by this plan; ComfyUI-Manager and any
   `curl | bash` installer are forbidden by §10.6 regardless of what they would save.

## 4. The audited stack — nine approved entries, no others

Source: `tools/asset-pipeline/whitelist.yaml` + AUDIT-2026-11-18-P0-006. `approved = 9`, `blocked = 0`,
`rejected = 11`.

| id | use | licence | revision recorded in the whitelist | verdict |
|---|---|---|---|---|
| FLUX-SCHNELL | image generation | Apache-2.0 | HF `741f7c3ce8b383c54771c7003378a50191e9efe9` | APPROVED |
| INSTANTMESH | image → mesh | Apache-2.0 | `261eeb9e9f8b2b4b0d119366dda99c6fd7d35c64` | APPROVED |
| TRIPOSR | image → mesh fallback | MIT | `6c440ca1ef32cedcc2257b99953add129199ed26` | APPROVED |
| MESH2MOTION | rig / CC0 motion | MIT + CC0 outputs | `1edc9340f9ccfba33e466dac3eddc06269b96d35` | APPROVED |
| KOKORO | TTS | Apache-2.0 | HF `f3ff3571791e39611d31c381e3a41a3af07b4987` | APPROVED |
| JSFXR | SFX | Unlicense | `6d9eabbb7579f19b207be0e7ed52548ffdb32c90` | APPROVED |
| COMFYUI | graph host | GPL-3.0 (tool only) | `f288702d2fa16d3cdf0035b15a9fcbc552cd88e7` | APPROVED_WITH_CONDITIONS |
| GLTF-TRANSFORM | Draco + KTX2 export | MIT | `066192ec0b90d3f593a83fcb0a694c2055269087` | APPROVED |
| ACTIONFORGE | fallback motion | proprietary tool / CC0 outputs | notices sha256 `8b56bdd7ce33780fdb7cf93259b0c7d165759698e8a0aae4f32f5e21631630c1` | APPROVED_WITH_CONDITIONS |

**Pin caveat (verified against the audit text, not assumed).** The audit describes the INSTANTMESH, TRIPOSR,
COMFYUI and GLTF-TRANSFORM hex values as licence **blobs** ("Apache-2.0, blob 261eeb9e…", "MIT, blob
6c440ca1…", "GPL-3.0 tool, blob f288702d…", "MIT, blob 066192ec…"). A blob hash is not a Git commit and
cannot be used as `git checkout <sha>`. AI-001 must resolve and record
the real source commit (§5, phase 1) and the missing weight revisions (§10, O2) before any build.
INSTANTMESH and TRIPOSR record **no weights revision or weights source** at all — the row points at GitHub
code only.

**Not usable, despite what the blueprint title says:** HUNYUAN3D, HUNYUAN3D-V25, HUNYUAN3D-PAINT, HY-MOTION,
HY-WORLD, SDXL, FLUX-DEV, MUSICGEN, WORLDGEN, ASSETFURNACE, WORLDGROW are rejected (EU/UK/Korea exclusion,
non-commercial weights, gated transitive dependency, `curl | bash`, or version not found). AI-001's blueprint
title still reads "ComfyUI graphs + Hunyuan3D tier smoke"; that text predates the audit and must not be
executed as written. The audited fallback is **INSTANTMESH**. No workaround is proposed here: the blueprint
edit belongs to the producer (§10, O6).

## 5. AI-001 plan — exact commands, **not executed**

Target: one FLUX-schnell image → one InstantMesh hero mesh → separated mesh GLB → one measured throughput
number per asset. Every phase writes its own evidence file and stops on a failed gate. Nothing below was run
by this readiness task.

Conventions used in the plan:

```bash
AI=/content/ai                      # outside the repository
EV=docs/state/evidence/<utc>-AI-001 # one file per command, EXIT=<n> last line
log() { f="$1"; shift; { printf '$ %s\n' "$*"; "$@"; } >"$f" 2>&1; printf 'EXIT=%s\n' "$?" >>"$f"; }
```

### Phase 0 — gate check (must all pass, else stop)

```bash
node scripts/validate-netgate.mjs --assert-ready     # must exit 0; today it exits 1 (§8)
node scripts/validate-manifest.mjs --audit           # must exit 0
python3 tools/asset-pipeline/detect_tier.py          # must print tier 16GB
nvidia-smi --query-gpu=memory.total,memory.free --format=csv,noheader,nounits
free -m
df -B1 /content
```

Pass condition: NET-GATE `--assert-ready` EXIT 0; whitelist audit EXIT 0; tier `16GB`; free VRAM ≥ 13 312 MiB
(12 288 MiB ceiling + 1 024 MiB headroom, §6); available RAM ≥ 6 144 MiB; available disk ≥ twice the next
phase's ceiling. A failed gate is a stop, never a retry with a weaker check (I5).

### Phase 1 — resolve pins, then build two isolated, hash-locked environments

```bash
mkdir -p "$AI" "$EV" tools/asset-pipeline/comfy tools/asset-pipeline/mesh
# author the two requirements.in files from the pinned sources before compiling; every dep pinned
git ls-remote https://github.com/Comfy-Org/ComfyUI HEAD          # resolve, do not trust the blob hash
git ls-remote https://github.com/TencentARC/InstantMesh HEAD
uv venv "$AI/venv-comfy" --python /usr/bin/python3
uv venv "$AI/venv-mesh"  --python /usr/bin/python3
uv pip compile tools/asset-pipeline/comfy/requirements.in \
  --python "$AI/venv-comfy/bin/python" --generate-hashes \
  -o tools/asset-pipeline/comfy/requirements.lock
uv pip compile tools/asset-pipeline/mesh/requirements.in \
  --python "$AI/venv-mesh/bin/python" --generate-hashes \
  -o tools/asset-pipeline/mesh/requirements.lock
uv pip sync tools/asset-pipeline/comfy/requirements.lock --python "$AI/venv-comfy/bin/python"
uv pip sync tools/asset-pipeline/mesh/requirements.lock  --python "$AI/venv-mesh/bin/python"
sha256sum tools/asset-pipeline/comfy/requirements.lock tools/asset-pipeline/mesh/requirements.lock
du -sh "$AI/venv-comfy" "$AI/venv-mesh"
```

Pass condition: both locks committed with hashes; `du` inside the 12 GiB ceiling each. Rollback: delete the
venvs; the lock files stay (text and reviewable). No `--system-site-packages`, because that would re-import
the 722 unpinned system distributions.

### Phase 2 — ComfyUI at a resolved commit, no custom nodes

```bash
git clone https://github.com/Comfy-Org/ComfyUI "$AI/ComfyUI"
git -C "$AI/ComfyUI" checkout <commit resolved in phase 1>
git -C "$AI/ComfyUI" rev-parse HEAD > "$EV/02-comfyui-head.log"
git -C "$AI/ComfyUI" log -1 --format='%H %cI'
sha256sum tools/asset-pipeline/comfy/flux_schnell_hero.json
"$AI/venv-comfy/bin/python" "$AI/ComfyUI/main.py" --listen 127.0.0.1 --port 8188
```

Pass condition: `rev-parse HEAD` equals the commit recorded in the manifest and in the audit amendment owed
by O2. Bind loopback only; no `0.0.0.0`, no custom node, no ComfyUI-Manager. Rollback: stop the process and
delete `$AI/ComfyUI`; no repo state changes.

### Phase 3 — FLUX.1-schnell image (audited revision only)

```bash
hf download black-forest-labs/FLUX.1-schnell \
  --revision 741f7c3ce8b383c54771c7003378a50191e9efe9 \
  --local-dir "$AI/models/flux-schnell"
find "$AI/models/flux-schnell" -type f -printf '%s %p\n' | sort -n > "$EV/03-flux-files.log"
find "$AI/models/flux-schnell" -type f -name '*.safetensors' -exec sha256sum {} + \
  > "$EV/03-flux-sha256.log"
du -sb "$AI/models/flux-schnell"
```

Then: start the versioned workflow JSON in `tools/asset-pipeline/comfy/flux_schnell_hero.json` through the
ComfyUI HTTP API on `127.0.0.1:8188`, fixed seed recorded in the manifest, output written to
`$AI/out/flux/<asset_id>.png` (never to the repo). Sample peak VRAM for the whole run:

```bash
nvidia-smi --query-gpu=timestamp,memory.used,utilization.gpu --format=csv -l 1 \
  > "$EV/03-flux-peak-vram.csv" 2>&1 &
echo $! > "$EV/03-flux-sampler.pid"
# after the generation command returns: kill "$(cat "$EV/03-flux-sampler.pid")"
```

The sampler is killed after the job; the CSV is the VRAM evidence, and the generation command itself supplies
the step's `EXIT=<n>` line. The same sampler runs for phase 4.

Pass condition: one image produced, sha256 recorded, peak VRAM ≤ 12 288 MiB, wall time recorded. If the
audited repository's weights do not fit the measured 14 912 MiB envelope, **stop**: an 8-bit checkpoint
published under a different repository is a different artifact and is not covered by this audit row. Do not
substitute it silently (I4, §8.1 step 8).

### Phase 4 — one InstantMesh hero mesh (audited fallback, not Hunyuan3D)

```bash
git clone https://github.com/TencentARC/InstantMesh "$AI/InstantMesh"
git -C "$AI/InstantMesh" checkout <commit resolved in phase 1>
git -C "$AI/InstantMesh" submodule update --init --recursive
git -C "$AI/InstantMesh" submodule status > "$EV/04-submodules.log"
git -C "$AI/InstantMesh" rev-parse HEAD > "$EV/04-instantmesh-head.log"
# BEFORE building: licence + transitive audit of every submodule and of the weights revision (O2)
"$AI/venv-mesh/bin/python" "$AI/InstantMesh/run.py" --help > "$EV/04-instantmesh-help.log" 2>&1
```

The generation invocation is taken from that logged `--help` output and recorded verbatim in the evidence
file; no CLI shape is invented here. Pass condition: `--help` EXIT 0, submodule licence check recorded,
weights revision recorded, one mesh produced, peak VRAM ≤ 12 288 MiB, wall time recorded. On OOM: stop the
process, re-check `nvidia-smi`, then use the **audited** TRIPOSR fallback. Never switch to an unaudited model
to make a run fit.

### Phase 5 — export a separated mesh GLB (has one unresolved prerequisite)

Current state: Blender is absent (EXIT 127), glTF-Transform is absent, `trimesh`/`obj2gltf` are absent, and
no OBJ→GLB converter has a whitelist row. This phase therefore **cannot run today**. It needs one of:
(a) a Blender headless row + pinned install, (b) an audited OBJ→GLB converter, or (c) proof that InstantMesh
emits GLB natively (then no converter). Whichever is chosen, the exporter is pinned, logged, and followed by:

```bash
npx --yes @gltf-transform/cli@<pinned> optimize in.glb out.glb --compress draco --texture-compress ktx2
sha256sum out.glb
node scripts/validate-anim-separation.mjs   # mesh-only GLB: no animation track may be present (I3/A0001)
```

Budget ceiling for the shipped asset: GDD-STRATA §16 — draw calls ≤ 250, tris ≤ 1.5 M, load ≤ 25 MB
compressed (`docs/design/gdd/GDD-STRATA.md` line 87). Nothing is imported into Babylon from this phase until
the gate in §8 allows it.

### Phase 6 — measure, manifest, provenance

`tools/asset-pipeline/smoke.py` (an AI-001 output, absent today) runs the chain above and writes
`docs/qa/AI_THROUGHPUT.md` with measured seconds per asset, peak VRAM, peak RSS and output sha256. Each asset
gets one `asset_manifest v1` row per GDD-AI-ASSETS §7: `{asset_id, licence_id, model_revision, prompt_hash,
tier, throughput, sha256}`, citing `AUDIT-2026-11-18-P0-006`. A new revision creates a new manifest; it never
overwrites an old one.

```bash
node scripts/validate-manifest.mjs --audit   # validates the whitelist, not the asset manifest (see O4)
sha256sum docs/qa/AI_THROUGHPUT.md
```

## 6. VRAM / RAM / disk budgets

These are **planning ceilings** (policy decisions inside the measured envelope), not claims about what a
model needs. The measured peak replaces each ceiling in the manifest during AI-001.

| resource | measured envelope | AI-001 ceiling | gate before each phase | how the real value is measured |
|---|---|---|---|---|
| VRAM | 14 912 MiB torch-visible; 14 913 MiB free at idle | 12 288 MiB for image or mesh; 2 048 MiB for export | `memory.free` ≥ ceiling + 1 024 MiB | `nvidia-smi --query-gpu=memory.used --format=csv -l 1` (phase 3/4) |
| RAM | 12 975 MiB total; 11 075 MiB available; 0 swap | 6 144 MiB RSS for one job | `free -m` available ≥ 6 144 MiB | `/usr/bin/time -v` max RSS per phase |
| Disk | 118 837 534 720 B available (110.68 GiB) | 75 GiB total: venv-comfy 12 + venv-mesh 12 + FLUX snapshot 35 + InstantMesh 8 + outputs/temp 8 | `df -B1 /content` available ≥ 2× phase ceiling | `du -sb` after each fetch; `find -printf '%s'` per file |

Derivation of the 12 GiB venv ceiling: the measured system stack has torch 1.2 GiB + `nvidia*` 6.7 GiB =
7.9 GiB (`21-python-package-footprint.log`), plus wheels, compilers and cache slack. The FLUX 35 GiB and
InstantMesh 8 GiB numbers are **allocation ceilings, not measurements** — no weight file exists locally
(`22-model-cache-presence.log`), and fetching is forbidden in this readiness task. If a fetch would exceed
its ceiling, the job stops and reports; it does not shrink the check.

Concurrency: one GPU job at a time, sequential phases, no concurrent ComfyUI and InstantMesh (GDD-AI-ASSETS
§5 "one job at a time, chunk ≤ 60 min"). With 2 vCPU and 0 swap, CPU offload is not a fallback; the audited
model fallback is.

## 7. Provenance and HF artifact rules

1. **No binaries in git.** `.gitignore` blocks `*.safetensors`, `*.ckpt`, `*.pt`, `*.glb`, `*.gltf`, `*.fbx`,
   `*.blend1`, `*.ktx2`, `*.basis` (lines 21–31). The repo keeps manifests, sha256 and evidence only.
2. **Artifacts go to Hugging Face**, never GitHub (§10.3). The upload path is the `hf` CLI (1.33.0,
   `download`/`upload` verified by `--help`); local `git-lfs` is absent and is **not** used by this path.
3. **Token discipline (I7).** ND-005 (HF token rotation) is still open. No upload happens before rotation.
   The token is read from the environment by the `hf` CLI; never pass `--token` on a command line that lands
   in a log, never echo it, never commit it. This readiness task did not read `HF_TOKEN`.
4. **Every asset manifest carries** source model id, licence id, exact revision (commit or HF commit SHA),
   prompt hash, tier, measured throughput and sha256 of the output, per GDD-AI-ASSETS §7. A manifest without
   a licence id is quarantined, not imported.
5. **Original IP only (I11).** Prompts and outputs are recorded so provenance can be audited; the commercial
   quality benchmark named in A0008 is a benchmark, never a source of names, meshes, textures or UI.
6. **Private by default.** The HF artifact repo stays private until the Director decides distribution scope;
   the GitHub repo is public, so no signed URL or token-bearing path may be written into a manifest.

## 8. The I2 block — AI-001 is not authorized

> **AI-001 stays blocked until `node scripts/validate-netgate.mjs --assert-ready` exits 0, or a
> Director-signed ADR suspends I2. No such ADR exists.**

Measured on this runtime at this head (`16-validate-netgate.log`):

```text
$ node scripts/validate-netgate.mjs --assert-ready
validate-netgate — PASS — dossier honest, evidence-complete, signature recorded as risk-accepted
NET-GATE readiness: NOT READY — 8/10 criteria not met
  - four-client-matrix: not-measured
  - soak-30min: not-measured
  - desync-correction: not-measured
  - server-tick-p95: not-measured
  - wire-budget: failing
  - reconnect-restore: partial
  - crash-restore-rpo: partial
  - threat-and-anticheat: partial
validate-netgate --assert-ready — FAIL — 8 criteria unmet; the recorded signature is a risk acceptance, not evidence of readiness.
EXIT=1
```

The plain `node scripts/validate-netgate.mjs` exits 0 because the dossier is honest; that is **not** a gate
pass. A0006/A0009 record Director signatures as **risk acceptance**, not an I2 suspension
(`GPU_HANDOFF` §3). Hardware arrival changes nothing about this: a T4 makes generation possible, not
authorized.

Authorized today, and exercised by this dossier: hardware probes, validator runs, evidence, manifests and
handoff text. Not authorized: any hero 3D asset, texture bake, motion generation or scene generation (I2),
and therefore every phase in §5.

## 9. Top risks for AI-001

**R1 — The gate, not the GPU, is the blocker.** 8/10 NET-GATE criteria are unmet, `--assert-ready` exits 1,
and no ADR suspends I2. Any generation now would be an invariant breach, not a head start. Owner: netcode
for the measurements, Director for any I2 suspension.

**R2 — The audit pins are not executable pins.** No GitHub tool row records a source commit; four of them
record licence-blob hashes and two record an unlabelled hash. InstantMesh and TripoSR have no weights revision
at all; the audit records no transitive code
dependency or converter for the mesh path, and Blender has no whitelist row. Every submodule, weight file and
OBJ→GLB converter the build turns out to need must be enumerated and audited **before** it is used. I4 says no
tool or model before its audit; resolving these is an audit amendment, not a runtime workaround.

**R3 — The resource envelope is tight and the model footprints are unknown.** 14 912 MiB are CUDA-visible
(448 MiB below the driver's 15 360 MiB), the host has 12 975 MiB RAM, 2 vCPU and **0 swap**, and no weight
file exists locally to measure. Throughput is the very thing AI-001 must produce, so it is NOT COMPUTABLE
today; an OOM must fall back to an audited model, never to an unaudited quantization.

Secondary, all recorded rather than worked around:

- **R4 — Provenance tooling gap.** `validate-manifest.mjs` validates the whitelist only; there is no
  `asset_manifest v1` validator, although GDD-AI-ASSETS §8.1 assumes one refuses a non-commercial manifest.
- **R5 — Token rotation.** ND-005 is open; HF upload must wait for the new token, env-only.
- **R6 — Ownership.** `docs/qa/**` maps to `qa-engineer` in `OWNERSHIP.yaml`; this file was written under the
  directed AI-001 handoff. An ownership/lock entry for `docs/qa/AI_READINESS.md` should be recorded by the
  orchestrator (I6).
- **R7 — Stale blueprint text.** AI-001's title says Hunyuan3D (rejected) and its acceptance calls
  `python tools/asset-pipeline/smoke.py`, which exists nowhere yet. The command runs on this runtime because
  `python` wraps `python3`; the model name does not.

## 10. Open items

| id | item | owner | unblocks |
|---|---|---|---|
| O1 | the 8 NET-GATE measurements, then a real `--assert-ready` run | netcode-engineer | AI-001 (I2) |
| O2 | replace licence-blob hashes with real commit pins; record InstantMesh/TripoSR weights revisions; enumerate and audit InstantMesh submodules, any OBJ→GLB exporter and a Blender row if Blender is the converter | asset-pipeline + Director (I4) | phases 2, 4, 5 |
| O3 | decide the 8-bit FLUX path: the audited repo may not fit 14 912 MiB, and a derived 8-bit checkpoint is a new artifact needing its own row | Director + asset-pipeline | phase 3 |
| O4 | implement an `asset_manifest v1` validator (fail-closed), or amend GDD-AI-ASSETS §8.1 | tools-engineer + game-designer | provenance enforcement |
| O5 | ND-005 HF token rotation before any upload | Director | artifact upload |
| O6 | fix AI-001's blueprint title/acceptance (Hunyuan3D → InstantMesh) | producer | accurate task contract |
| O7 | record ownership/lock for `docs/qa/AI_READINESS.md` | orchestrator | I6 cleanliness |

## 11. Evidence index

All files are under `docs/state/evidence/20261118T194833Z-AI-READINESS/`; the last line of each is `EXIT=<n>`.

| file | content |
|---|---|
| `00-host-and-repo.log` | `pwd`, branch, head `79936e1`, clean tree apart from this evidence dir |
| `01-nvidia-smi.log` | full `nvidia-smi`, no running process |
| `02-asset-pipeline-detect-tier.log` | tier probe, `16GB`, EXIT 0 |
| `03-colab-detect-tier.log` | second tier probe, `16GB`, EXIT 0 |
| `04-free-h.log` | RAM and swap |
| `05-df-h.log`, `19-df-targets.log`, `28-python-alias-and-counts.log` | disk, with byte counts for `/content` |
| `06`, `29`, `30` | Python version, alias, wrapper |
| `07-pip-list.log` | 722 distributions |
| `08`, `09`, `10`, `11` | nvcc, openssl, ffmpeg, blender |
| `12`, `13` | torch device probe, diffusers/transformers/safetensors |
| `14`, `15`, `20`, `24`, `25`, `26` | ComfyUI, Blender, HF/uv tooling, mesh libs, InstantMesh deps, glTF-Transform |
| `16-validate-netgate.log` | dossier integrity EXIT 0; `--assert-ready` EXIT 1 |
| `17`, `18`, `23`, `34` | GPU query, CPU, OS/tool versions, RAM in MiB and `nproc` |
| `21-python-package-footprint.log` | 20 GiB dist-packages; torch 1.2 GiB; nvidia 6.7 GiB |
| `22-model-cache-presence.log` | no HF cache, no model directory |
| `27-manifest-validator-scope.log` | `--audit` is the only accepted mode; no manifest read |
| `31`, `32`, `33` | verified `hf` and `uv` flags used by the plan |
| `35-validate-docs.log`, `36-validate-manifest-audit.log` | acceptance exit codes |

`node scripts/validate-docs.mjs` is a structural gate over `docs/VISION.md`, ADRs, TDDs and the three P1 specs;
it does not read this dossier. Its EXIT 0 satisfies the handoff's acceptance but says nothing about the content
above — the evidence logs and the commands in them are the only support for the claims here.

No art asset, model weight, token or secret was created, downloaded or read by this task.
