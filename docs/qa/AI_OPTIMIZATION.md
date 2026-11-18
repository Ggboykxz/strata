# AI_OPTIMIZATION — Draco optimization of the AI-001 golem GLB (measured)

| field | value |
|---|---|
| date | 2026-11-18 |
| agent | asset-pipeline (subagent `session/20261118-gltf-transform`) |
| worktree / branch | `/tmp/strata-gltf-transform` / `session/20261118-gltf-transform` @ `c60a732` |
| input | `/content/ai/output/0/mesh.glb` (AI-001 TripoSR golem) |
| output | `/content/ai/output-0/mesh-opt.glb` (Draco re-encode, geometry-preserving flags) |
| audit | `AUDIT-2026-11-18-P0-006` |
| licence id | `GLTF-TRANSFORM` — MIT, audited LICENSE.md blob `066192ec0b90d3f593a83fcb0a694c2055269087` (APPROVED, commercial-allowed) |
| tool version | glTF-Transform CLI/core/functions/extensions **4.5.1**; draco3d / draco3dgltf **1.5.9** |
| runtime | Node **v22.23.4**, npm **10.8.2** |
| evidence | `docs/state/evidence/20261118T210100Z-AI-OPTIMIZE/` (logs `01`–`09`, `EXIT=` last line) |
| scope | container-level Draco compression of an existing mesh GLB. **Not art generation, not gate evidence.** |

All numbers below come from the evidence logs in the table above (I13). No number is recalled from memory.

## 1. Isolated toolchain — exact versions (task 2)

Installed with `npm install --prefix /content/ai/tooling/gltf-transform …`; **no repo dependency, no global install, no `npx --yes`**. `package.json` and `package-lock.json` are pinned in `/content/ai/tooling/gltf-transform/` (outside the git worktree).

| npm package | exact version | licence (npm metadata) | note |
|---|---|---|---|
| `@gltf-transform/cli` | 4.5.1 | MIT | binary `node_modules/.bin/gltf-transform`, `--version` → `4.5.1` |
| `@gltf-transform/core` | 4.5.1 | MIT | audited tool family |
| `@gltf-transform/functions` | 4.5.1 | MIT | transitive, recorded |
| `@gltf-transform/extensions` | 4.5.1 | MIT | transitive, recorded |
| `draco3d` | 1.5.9 | **Apache-2.0** | **not MIT** — see honest limits |
| `draco3dgltf` | 1.5.9 | Apache-2.0 | transitive WASM Draco encoder used by the CLI |

Commands and exits:

```
$ node --version; npm --version                       → v22.23.4 / 10.8.2       EXIT=0   (01-input-confirm.log)
$ npm install --prefix /content/ai/tooling/gltf-transform @gltf-transform/cli@4.5.1 @gltf-transform/core@4.5.1 draco3d@1.5.9
                                                       added 178 packages       EXIT=0   (02-install.log)
$ node -e "…require('…/package.json')…"                versions + licences       EXIT=0   (03-versions.log)
$ ./node_modules/.bin/gltf-transform --version         4.5.1                    EXIT=0   (03-versions.log)
```

`npm install` reported `4 moderate severity vulnerabilities` (transitive). `npm audit fix --force` was **not** run: it would break the exact pins. Recorded as a known limit, not hidden.

## 2. Inputs inspected (task 3)

`inspect --format md` was run on all four GLBs that exist. The golem is the only optimization target. Sword/rock/pine were being generated concurrently by another worker during this pass; their rows are **as-found snapshots** (mtime recorded in the logs), not stable handoffs.

