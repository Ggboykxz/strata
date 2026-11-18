# A0014 — Director orders the asset line to continue (TripoSR props + licensed SFX, same constraints)

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18**, Director instruction ("continue avec les assets"), held to A0012/A0012's limits |
| accepted_by | Director (`2026-11-18-s02`) |
| date | 2026-11-18 |
| task | AI-001 continuation |
| parties | Director vs I2/pre-existing art gates |
| supersedes | nothing; extends A0012's scope to additional *smoke* assets, not to production art |

## Director statement (verbatim, 2026-11-18)

> continue avec les assets

Recorded exactly as spoken.

## Decision

1. Production of additional **smoke, provenance-complete** assets is authorized:
   - **TripoSR** additional meshes (audited fallback, MIT) from ORIGINAL procedural inputs.
   - **jsfxr** SFX (Unlicense, approved) if the tool is usable headlessly with logged exit codes.
   - **glTF-Transform** (MIT, approved) may optimize delivered meshes (compression/report) in `/content/ai`,
     recorded as measured, never as a gate pass.
2. Constraints (unchanged from A0012): audited stack only; no binaries in git; provenance per asset; no
   quality claim, no NET-GATE claim; FLUX.1-schnell stays **NOT COMPUTABLE** (HTTP 401; no HF token);
   InstantMesh remains unusable (unaudited `sudo-ai/zero123plus-v1.2`, anonymous 404).
3. Generated assets are **smoke props**: synthetic input art, single-run, no LODs, no PBR, no rig.
   Production hero art remains blocked by GATE:P2/P3, Director approval required.
4. Rollback: deleting `/content/ai` and staging nothing removes every artifact; repo impact is text
   evidence + manifests only. A0012 can be withdrawn at any time.
