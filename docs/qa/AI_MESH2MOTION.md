# AI_MESH2MOTION — headless feasibility assessment (AI-001, Mesh2Motion clip leg)

| field | value |
|---|---|
| id | AI-001 / MESH2MOTION clip leg |
| date | 2026-11-18 |
| agent | asset-pipeline (subagent `hy4-flash-high`) |
| worktree | `/tmp/strata-mesh2motion`, branch `session/20261118-mesh2motion` @ `c60a732` |
| verdict | **NOT COMPUTABLE — no supported headless automation path** |
| evidence | `docs/state/evidence/20261118T210030Z-MESH2MOTION/01-*.log` … `08-*.log` |
| output clip | **none produced** (no GLB, no hash, no manifest — see §7) |

## 1. Task and bound inputs

Assess the audited Mesh2Motion path (`AUDIT-2026-11-18-P0-006`, licence id `MESH2MOTION`,
code MIT / animation outputs CC0) and, if honestly feasible, auto-rig the AI-001 golem and export one
CC0 animation clip GLB to `/content/ai/golem-<clip>.glb`.

Input mesh, verified locally before any work:

| property | measured value | source |
|---|---|---|
| path | `/content/ai/output/0/mesh.glb` | `stat`, `file` |
| bytes | 3 773 188 | `stat -c '%s'` |
| sha256 | `9ad2fac19c9f10b4c9fca17f8f2dbb7845283b65e02adc3c04734e707e0ee05d` | `sha256sum` |
| container | glTF binary (GLB), version 2, length 3 773 188 | `file` |
| vertices / faces | 94 306 / 188 608 | AI-001 manifest `ai-001-hero-mesh-0001.json` |
| animation tracks | **0** | same |
| skeleton | **NONE** | same; TripoSR geometry output |

**Risk recorded up front:** the golem is a raw, unrigged mesh with no skeleton. Mesh2Motion's value here is
its automatic humanoid rig + bone auto-mapping. That rig path is **unverified** — Mesh2Motion's own test
suite covers only `BoneCategoryMapper` permutations (see `TESTING.md` in the clone), not end-to-end
auto-rig of an arbitrary TripoSR mesh. A faceted, non-standard humanoid silhouette could fail mapping or
weight generation. This risk is now moot: the automation path itself does not exist (§4–§5).

## 2. Feasibility probe — environment (evidence 01, 02)

All commands were run as root on `Linux 9bf4b12aaf25 6.6.159+ x86_64`; every exit is in the evidence log.

| probe | result | exit |
|---|---|---|
| `node --version` | `v22.23.4` | 0 |
| `npm --version` | `10.8.2` | 0 |
| `which xvfb-run` | `/usr/bin/xvfb-run` | 0 |
| `which Xvfb` | `/usr/bin/Xvfb` | 0 |
| `dpkg -l \| grep -E 'xvfb\|libgtk\|libnss3'` | `xvfb 2:21.1.12-1ubuntu1.9`, `libgtk-4-1 4.14.5`, `libgtk-4-common`, `libnss3 2:3.98-1ubuntu0.2` | 0 |
| `dpkg -l \| grep -E 'libasound'` | `libasound2-data`, `libasound2t64 1.2.11` | 0 |
| `dpkg -l \| grep -E 'libgtk-3'` | **no match** (GTK3 absent; only GTK4) | 1 |
| `curl -sS -I https://github.com/Mesh2Motion/mesh2motion-app` | `HTTP/2 200` | 0 |
| `git --version` | `2.43.0` | 0 |

`apt-get install` was **not** needed and not run: xvfb, libnss3 and libasound are already present. GTK3 is
absent, but Electron is absent too (§4), so installing it would not enable the workflow.

## 3. Pin resolution — the audit hash is a BLOB, not a commit (evidence 02, 03, 04)

The task's pin `1edc9340f9ccfba33e466dac3eddc06269b96d35` is recorded honestly as a **pin-field mistake**
in the audit row, not silently coerced:

- `GET https://api.github.com/repos/Mesh2Motion/mesh2motion-app/commits/1edc9340…` → HTTP 422,
  `{"message":"No commit found for SHA: 1edc9340…"}`. It is **not a commit**.
- `GET https://api.github.com/repos/Mesh2Motion/mesh2motion-app/git/blobs/1edc9340…` → HTTP 200,
  a **1120-byte blob** whose base64 content decodes to the MIT licence text beginning
  `All the code and software is licensed under MIT / MIT License / Copyright (c) 2025 Scott Petrovc`.
- In the clone, `git rev-parse HEAD:LICENSE-MIT.MD` → `1edc9340f9ccfba33e466dac3eddc06269b96d35`
  (exact match). The audit's "code MIT `1edc9340…`" pin is the **LICENSE-MIT.MD blob hash**.
