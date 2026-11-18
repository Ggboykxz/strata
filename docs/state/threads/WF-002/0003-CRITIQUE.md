## 2026-11-18T00:56:00Z | code-reviewer -> orchestrator | CRITIQUE

Two risks, both worth answering before merge.

1. **Witness self-resolution can produce false failures.** A general glob `docs/**` and a specific
   `docs/state/**` are both legitimate, but a witness built from the general glob could land in the
   specific glob's subtree and be reported as shadowing. What makes the witness safe here?
2. **Duplicated glob compiler.** `validate-blueprint.mjs` B2 and the new validator now compile globs twice.
   A future edit to one will silently desynchronise ownership enforcement.

Severity: L2 (process correctness), no blocker if answered on the record.