| asset | path | bytes | sha256 (as found) | vertices | faces | mtime (UTC) | EXIT |
|---|---|---:|---|---:|---:|---|---|
| golem | `/content/ai/output/0/mesh.glb` | 3 773 188 | `9ad2fac19c9f10b4c9fca17f8f2dbb7845283b65e02adc3c04734e707e0ee05d` | 94 306 | 188 608 | 20:34:09 | 0 |
| sword | `/content/ai/output-sword/0/mesh.glb` | 1 547 344 | `4d41336dc15e7f0e2290782f291524d95bfd2ad0f3be39dcdc3a716f2a5ed17a` | 38 660 | 77 316 | 20:59:47 | 0 |
| rock | `/content/ai/output-rock/0/mesh.glb` | 2 832 052 | `6908e19673d8bf9370b0a5b312c3c6a5485ea8a12d6a0ff51c3d7a0399200dba` | 70 777 | 141 552 | 21:00:28 | 0 |
| pine | `/content/ai/output-pine/0/mesh.glb` | 3 123 668 | `a57ab4274ac14ded48fe47372bd6490eee4031f1e38b8c6cb943a713f625876f` | 78 068 | 156 132 | 21:01:14 | 0 |

- Golem sha256 **matches** the expected `9ad2fac1…` from the task and the AI-001 manifest (`stat` + `sha256sum`, `01-input-confirm.log` EXIT=0).
- `output-rock/0` and `output-pine/0` were **empty at the first check** (`01-input-confirm.log`); both acquired a `mesh.glb` during this pass. Sword/rock/pine were **inspected only, not optimized** (out of scope of this manifest).
- All four inputs: glTF 2.0, generator `https://github.com/mikedh/trimesh`, no extensions, attributes `COLOR_0:u8_norm, POSITION:f32`, no materials, no textures, no animations.

Commands and exits:

```
$ gltf-transform inspect /content/ai/output/0/mesh.glb                     EXIT=0   (04-inspect-golem-input.log)
$ gltf-transform inspect <each of golem|sword|rock|pine> --format md       EXIT=0   (05-inspect-*-input-md.log)
```

## 3. Commands executed for optimization (task 4)

**The bare command from the task brief does not preserve geometry.** `optimize` defaults `--simplify true` and `--weld true`; the probe reduced 94 306 → 65 224 vertices and 188 608 → 130 444 faces. It is recorded as a rejected attempt, not used as the deliverable.

```
$ gltf-transform optimize /content/ai/output/0/mesh.glb /content/ai/tooling/gltf-transform/_probe-bare.glb --compress draco
  → 298 688 B, 65 224 verts / 130 444 faces  (COUNT CHANGE — REJECTED)       EXIT=0   (06-probe-bare-optimize.log)
$ gltf-transform inspect _probe-bare.glb --format md                         EXIT=0   (06-probe-bare-optimize.log)

# geometry-preserving flags (final, exact command):
$ gltf-transform optimize /content/ai/output/0/mesh.glb /content/ai/output-0/mesh-opt.glb --compress draco --simplify false --weld false --texture-compress false
  → info: mesh.glb (3.77 MB) → mesh-opt.glb (387.56 KB)                       EXIT=0   (08-final-optimize.log)
$ gltf-transform inspect /content/ai/output-0/mesh-opt.glb --format md       EXIT=0   (09-inspect-output-delta.log)
```

The CLI emits `warn: Ignoring --no-weld, required for Draco compression.` and omits the `simplify`/`weld` steps; `dedup, instance, palette, flatten, join, resample, prune, sparse, draco` ran. Counts are unchanged in the output (see §4). The probe (`07-probe-safe-optimize.log`) and the final output have the **identical sha256** `d1e9062d…` — deterministic re-run.

## 4. Before / after — measured (golem)

| metric | before (`mesh.glb`) | after (`mesh-opt.glb`) | verdict |
|---|---|---|---|
| bytes | 3 773 188 | 387 560 | **−3 385 628 B (−89.7286 %, 9.7358× smaller)** |
| sha256 | `9ad2fac19c9f10b4c9fca17f8f2dbb7845283b65e02adc3c04734e707e0ee05d` | `d1e9062db1371ed6556fb38e45ae8125da4a06bf9682293666d4f84198eebc5f` | changed (expected) |
| vertices | 94 306 | 94 306 | **unchanged** |
| faces (glPrimitives) | 188 608 | 188 608 | **unchanged** |
| indices type | u32 | u32 | unchanged |
| attributes | `COLOR_0:u8_norm, POSITION:f32` | `COLOR_0:u8_norm, POSITION:f32` | unchanged |
| render/upload vertices | 565 824 / 94 306 | 565 824 / 94 306 | unchanged |
| generator | `https://github.com/mikedh/trimesh` | `glTF-Transform v4.5.1` | metadata changed |
| extensionsUsed / Required | none / none | `KHR_draco_mesh_compression` / `KHR_draco_mesh_compression` | Draco now **required to decode** |
| materials | none | none | unchanged |
| textures | none | none | no KTX2 produced |
| animations | none | none | still mesh-only (I3) |
| bboxMin | `-0.46508, -0.48681, -0.34364` | `-0.46508, -0.48681, -0.34364` | unchanged |
| bboxMax | `0.45163, 0.48883, 0.4364` | `0.45161, 0.48883, 0.43637` | **small drift (−2e-5 / −3e-5): Draco position quantization** |

