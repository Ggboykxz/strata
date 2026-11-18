## 2026-11-18T08:50:00Z | tools-engineer -> all | EVIDENCE

**claim.** The dashboard is now a truthful static view: every number is traced to a source, the five
hardcoded P0-007 claims are gone, and a regression guard fails when a stale value is reintroduced.

**evidence** (`docs/state/evidence/20261118T083922Z-P0-007/`)

| log | command | exit | result |
|---|---|---|---|
| `01-build.log` | `pnpm --filter @strata/dashboard build` | 0 | 10 view groups, `NOT COMPUTABLE` fields: 20 |
| `02-truth-check.log` | `node apps/dashboard/check.mjs` | 0 | deterministic, sourced, no hardcoded values |
| `03-negative-stale-value.log` | same check after injecting `modules: 0` into the builder | **1** | 2 problems, names both |
| `04-truth-check-restored.log` | check after restoring the builder | 0 | green again |
| `05-verify.log` | `pnpm verify` (after `pnpm install --frozen-lockfile` in the fresh worktree) | 0 | **17/17** |

**before / after, read from `data.json`**

| field | before | after | source |
|---|---|---|---|
| `gdd.modules` | `0` | `32` | `measured.gdd_modules` |
| `gdd.first_module` | `"GDD-001 (P1, not started)"` | removed; `draft/stub/signed = 15/17/0` | `gdd_coverage.maturity` |
| `gdd.coverage` | `1` | `"100%"` | `gdd_coverage.value` |
| `scope.ledger_entries` | `NOT COMPUTABLE` | `12` | `metrics.scope.ledger_entries` |
| `concept.t3_gate_signature` | `"SIGNED at GATE:P0 (HIGH_CONCEPT v1.2)"` | parsed 1.3 signature + gate caveat | `HIGH_CONCEPT.md` §5 |
| `netcode.tracer` | hardcoded `"green"` | `green — <named evidence log> (exit 0)` | newest passing tracer log |
| `workflow.active_locks` | `0` | `12`, with `locks_source: origin/state/locks:…` | remote lock registry |
| new | — | `tier`, `netgate` views | `metrics.tier`, `metrics.netgate` |

**environment note.** A fresh git worktree has no `node_modules`; the first `pnpm verify` there failed on
missing modules, not on code. `pnpm install --frozen-lockfile` fixed it; the log in evidence is the second,
green run. No dependency was added.

**honest limits.** Still static, no hydrator, no server, `dist/` still gitignored. 20 NOT COMPUTABLE fields
are genuinely unmeasured (tick p95, wire KB/s, AoI, economy, T1 word counts) — none is a mis-mapped key.
The checker is not yet a `pnpm verify` step; wiring it in would change the 17-step baseline, so it is left
as a named follow-up rather than silently changing the gate.

**locks.** `apps/dashboard/**` acquired on `state/locks`, owner tools-engineer, task P0-007.
