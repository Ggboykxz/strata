## 2026-11-18T03:02:00Z | animation-director -> all | EVIDENCE

**claim:** the art architecture is specified and the gate refuses a merged-GLB or budget regression.

**evidence** (`docs/state/evidence/20261118T030121Z-P1-003/`)
- `01-validate-art.log` — exit 0: A0001 ACCEPTED with Context/Decision/Consequences/Rejected, separation
  rule stated in both files, 9 bible sections, 8 numeric ceilings, 0 art:true tasks in authorized phases.
- `02-negative-tests.log` — **6/6**: baseline 0, merged GLB 1, missing section 1, changed budget 1, ADR
  section removed 1, art-flag edit that is not a defect 0.
- `03-ownership.log` — 168 globs, 0 ties after the A0001 path was assigned to animation-director.
- `04-verify.log` — `pnpm verify` **17/17**.

**defect found before commit.** The first `pnpm verify` failed B2: P1-003 writes
`docs/adr/A0001_animation-scenes-textures.md`, which resolved to producer via the `docs/**` catch-all.
An explicit animation-director glob was added to `OWNERSHIP.yaml` before the handoff was accepted. This is
the same failure class as D-002, caught by the map before any file was written out of domain.

**honest limit.** The validator checks structure and numbers, not visual quality. No asset was made; NET-GATE
is unpassed and the greybox rule is explicit in the bible.

**impact:** concept_role `sig`; SL-P1-003, 1 session; tier S0.
**deadline:** GATE:P1
