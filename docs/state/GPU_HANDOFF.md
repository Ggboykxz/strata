# GPU handoff — everything needed to continue on the new runtime

| field | value |
|---|---|
| written | 2026-11-18T20:32Z |
| Director statement (verbatim) | "Documentes tous car je passe sur GPU" |
| branch | `session/20261118-hc-001-high-concept` — **PR #1 merged**, PR #2 closed, PR #3 merged into `main` (`a84733e`, 1 032 files) |
| gates | P0 / P1 / P2 **SIGNED**; P2NET / P2SYS satisfied; **GATE:NET SIGNED — RISK ACCEPTED** |
| NET-GATE readiness | **NOT READY** — 4 of 10 master §5.2 criteria unmet after PR-N1 (8 at signature); `validate-netgate --assert-ready` exits 1 |
| current hardware | no GPU, no TPU in this runtime; T4 16 GB declared by the Director (ND-012) |
| quality doctrine | A0008 (quality over time, original IP only), A0009 (blanket Director signatures) |

This is the single handoff document for the GPU session. Everything below is sourced from repository files; no
number here is from memory.

## 1. State snapshot (sources)

| item | value | source |
|---|---|---|
| `pnpm verify` | **19/19** enabled steps green | last `pnpm verify` log |
| full tests | **319 passed + 1 skipped (320)** across 44 files | last `pnpm test` log |
| CIS | **85/100** — wow density **0** (no playtest) | `docs/state/metrics/concept.json` |
| GDD coverage | **100%** (63/63 refs) | `scripts/gdd-coverage.mjs --min 0.80` |
| scope ledger | 12 entries, balanced | `docs/state/metrics/2026-11-18-s03.json` |
| Actions | **8/8** success at attested heads | `*-ci-proof.log` in evidence dirs |
| evidence | 36 directories, **322 logs** | `docs/state/metrics/2026-11-18-s03.json` |
| drift/replay guards | prompt seal, blueprint B9, dashboard truth, journal freshness, GDD drift specs | `pnpm verify` steps |
| netcode | deterministic 30 Hz tick, equal hashes, desync rejected, exact-length binary v3 | NET-001..006 evidence |
| art | **none produced**; greybox only | I2 / A0008 |

## 2. Hardware declaration and the first commands

The Director previously declared **TPU v5e-1 + T4 16 GB** (ND-011) and now says they are moving to GPU (ND-012).
The T4 is the generation tier: `tools/asset-pipeline/detect_tier.py` special-cases a Tesla T4 at its ECC-reserved
15 360 MiB → tier `16GB`. The two detector copies are kept in sync by hand (known debt). Neither script downloads
or runs a model (I4).

On arrival, **first**, before any generation:

```bash
python3 tools/asset-pipeline/detect_tier.py
python3 tools/colab/detect_tier.py
```

Both should report tier `16GB`, `vram_mib` ~15360, source `nvidia-smi`. Log stdout+stderr with their exit codes into a
new `docs/state/evidence/<UTC>-GPU-PROBE/` directory (one file per command, `EXIT=<n>` on the last line), then commit
that evidence with trailers `Agent:` / `Task:`. If a probe still prints `NO_GPU`, stop and report it — do not claim a
device that is not visible.

**TPU scope (ND-011) is still unanswered.** A TPU v5e-1 is not a drop-in generation device: no audited model in
P0-006 targets XLA, and art remains CUDA/T4-only unless a new audit entry exists.

## 3. What GPU arrival does and does not authorize

| authorized immediately | still blocked |
|---|---|
| hardware probes and evidence | **any generated asset** — no mesh, texture bake, motion or scene before NET-GATE is READY (I2, A0008) |
| re-running audited validators and harnesses on the new machine | AI-001 / AI-002 (`art: true`) until `--assert-ready` exits 0 |
| the 4 remaining NET-GATE measurement tasks (CPU/time work; a GPU is not required) | art pipeline smoke until the GATE:P2 / GATE:NET signatures are recorded on the new runtime's evidence chain |
| preparing handoffs, locks, manifests, provenance templates | HF token use before ND-005 rotation (use the new token from env, never printed) |
| architecture decisions through ADRs | copying the quality benchmark's IP — I11 forbids it (A0008 §Context) |

A Director-signed gate is a **risk acceptance**, not a measurement. A0009 recorded `je signe tous`; the 4 criteria
below are still unmet (8 at signature time). Starting art earlier would need an explicit Director-signed ADR
suspending I2 — none exists.