`python3 -c 'b=3773188; a=387560; …'` → `before=3773188 after=387560 delta=3385628 reduction_pct=89.7286 ratio=9.7358x` EXIT=0 (`09-inspect-output-delta.log`).

## 5. `inspect` outputs (verbatim, `--format md`)

### 5a. Input — golem (`05-inspect-golem-input-md.log`, EXIT=0)

```
 OVERVIEW
| key                | value                             |
| ---                | ---                               |
| version            | 2.0                               |
| generator          | https://github.com/mikedh/trimesh |
| extensionsUsed     | none                              |
| extensionsRequired | none                              |

 SCENES
| #   | name | rootName   | bboxMin                      | bboxMax                  | renderVertexCount¹ | uploadVertexCount | uploadNaiveVertexCount |
| --- | ---  | ---        | ---                          | ---                      | ---                | ---               | ---                    |
| 0   |      | geometry_0 | -0.46508, -0.48681, -0.34364 | 0.45163, 0.48883, 0.4364 | 565,824            | 94,306            | 94,306                 |

 MESHES
| #   | name       | mode      | meshPrimitives | glPrimitives | vertices | indices | attributes                    | instances | size¹   |
| --- | ---------- | --------- | -------------- | ------------ | -------- | ------- | ----------------------------- | --------- | ------- |
| 0   | geometry_0 | TRIANGLES | 1              | 188,608      | 94,306   | u32     | COLOR_0:u8_norm, POSITION:f32 | 1         | 3.77 MB |

 MATERIALS — No materials found.
 TEXTURES  — No textures found.
 ANIMATIONS — No animations found.
```

### 5b. Output — golem optimized (`09-inspect-output-delta.log`, EXIT=0)

```
 OVERVIEW
| key                | value                      |
| ---                | ---                        |
| version            | 2.0                        |
| generator          | glTF-Transform v4.5.1      |
| extensionsUsed     | KHR_draco_mesh_compression |
| extensionsRequired | KHR_draco_mesh_compression |

 SCENES
| #   | name | rootName   | bboxMin                      | bboxMax                  | renderVertexCount¹ | uploadVertexCount | uploadNaiveVertexCount |
| --- | ---  | ---        | ---                          | ---                      | ---                | ---               | ---                    |
| 0   |      | geometry_0 | -0.46508, -0.48681, -0.34364 | 0.45161, 0.48883, 0.43637 | 565,824            | 94,306            | 94,306                 |

 MESHES
| #   | name       | mode      | meshPrimitives | glPrimitives | vertices | indices | attributes                    | instances | size¹   |
| --- | ---------- | --------- | -------------- | ------------ | -------- | ------- | ----------------------------- | --------- | ------- |
| 0   | geometry_0 | TRIANGLES | 1              | 188,608      | 94,306   | u32     | COLOR_0:u8_norm, POSITION:f32 | 1         | 3.77 MB |

 MATERIALS — No materials found.
 TEXTURES  — No textures found.
 ANIMATIONS — No animations found.
```

Sword/rock/pine inspect tables are in `05-inspect-{sword,rock,pine}-input-md.log` (each EXIT=0); their counts are in §2.

## 6. Honest limits

