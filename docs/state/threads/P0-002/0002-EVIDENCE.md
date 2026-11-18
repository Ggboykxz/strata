## 2026-11-18T09:10:00Z | orchestrator -> all | EVIDENCE

**claim.** D146 is satisfied: the §20 result is generated from `metrics.json` by a real script, in SHORT and
FULL form, deterministically, and it fails closed when a source is missing.

**evidence** (`docs/state/evidence/20261118T084957Z-P0-002/`)

| log | command | exit | result |
|---|---|---|---|
| `01-short.log` | `node scripts/session-result.mjs` | 0 | all 12 SHORT lines from metrics |
| `02-full.log` | `node scripts/session-result.mjs --format full` | 0 | SHORT + 10 FULL lines |
| `03-deterministic.log` | two runs with `--out`, then `cmp` | 0 | byte-identical |
| `04-negative-missing-field.log` | same file with `result.status` removed | **1** | names `missing or empty result.status in …` |
| `05-negative-bad-format.log` | `--format bogus` | **1** | names the invalid value |
| `06-verify.log` | `pnpm verify` | 0 | **17/17**, baseline unchanged |
| `07-ci-proof.log` | GitHub Actions API at `647ad0b` | 0 | **8/8 triggered workflows success** |

**sourced values, not memories.** 50 acceptance commands (45 exit 0, 5 non-zero named); 7 evidence dirs
with 64 logs; 30 locks acquired/released; 5 tasks; tier S0/S1; CIS `NOT COMPUTABLE` with its reason; coverage
100%; ledger 12 balanced; NET-GATE `unpassed / art_allowed false` and four unmeasured netcode metrics;
audit id `AUDIT-2026-11-18-P0-006`. The stale metrics note claiming "this result was composed by hand" was
removed and replaced by a D146-satisfied note.

**fail-closed proof.** Deleting one string field from a copy of the metrics file makes the generator exit 1
with the field path. No default value can silently replace a missing source.

**verify.** `session-result.mjs` no longer appears in the deferred stub list (`gdd-to-tests.mjs` remains);
the 17 enabled steps are unchanged. No `--out` file or negative-test fixture was committed.

**honest limits.** The generator formats metrics; it does not verify that the numbers in metrics are true.
That remains the job of the evidence logs and the acceptances that produced them. FULL fields about concept
signature ratio, content math and economy are `NOT COMPUTABLE` where no measured source exists.

**locks.** 2 globs (script + metrics file), one sorted commit on `state/locks`, owner orchestrator, task P0-002.
