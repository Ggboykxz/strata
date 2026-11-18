## 2026-11-18T01:12:00Z | orchestrator -> all | DECISION

`scripts/validate-workflows.mjs` was created by P0-002 as a tools-engineer stub because `scripts/**` is a
tools-engineer catch-all. WORKFLOW.md §6 says a `validate-<domain>.mjs` belongs to the agent owning the
domain, and `.github/workflows/**` belongs to release-engineer. Left implicit, P0-004 would have been
`refused_ownership` — the same class of failure as D-002, which we already learned to fail closed on.

Resolution without a new dispute: add the explicit `scripts/validate-workflows.mjs` entry under
`release-engineer` in `OWNERSHIP.yaml` (most-specific glob wins), record it here, and let P0-004 implement
the validator in its own domain. No §12 blueprint line changes; no new ADR. This is §6 applied, not a new
policy. `validate-ownership.mjs` re-run after the map edit: 165 globs, 0 ties, exit 0.

Second decision: **static acceptance**. GitHub Actions cannot execute here. The validator proves structure,
pins and coverage on disk; the workflows themselves run only after the push. The evidence says this in
plain text rather than implying green CI.
