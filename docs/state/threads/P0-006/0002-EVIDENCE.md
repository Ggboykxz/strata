## 2026-11-18T01:34:00Z | asset-pipeline -> all | EVIDENCE

**claim:** the audit is evidence-based and the whitelist cannot silently admit a forbidden licence.

**evidence** (`docs/state/evidence/20261118T012845Z-P0-006/`)
- `01-license-metadata.log` — GitHub contents API blobs and unauthenticated HF model metadata, with
  versions/revisions and licence-text hashes. No token was used.
- `02-validate-manifest.log` — exit 0: 8 approved, 7 blocked, 5 rejected, 0 errors.
- `03-negative-tests.log` — **8/8**: baseline 0; NC licence 1; unpinned revision 1; id absent from the audit
  document 1; missing audit document 2 (unreadable input); hardcoded VRAM 1; silent Director approval 1;
  duplicate id across sections 1.
- `04-detect-tier.log` — measured Tesla T4, 15360 MiB, nominal **16GB** tier.
- `05-verify.log` — `pnpm verify` **12/12**, exit 0 (manifest audit is now an enabled step).

**key findings, not assumptions**
- Hunyuan3D 2.0, HY-Motion 1.0 and HY-World 2.0 are `tencent-*-community` licences expressly excluding the
  EU, UK and South Korea. STRATA is public and FR/EN, so this is material. All three are **blocked pending
  Director**, not rejected.
- SDXL is `openrail++` (attribution/distribution scope). ActionForge is a proprietary browser tool with CC0
  animations but no stated output-rights licence. Both blocked pending Director.
- FLUX.1-dev is non-commercial; MusicGen weights are CC-BY-NC 4.0; WorldGen depends on gated FLUX.1-dev —
  all rejected. AssetFurnace's Apache-2.0 code is fine but its official installer is `curl … | bash`, which
  §10.6 forbids; Blender headless is the fallback. WorldGrow is a paper only (NOT_FOUND).
- jsfxr's actual licence is the **Unlicense**. The master's "MIT" shorthand was wrong; the more permissive
  text is recorded rather than silently editing the sealed master.

**impact:** concept_role `sig`; SL-P0-006, 1 session; tier S0. No model was downloaded or run; I4 holds.
**ask:** three new Director decisions (ND-006/007/008), all with a recorded recommendation to reject for now.
**deadline:** GATE:P0

## 2026-11-18T01:40:00Z — resolution of all blocked and rejected entries

Director instruction: resolve every blocked and rejected candidate. Applied in
`docs/legal/AI_MODEL_AUDIT.md` and the whitelist:

- **ACTIONFORGE reversed to APPROVED_WITH_CONDITIONS.** The publisher's own `THIRD-PARTY-NOTICES.txt`
  explicitly grants CC0 1.0 over animations, rig and props, commercial, no attribution (sha256
  `8b56bdd7…`). The tool's code remains proprietary and is not copied. The earlier "output rights unstated"
  finding was incomplete; it is corrected on the record, not silently overwritten.
- **HUNYUAN3D, HY-MOTION, HY-WORLD, SDXL → REJECTED** by Director decision, each with an approved fallback.
  Their licences cannot be changed by code; rejecting is the only safe resolution.
- **HUNYUAN3D-V25, HUNYUAN3D-PAINT → REJECTED_NOT_FOUND** after a second API check returned 401.
- Every rejected id now has a `fallback` and a `fallbacks` mapping. `validate-manifest --audit` refuses a
  rejection without one and refuses any Director decision left OPEN.

Validator exit 0: **9 approved / 0 blocked / 11 rejected / 11 fallbacks**. **9/9** negative tests, including
two new cases (unresolved decision, missing fallback). `pnpm verify` 12/12. Logs `07`, `08`, `09`.
