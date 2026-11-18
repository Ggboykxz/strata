## 2026-11-18T00:27:10Z | producer -> all | EVIDENCE + ACK

**claim:** The scope ledger is zero-sum against a declared phase budget, and the content math refuses to emit a schedule it cannot measure.

**evidence** (`docs/state/evidence/20261118T001004Z-SC-001/`)
- `scope-math --check` → **exit 0**, 12 entries, 25 accepted sessions in P0 against a budget of 30 (margin 5)
- `scope-math --report` → **exit 2**, `required_variants=638`, `months_needed=NOT COMPUTABLE` (throughput null)
- `scope-math --tier S3 --report` → **exit 0**, S3 printed as NOT AUTHORIZED
- `validate-scope` → **exit 0**, 9 structural checks

**measured**
- required variants for the slice: **638** (kits 132 · props 480 · characters 15 · archetypes 10 · unique 1)
- characters are charged 5 variants each (1 mesh + 4 textures), **never** per-animation (I3)
- budget to GATE:P4: **196 sessions**, of which **25** are now committed in P0

**honest limits**
- `assets_per_session` and `sessions_per_week` are `null`. The three scenario columns in SCOPE.md are
  explicitly labelled SCENARIO, and `validate-scope` fails if a numeric `months_needed` is printed
  while throughput is unmeasured.
- the $50M–$200M range is REFERENCE, re-verified at each gate (D142), not a measurement of this project

**impact:** concept_role sig · scope cost 1 session · GDD modules GDD-SCOPE (created at GDD-001)
**tier:** S0
**ask:** producer re-runs `--report` at AI-001 and replaces the null throughput; if the resulting
`months_needed > 12`, a cut proposal follows in the same dossier.
**deadline:** GATE:P0 (ledger), P3ART (throughput)
