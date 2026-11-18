## 2026-11-18T01:15:00Z | release-engineer -> all | EVIDENCE

**claim:** the 27 workflows are structurally valid, fully pinned and cannot silently green a stub; the
validator is real and falsifiable.

**evidence** (`docs/state/evidence/20261118T011433Z-P0-004/`)
- `01-validate-workflows.log` — **exit 0**: 27 files, unique names, explicit permissions/concurrency/timeouts,
  **80 `uses:` entries** pinned to 40-hex SHAs with version comments, 52 run steps, coverage of `pnpm verify`,
  `pnpm tracer --assert` and workflow self-validation.
- `02-negative-tests.log` — **8/8**: baseline 0; 26 files 1; 28 files 1; tag instead of SHA 1; missing
  permissions 1; `pull_request_target` head checkout 1; stub on a PR 1; unfrozen install 1.
- `03-ownership-after-map-change.log` — 165 globs, 0 ties, exit 0.
- `04-blueprint.log` — 63 tasks, 0 errors, 12 warnings, exit 0.
- `05-frozen-install.log`, `06-verify.log` (**10/10**), `07-tracer.log` (exit 0).
- `08-workflow-table.md` — the 27-file inventory with purpose and gate.

**action pins resolved from the GitHub API on 2026-11-18** (not guessed): actions/checkout v4
`11d5960a…`, actions/setup-node v4 `49933ea5…`, pnpm/action-setup v4 `b906affc…`,
actions/upload-artifact v4 `ea165f8d…`, actions/dependency-review-action v5.0.1 `bbc44d14…`,
github/codeql-action v3 `9418214d…`.

**defects found before commit**
1. The pin regex tested the whole `- uses: …` line, so every correctly pinned step failed. It now tests
   the reference token after `uses:` plus a separate version-comment match.
2. The stub detector matched the validator's own source, which contains the marker literal as a filter.
   It now requires an *emitted* marker (`console.error('NOT IMPLEMENTED`) and excludes itself.

**honest limit.** No job was executed. Acceptance is static; the first real CI run happens after the push.
**impact:** concept_role `amp`; SL-P0-004, 1 session; tier S0.
**ask:** different reviewer for the PR; the Director merges.
**deadline:** GATE:P0
