# 2026-11-18T09:10:00Z · P0-002 · Session Result generated from metrics (D146)

- **scope** replace the declared `scripts/session-result.mjs` stub with the real §20 generator
- **agent / branch** orchestrator · `session/20261118-hc-001-high-concept`
- **file** `scripts/session-result.mjs`, `docs/state/metrics/2026-11-18-s02.json` (`result` block)

## measured
- SHORT generation **exit 0** (12 lines) · FULL **exit 0** (22 lines)
- two runs → byte-identical · missing field → **exit 1** naming the field · bad format → **exit 1**
- `pnpm verify` **17/17**, baseline unchanged; the stub banner is gone from the deferred list

## decision
The generator reads every value from `metrics.json`. Fields §20 needs that were not already numeric sources
(commits, PRs, reviewer, locks, threads, next, blockers, Director questions, "what this enables") now live in
a structured `result` block **in the metrics file**, so the generator never invents them. Required fields go
through text/array/numeric guards: a missing one exits 1 with its path. `NOT COMPUTABLE` is only emitted for
an explicit `null` in a measured source.

## corrected in the same commit
The metrics note saying "this result was composed by hand" was false after this change; replaced by a D146
note. PR role text normalized (no double "PR #1").

## honest limit
The generator formats what metrics says; it does not re-verify that the numbers are true. The evidence logs
remain the proof. FULL's concept ratio, content math and economy fields stay NOT COMPUTABLE.

## next
NET-003 is still blocked on the producer-owned Colyseus pin. The other tooling item — wiring
`apps/dashboard/check.mjs` into `pnpm verify` — would change the 17-step baseline and deserves its own task.
