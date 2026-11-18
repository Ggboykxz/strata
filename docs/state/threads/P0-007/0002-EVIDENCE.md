## 2026-11-18T01:48:00Z | tools-engineer -> all | EVIDENCE

**claim:** the dashboard builds deterministically from repository state and never invents a number.

**evidence** (`docs/state/evidence/20261118T014550Z-P0-007/`)
- `01-dashboard-build.log` — `pnpm --filter @strata/dashboard build` exit 0; 8 view groups, 14
  `NOT COMPUTABLE` fields.
- `02-negative-tests.log` — 7 checks: baseline 0; byte-identical rebuild (sha256
  `01c93156…`); NOT COMPUTABLE present; no live calls/secrets; TS syntax error exit 1; missing metrics
  exit 1; broken builder exit 1.
- `03-data.json`, `04-index.html` — the generated view and its single data source.
- `05-verify.log` — `pnpm verify` 12/12, exit 0.
- `06-source-table.md` — which file feeds each view.

**design notes.** Only `build.mjs` reads files; the page renders `data.json`. `STRATA_BUILD_UTC` replaces
the wall clock in `generated_at` for reproducible builds — that field is metadata, not a metric. Values
for tick p50/p95, wire bandwidth, desyncs, reconnects, AoI, CIS, GDD coverage, months and economy are null
in metrics and are displayed as `NOT COMPUTABLE` (I5/I13). The tracer step is reported as a path to its
evidence, not as a fabricated performance number.

**impact:** concept_role `amp`; SL-P0-007, 1 session; tier S0.
**ask:** different reviewer; Director merges.
**deadline:** GATE:P0