1. **Container/compression only.** This is a Draco re-encoding of an existing GLB. No new mesh, texture, animation or LOD was created. No runtime, browser, Babylon.js or GPU decode was exercised; the 89.73 % figure is a **file-size** delta, not a measured frame-time, VRAM or download-time improvement.
2. **Vertex data — precise wording.** Vertex **and face counts are unchanged** (94 306 / 188 608, measured). The attribute set is unchanged. Draco is lossy on **position precision**: bboxMax moved by 2e-5–3e-5. It is **not** a byte-identical re-encoding of attribute values.
3. **No KTX2 textures.** All four source GLBs report `No textures found`; `--texture-compress false` was passed. Nothing was texture-compressed; no `.ktx2`/`.webp`/`.avif` payload exists.
4. **No LOD chains.** One mesh / one primitive before and after. No simplification (`--simplify false`); no LOD levels were generated.
5. **Not gate evidence.** NET-GATE remains `SIGNED — RISK ACCEPTED` with 8/10 unmet criteria and `validate-netgate.mjs --assert-ready` exit 1 in the parent's records. This pass flips no criterion and makes no READY claim.
6. **Bare `--compress draco` is unsafe here.** Default `simplify`/`weld` change counts; any downstream pipeline must use `--simplify false --weld false`.
7. **Licensing nuance.** The audited id `GLTF-TRANSFORM` is MIT (LICENSE.md blob pin). The Draco encoder actually invoked (`draco3d`, `draco3dgltf` 1.5.9) declares **Apache-2.0**, a permissive/commercial-allowed licence that is **not separately whitelisted** in `whitelist.yaml`. Recorded here for the audit trail; no whitelist file was edited by this agent.
8. **npm audit:** 4 moderate transitive vulnerabilities reported at install; not auto-fixed (pins are exact and must not drift). No credential, token or secret was used or printed.
9. **Downstream requirement:** the output now *requires* `KHR_draco_mesh_compression`; a consumer without a Draco decoder cannot load it. Compatibility was not tested in a client.

## 7. NOT COMPUTABLE (no required step failed)

Every step in the task (confirm sha, install, inspect, optimize, measure) completed with `EXIT=0`. The following are **explicitly NOT COMPUTABLE in this container**, with the exact reason, and are not silently assumed:

- **Browser/GPU VRAM saving and decode/load-time delta after Draco** — NOT COMPUTABLE: no Babylon/WebGPU browser harness or decoder runtime is available here; no command produced a VRAM or load-time number. Only file bytes and `inspect` counts were measured.
- **Network transfer-time saving under the game protocol** — NOT COMPUTABLE: no socket transfer of these GLBs was run. The measured quantity is bytes on disk (3 773 188 → 387 560), not wire time.
- **KTX2 texture benefit** — NOT COMPUTABLE: source GLBs contain zero textures (`inspect`: `No textures found`); there is no texture to compress. No failure occurred; the input is absent.
- **FLUX hero image** — remains **NOT COMPUTABLE** (HTTP 401 gated weights, no token; carried over from AI-001, out of scope here).
- Other assets' optimized sizes — NOT COMPUTABLE for this manifest: sword/rock/pine were inspected only, not optimized (out of scope; they were also being written concurrently).

## 8. Evidence index

| log | content | final line |
|---|---|---|
| `01-input-confirm.log` | golem stat + sha256 (match), other dirs, node/npm | `EXIT=0` |
| `02-install.log` | pinned `npm install` output, audit summary | `EXIT=0` |
| `03-versions.log` | installed package versions + licences, CLI `--version` | `EXIT=0` |
| `04-inspect-golem-input.log` | `inspect` golem (pretty format) | `EXIT=0` |
| `05-inspect-{golem,sword,rock,pine}-input-md.log` | `inspect --format md` for all four GLBs | `EXIT=0` each |
| `06-probe-bare-optimize.log` | rejected bare `--compress draco` (count change) | `EXIT=0` |
| `07-probe-safe-optimize.log` | geometry-preserving probe, sha `d1e9062d…` | `EXIT=0` |
| `08-final-optimize.log` | **final exact command**, sha + bytes before/after | `EXIT=0` |
| `09-inspect-output-delta.log` | output inspect + python delta | `EXIT=0` |
| `10-manifest-validation.log` | `json.tool` manifest parse + `validate-manifest.mjs --audit` (RESULT: PASS, 0 errors) + `git status` (no binaries) | `EXIT=0` |