## 4. Audited stack — use only this (P0-006)

`tools/asset-pipeline/whitelist.yaml`, audit id `AUDIT-2026-11-18-P0-006`, 9 approved, 0 blocked, 11 rejected.

| id | use | licence / condition |
|---|---|---|
| FLUX-SCHNELL | image generation | Apache-2.0, commercial output |
| INSTANTMESH | mesh from image | Apache-2.0 |
| TRIPOSR | mesh from image | MIT |
| MESH2MOTION | motion / retarget source | MIT + CC0 outputs |
| KOKORO | audio | Apache-2.0 |
| JSFXR | SFX | Unlicense |
| COMFYUI | graph host | GPL-3.0, **approved with conditions** |
| GLTF-TRANSFORM | export, Draco + KTX2 | MIT |
| ACTIONFORGE | fallback motion | CC0 outputs, proprietary tool, conditional |

**Rejected, do not use:** HUNYUAN3D (EU/UK/Korea exclusion → fallback INSTANTMESH) and HY-MOTION (same exclusion +
unaudited body model → fallback MESH2MOTION).

Babylon.js **9.37.0** is pinned in `docs/STACK.lock.md` and `apps/game/package.json` (Apache-2.0). The 9.0 node
graphs are VFX/rendering tools, not gameplay truth (I1 / A0001); the Babylon 9 feature fit analysis is in
`docs/state/threads/ENGINE-BABYLON9/0001-RESEARCH.md`. Inspector/Editor are separate packages and need their own I4
audit before use. **No model or tool runs before its audit entry is verified** (I4).

## 5. Art pipeline contract (when art is finally authorized)

- **A0001 / I3**: mesh GLBs and animation GLBs are **never merged**; only animation *state* crosses the wire, never
  bone transforms. Validate with `node scripts/validate-anim-separation.mjs`.
- **I11**: original IP only; every asset needs recorded provenance (source, licence, transform chain).
- **No binaries in git**: `*.glb`, textures, weights and generated corpora are excluded by `.gitignore`. Artifacts go
  to Hugging Face; the repo keeps manifests, hashes and evidence only. Export with `glTF-Transform` (Draco + KTX2).
- **Budgets**: GDD-STRATA §5/§16 — draw calls <= 250, tris <= 1.5 M, compressed load <= 25 MB, splat share <= 25%
  of a cell GPU budget, splat only as a distant backdrop beyond 120 m, never gameplay/collidable/server-referenced.
- **World shape**: KITs on a 2 m grid streamed in 64 m cells; byte-identical heightmap on both sides; no monolithic
  zone (master §7/§8.7).
- **Player-facing text**: FR + EN pair, never split; 6 glossary entries are the current structural minimum.
- **Accessibility**: no essential information carried by colour or motion alone; see GDD-ONBOARDING / ART_BIBLE.
- **Quality bar**: benchmark only. Do not copy names, lore, meshes, textures or UI from the commercial reference (I11).

Blueprint art tasks: AI-001 (`tools/asset-pipeline/comfy/`, `smoke.py`, `docs/qa/AI_THROUGHPUT.md`), AI-002
(`rig_lod.py`, separated GLBs) depend on GATE:P2 + P0-006 and AN-001/AI-002 respectively. Note AI-001's blueprint acc
says `python tools/asset-pipeline/smoke.py` — on this runtime the interpreter is `python3`; repair the acc in the
same PR if needed rather than adding a shell alias.

## 6. The remaining NET-GATE criteria — how to close them

Dossier: `docs/qa/prototypes/NET_GATE.md`. Validator: `node scripts/validate-netgate.mjs --assert-ready` (exit 1
today). At signature time 2 of 10 criteria were met (the headless 30 Hz server and the 10k ledger fuzz). PR-N1
(2026-11-18) measured four more: the 4-client matrix, a real 30-minute soak, desync correction and server tick p95
(in-process). The first soak attempt failed in report building and is preserved, not counted. **Four remain.**

