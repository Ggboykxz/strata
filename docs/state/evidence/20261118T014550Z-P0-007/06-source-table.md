# Dashboard sources — P0-007

Master §18: every page reads generated views or `metrics.json`; no page computes its own truth. Only
`apps/dashboard/build.mjs` reads repository files; `dist/data.json` is the single input displayed by
`dist/index.html`.

| view | source file(s) | value shown when unmeasured |
|---|---|---|
| WORKFLOW | `docs/state/OWNERSHIP.yaml`, `LOCKS.yaml`, `DISPUTES.md`, `threads/`, `NEEDS_DIRECTOR.md` | `none` / `0` where the file says zero |
| CONCEPT | `docs/state/metrics/<session>.json`, `HIGH_CONCEPT.md` v1.2 | `NOT COMPUTABLE` for CIS |
| GDD | `metrics.json` (`gdd_coverage.value`) | `NOT COMPUTABLE` until GDD-001 (P1) |
| SCOPE | `metrics.json` (`ledger_*`, `slice_required_variants`, `months_needed`) | `NOT COMPUTABLE` for months (throughput unmeasured) |
| NETCODE | `metrics.json` (no tick/wire data yet) + tracer evidence path | `NOT COMPUTABLE` for p50/p95, bandwidth, desyncs, reconnects, AoI |
| ECONOMY | `metrics.json` (no simulation yet) | `NOT COMPUTABLE` for inflation/faucets/sinks |
| AI AUDIT | `tools/asset-pipeline/whitelist.yaml` | counts only |
| BLUEPRINT | `docs/blueprint/BLUEPRINT.yaml` | counts only |

No auth, no live server calls, no gameplay state. 14 fields print `NOT COMPUTABLE` rather than a guess.
`STRATA_BUILD_UTC` pins `generated_at` so two builds are byte-identical (I13).