- `LICENSE-CC0.MD` (the CC0 art/output notice) has local sha256
  `52fec1c484df708c16b4c27b2bf0d7f0d3994105c57adc4b9e6f95bcfd9de65f`;
  `LICENSE-MIT.MD` local sha256 `a40dbdb297466562778a58864f075415c1414778a19176bd85091d0434094b1d`.

Resolved commit actually used (per the task's "if it is a blob-hash mistake, resolve and record honestly"):

| field | value |
|---|---|
| clone command | `git clone --depth 1 https://github.com/Mesh2Motion/mesh2motion-app /tmp/m2m-app` (EXIT 0) |
| `git rev-parse HEAD` | `bcb014ea25e44f76b3add78463f72d1faec16418` (EXIT 0) |
| commit date | `2026-11-17T13:44:13Z` (`2026-11-17T07:44:13-06:00` author time) |
| subject | `make chexkboxes consistent` |
| default branch | `main`; repo `pushed_at` `2026-11-17T13:44:28Z` |
| audit date | 2026-11-18 — the resolved HEAD is contemporaneous with the audit |

## 4. What actually runs — dependency install and application shape (evidence 05, 06)

Install was confined to the clone directory; **no global installs** were made.

| command | result | exit |
|---|---|---|
| `npm ci` (in `/tmp/m2m-app`, lockfile present, 159 498 B) | `added 244 packages, audited 245 in 3m`, 9 moderate advisories | 0 |
| `node -p require('three/package.json').version` | `0.187.0` | 0 |
| `node -p require('vite/package.json').version` | `8.3.6` | 0 |
| `npm ls electron --depth=0` | `(empty)` | 1 |
| `grep -i electron package.json` | **no match** | — |

`npm ci` emitted one warning: `vite-plugin-glsl@1.6.2` wants `npm >= 10.8.3`, environment has `10.8.2`.
Non-blocking; install succeeded.

**Premise correction (measured, not assumed):** the audited revision is **not an Electron desktop app**.
`package.json` has no `electron`, `main`, `bin` or `electron-builder` field; scripts are only
`dev / build / lint / test / test:ui / test:coverage`. `README.md` and `API.md` describe a **Vite + Three.js
browser web application** served as static assets on a Cloudflare Worker (`wrangler.jsonc`,
`src/survey-worker.js`). The audit's "Electron desktop app" description does not match the pinned blob's
own revision. This is recorded as an audit-description defect, not worked around.

## 5. Why headless automation is infeasible (evidence 06, 07, 08)

1. **No write/automation protocol.** `API.md` documents `GET /api/rigs`, `GET /api/rigs/:rig_id`,
   `GET /api/rigs/:rig_id/variations` — explicitly *"small, read-only JSON API"*, *"only supports GET
   requests"*. It exposes rig metadata and GLB URLs; it has **no** import, auto-rig, animation-apply or
   export endpoint. The task permits browser/protocol automation only where the app exposes a documented
   protocol; the one documented protocol does not cover the required chain.
2. **The workflow is GUI-only.** `README.md` §Usage defines it as five manual browser steps (import GLB →
   pick skeleton → adjust skeleton → test animations → export GLB). `src/composer/*`,
   `src/preview-generator/*` and `src/lib/io/*` are DOM/WebGL modules (`document.querySelector`,
   `window.URL.createObjectURL`, `DOMContentLoaded`). `src/preview-generator/README.md`: *"fully done in
   the web browser"*, *"Go to the URL manually"*, *"Press the record button"*.
3. **No automation surface in source.** Repo-wide grep for `process.argv`, `commander`, `yargs`,
   `headless`, `puppeteer`, `playwright`, `selenium`, `electron`, `ipcMain`, `ipcRenderer` returned
   **no matches** (EXIT 1). `TESTING.md`: only `BoneCategoryMapper` unit tests via vitest.
4. **The prescribed launch command cannot launch this app.** `which electron`, `which chromium`,
   `which chromium-browser`, `which google-chrome` all EXIT 1. With Electron not a declared dependency,
   `npx electron .` would fetch `electron@45.3.4` from npm. To avoid introducing an **unaudited**
   dependency (I4 + `AUDIT-2026-11-18-P0-006` + 0001-COLLAB §3.5), the fetch was not performed. Instead:
   - `npx --no-install electron --version` → `npm error npx canceled due to missing packages …
     ["electron@45.3.4"]`, EXIT 1.
   - `timeout 10 xvfb-run -a npx --no-install electron . --no-sandbox --disable-gpu` → same error,
     EXIT 1.
   - There is no `dist` and no Electron `main` entry, so even a downloaded Electron would have nothing to
     load. `xvfb-run` being available does not help.
5. **No desktop release exists.** `GET https://api.github.com/repos/Mesh2Motion/mesh2motion-app/releases`
   returned an empty list (no tags/assets), so there is no published CLI-capable binary to drive.

The task's own stop rule applies: *"if no stable headless automation path exists for
import→auto-rig→apply clip→export, STOP and record NOT COMPUTABLE with exact probe outputs … Do NOT fabricate
a clip, do NOT 'automate' by editing app internals, do NOT use Playwright bypasses unless the app exposes a
documented protocol (it does not)."* No further automation attempt was made.

## 6. Canned CC0 clips exist but are unusable here

The clone contains **441** `.glb/.gltf` files under `static/` (animation/rig assets, CC0 per
`LICENSE-CC0.MD` and `README.md` §Licenses). A human rig (`id: human`, 29 model variations) and 230+
human animations are advertised by the production API (`https://app.mesh2motion.org/api/rigs`). This
confirms the *licence* is usable; it does not create a headless execution path. Importing the golem,
auto-rigging it, selecting one canned clip and exporting a separated animation GLB all require the
browser GUI. No clip was copied, downloaded or fabricated from these assets.

## 7. Explicit NOT COMPUTABLE section

**NOT COMPUTABLE — one CC0 animation clip GLB for the golem.**

- No clip GLB was produced at `/content/ai/golem-<clip>.glb`; no output sha256, byte count, vertex count or
  duration can be reported, because no such file exists. Any such number would be fabricated (I5/I13).
- Consequently **no clip manifest** was written at
  `tools/asset-pipeline/manifests/ai-001-golem-clip.json`. A manifest for a nonexistent output would be a
  false provenance record. The existing mesh manifest `ai-001-hero-mesh-0001.json` (licence `TRIPOSR`)
  remains the only AI-001 asset record and was not modified.
- Blocking cause: no documented/protocol-driven headless automation for import → auto-rig → apply clip →
  export in Mesh2Motion at the audited revision. Secondary risks (unverified auto-rig of a skeleton-less
  faceted golem) were never reached.
- The audit licence row remains valid (MIT code / CC0 outputs, commercial use, no credit required); this
  verdict is about **executability**, not about rights. It does not flip any NET-GATE criterion.

## 8. Director decision item — documented alternative

Recommend the Director decide on **ActionForge** (`ACTIONFORGE`, `APPROVED_WITH_CONDITIONS` in
`AUDIT-2026-11-18-P0-006`; publisher `THIRD-PARTY-NOTICES.txt` sha256 `8b56bdd7…`; animations/rig/props
CC0 1.0; tool code proprietary and never redistributed). It is browser-based, matching the documented
manual workflow, and its output rights are already approved with conditions (see `NEEDS_DIRECTOR.md`
ND-008, reversed). A Director choice is required because this leg cannot execute autonomously under the
no-browser-automation and no-unaudited-dependency constraints.

Alternatives on record, neither executed here: manual GUI operation by a human operator (licence-clean,
but not agent-executable); procedural keyframes (no tool dependency, but unverified for this golem).

**No gate file was edited, no validator was weakened, no secret or token was used or printed, no binary was
committed, and no other agent's file was modified.**

## 9. Evidence index

| log | content |
|---|---|
| `01-feasibility-probe.log` | node/npm/xvfb/GTK/nss/alsa/git versions and exits |
| `02-network-and-pin-resolution.log` | GitHub HTTP 200, `git ls-remote`, commit SHA 422 |
| `03-pin-blob-check.log` | blob 200 (MIT LICENSE-MIT.MD), HEAD commit date, repo metadata |
| `04-clone.log` | clone EXIT 0, `rev-parse HEAD`, commit date, file inventory |
| `05-npm-ci.log` | `npm ci` EXIT 0, dependency versions, no Electron |
| `06-automation-path-audit.log` | scripts, API surface, source grep, preview-generator README |
| `07-prescribed-launch-probe.log` | `npx --no-install electron` and `xvfb-run` launch failures |
| `08-releases-and-composer.log` | empty releases list, DOM-based composer, asset count |

External URLs cited (research only, no code/assets copied into the repo):
`https://github.com/Mesh2Motion/mesh2motion-app`,
`https://api.github.com/repos/Mesh2Motion/mesh2motion-app/commits/1edc9340f9ccfba33e466dac3eddc06269b96d35`,
`https://api.github.com/repos/Mesh2Motion/mesh2motion-app/git/blobs/1edc9340f9ccfba33e466dac3eddc06269b96d35`,
`https://api.github.com/repos/Mesh2Motion/mesh2motion-app/commits/bcb014ea25e44f76b3add78463f72d1faec16418`,
`https://api.github.com/repos/Mesh2Motion/mesh2motion-app/releases`,
`https://app.mesh2motion.org/api/rigs`.