| criterion | state | what closes it |
|---|---|---|
| four-client matrix | **met (in-process)** | 24 requested cells, 0 desyncs, 0 integrity failures, 28 694 verified snapshots; actual RTT 33.3/66.7/166.7/300 ms, loss client→server only |
| soak-30min | **met** | real 1,800.03 s wall clock, 54,001 ticks at 30 Hz, 0 desyncs, 0 integrity failures, correction p95 50 mm / max 250 mm; first attempt's report bug retained, see `docs/qa/prototypes/PRN1_MATRIX.md` §4 |
| desync correction | **met** | p95 50 mm < 0.3 m, max 450 mm, 0 over 2 m (the 450 mm is in-flight lead, not divergence) |
| server tick p95 | **met in-process** | p95 max 0.4411 ms under 4 clients / 64 entities; not a production deployment number |
| wire budget | **failing** | 1 551 B full snapshot × 30 Hz = **46 530 B/s** vs 12 288 B/s (3,79×) → NET-101 AoI + delta |
| reconnect exact state | **partial** | reconnect half proven (same entity, seq 106, exact hash, late resume refused); crash restore and RPO still missing |
| crash restore / RPO | **partial** | measured dataset, restore <= 3 s, published RPO <= 60 s |
| threat & anti-cheat | **partial** | auth/TLS decisions, persistent counters, retention runbook (OPS-001); SEC-002 wiring is already done |

Every closing command must log stdout+stderr, its exit code and its head SHA under `docs/state/evidence/`. Then update
the dossier statuses and re-run the validator. Do not change a status without a log (I13).

## 7. Working conventions for the GPU session

1. **Verify environment first**: `pwd`, `git status --short`, `git log --oneline -15`, branch. Not a repo → stop.
2. **Locks before edits**: one sorted commit per task on `state/locks`; `task_id` must exist in `BLUEPRINT.yaml`
   (a `GATE:*` id is now accepted). Never steal a lock.
3. **One task <= 30 min**, handoff with inputs / outputs / acceptance commands / constraints / deadline / rollback in
   `docs/state/threads/<TASK>/`.
4. **Commit** with `type(task-id): …` plus `Agent:` and `Task:` trailers. Push after each logical unit.
5. **Evidence** per command in `docs/state/evidence/<UTC>-<TASK>/NN-<name>.log` with `EXIT=<n>` on the last line.
6. **Never merge your own PR**; Director merges. No reviewer is installed — record the limit.
7. **Docs at the same time**: GDD on behavior change (I9), journal entry, `docs/state/JOURNAL.md` regenerated with
   `node scripts/build-journal.mjs` (CI enforces `--check`).
8. **Generated result**: `node scripts/session-result.mjs [--format full]` — its metrics filter accepts only
   `YYYY-MM-DD-sN.json`; `concept.json` is a CIS source, not a session snapshot.
9. **Secrets from env only** (I7): `HF_TOKEN` is currently exposed — rotate under ND-005 first, then export the new
   value in the shell; never print it, never put it in a command that lands in a log.
10. **Repo is public**: reading needs no token; pushes need the Director's PAT via askpass, and that token must be
    deleted from disk at the end of the session.

## 8. First-session checklist (copy/paste)

```bash
# recover
git clone https://github.com/Ggboykxz/strata.git && cd strata
corepack prepare pnpm@12.21.0 --activate && pnpm install --frozen-lockfile
pnpm verify

# hardware proof (log both into a new evidence dir)
python3 tools/asset-pipeline/detect_tier.py
python3 tools/colab/detect_tier.py

# gate status
node scripts/validate-netgate.mjs
node scripts/validate-netgate.mjs --assert-ready   # must be 1 until the 4 remaining criteria are measured

# concept / docs / result
node scripts/concept-integrity.mjs --check
node scripts/concept-integrity.mjs --score          # 85/100, wow 0
node scripts/gdd-coverage.mjs --min 0.80            # 100%
node scripts/session-result.mjs --format full
```

Then **stop and report the probe output**. Do not start a generation task until the readiness check passes or the
Director signs an explicit ADR suspending I2.

## 9. Open Director items (unchanged)

- **ND-004 / ND-005** — rotate the exposed GitHub PAT and HF token.
- **ND-011** — TPU v5e-1: training-only or audited generation path?
- **ND-012** — T4 16 GB arrival (this move).
- **NET-GATE re-measurement** — the 4 remaining criteria above; formal `GATE:NET` re-signature after readiness if desired.
- Repo default branch is still `session/20261118-hc-001-high-concept`; switch to `main` in Settings → Branches
  if that is the intent.

## 10. Why this document exists

A0008: quality over time, evidence over adjectives, server truth before visuals, vertical slice before scale, no
silent bypass. Moving to a GPU does not make an unmeasured gate measured. This document is the memory bridge so the
next session does not have to rediscover any of it — and does not quietly ship art before the proof exists.
