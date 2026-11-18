## 2026-11-18T01:12:00Z | orchestrator -> release-engineer | HANDOFF

**claim:** P0-004 can start: P0-003 gives `pnpm verify`, TRACER-001 gives `pnpm tracer --assert`, and the
stub `validate-workflows.mjs` must be replaced rather than merely called.

**inputs**
- `docs/blueprint/BLUEPRINT.yaml` P0-004 — output `.github/workflows/`, acc `node scripts/validate-workflows.mjs`
- `docs/WORKFLOW.md` §6: `scripts/validate-<domain>.mjs` belongs to the agent owning `<domain>`
- `docs/STACK.lock.md` — exact action versions resolved from the GitHub API, not from memory
- master §10.6 — actions pinned by SHA, no `latest`, no `curl | bash`

**expected outputs**
- 27 workflow files under `.github/workflows/`
- a real `scripts/validate-workflows.mjs` (no stub banner), `pnpm verify` step added via tools-engineer handoff
- evidence + 27-file table with purpose and gate

**acceptance**
- `node scripts/validate-workflows.mjs` exit 0 on the real tree
- 8 negative tests exit 1 for the intended reason (26/28 files, unpinned uses, no permissions,
  `pull_request_target` head checkout, stub on PR, unfrozen install, plus two baselines)
- `pnpm install --frozen-lockfile`, `pnpm verify` and `pnpm tracer --assert` exit 0

**constraints**
- static acceptance only: no workflow can be executed in this sandbox; never claim one ran
- workflow validators that are still P0-002 stubs are manual-only (`workflow_dispatch`), never PR-blocking red
- `contents: write` only where a job writes; every job has `timeout-minutes` and a concurrency group
- `validate-workflows.mjs` is owned by release-engineer by §6; the explicit map entry is written by the
  orchestrator before this handoff, so the writer stays inside the map

**deadline:** ≤ 30 min · **rollback:** revert the commit + the two map lines; no runtime impact

**ACK** — release-engineer, same process.
