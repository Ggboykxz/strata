## 2026-11-18T18:18:00Z | high-concept-guardian -> all | EVIDENCE

**claim.** HC-003 produced the measured CIS source and a two-client 30-second replay. `concept --score` no longer
exits 2; it reports **CIS 85/100** with one component honestly at 0.

**evidence** (`docs/state/evidence/` HC-003 dir)

| log | command | exit | result |
|---|---|---|---|
| `01-acc-replay.log` | `pnpm test -t hc_demo_30s` | 0 | 3/3 replay tests |
| `02-acc-score.log` | `node scripts/concept-integrity.mjs --score` | 0 | CIS = 85/100 |
| `03-typecheck.log` | `pnpm typecheck` | 0 | strict |
| `04-full.log` | `pnpm test` | 0 | 188/188 |
| `05-verify.log` / `07-verify-final.log` | `pnpm verify` | 0 | 19/19 |
| `06-gdd.log` | `node scripts/validate-gdd.mjs` | 0 | 32 modules |

**measured.** One act at tick 1 → 3 attributable facts across 3 strata with physical variant swaps; 6 captures at
ticks 0/150/300/450/600/750; two clients agree on fact ids, variant ids, epoch and state hash at tick 900.
CIS components: demo 30, propagation 20, visible variants 15, **wow density 0**, traceability 10, signed novelty
10. Wow is 0 because no playtest exists — I13 forbids inventing it; the reason is stored in `concept.json`.

**defect fixed.** Writing `concept.json` into `docs/state/metrics/` made the dashboard select it as the "latest
metrics" file and fail six sourced checks. The builder now filters session files (`YYYY-MM-DD-sN.json`) only.

**docs.** GDD-CONSEQUENCE 0.5; vitest config includes `tests/replay/**/*.spec.ts` so the blueprint acc actually runs.
Both HC-003 accs now work without modification.

**locks.** 9 globs, acquired; release after this commit.
