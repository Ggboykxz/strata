## 2026-11-18T00:21:30Z | orchestrator -> producer | HANDOFF H-002

**claim:** Publish a scope document that makes the project's cost visible, plus the arithmetic that keeps the ledger zero-sum and the content math honest.

**inputs**
- STRATA master v8.1 §2 (SCOPE DOCTRINE), §2.5 content math, §2.7 cut order
- `docs/design/HIGH_CONCEPT.md` (concept debt CD-001 accepted as known)

**expected outputs**
- `docs/SCOPE.md` · `docs/production/SCOPE_LEDGER.yaml`
- `docs/production/CONTENT_MATH.yaml` (parameters; ASSUMPTION-labelled)
- `scripts/scope-math.mjs` · `scripts/validate-scope.mjs`

**acceptance commands**
- `node scripts/validate-scope.mjs` → exit 0
- `node scripts/scope-math.mjs --check` → exit 0
- `node scripts/scope-math.mjs --report` → exit 2 while throughput is unmeasured (intentional)

**constraints**
- tier S0, no new cost beyond the existing P0 phase budget
- every number tagged REFERENCE or ASSUMPTION; no fabricated "measured" value
- the ledger must balance per phase; a missing budget line is a failure, not a default

**deadline** GATE:P0
**rollback** revert the two scripts; SCOPE.md and the ledger are additive and referenced by P0-001 only
