## 2026-11-18T00:10:04Z | orchestrator -> high-concept-guardian | HANDOFF H-001

**claim:** Materialize the locked High Concept as the repo's canonical concept source and ship the validator that measures its own tests.

**inputs**
- STRATA master v8.1 §1 (HIGH CONCEPT DOCTRINE), §0.3 I13, §11 T3
- task HC-001 from `docs/blueprint/BLUEPRINT.yaml` §12 (materialized by P0-001)

**expected outputs**
- `docs/design/HIGH_CONCEPT.md`
- `scripts/concept-integrity.mjs`

**acceptance commands**
- `node scripts/concept-integrity.mjs --init` → exit 0
- `node scripts/concept-integrity.mjs --check` → exit 1 while FINDING-001 is open (intentional)

**constraints**
- tier S0, no scope cost (docs only), concept_role = sig
- the locked EN/FR v1.0 text is reproduced VERBATIM — the guardian measures it, never edits it
- no ADR is signed here; a T1 failure becomes a finding + concept debt, not a silent rewrite

**deadline** GATE:P0
**rollback** delete both paths; nothing downstream depends on them until P0-001 archives the master
