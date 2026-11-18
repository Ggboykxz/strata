## 2026-11-18T08:40:00Z | orchestrator -> tools-engineer | HANDOFF

**claim.** The Director asked whether the dashboard is ready. It builds, but it reports `gdd.modules = 0`,
`"GDD-001 (P1, not started)"`, `HIGH_CONCEPT v1.2` and a manual "tracer green" — all hardcoded at P0-007 —
and it reads metric keys that no longer exist, so real values display as NOT COMPUTABLE. A view that lies is
worse than a view that admits ignorance (I5/I13).

**inputs.** `apps/dashboard/build.mjs`, `docs/state/metrics/2026-11-18-s02.json`,
`docs/design/HIGH_CONCEPT.md`, `docs/state/evidence/**/*tracer*.log`, `state/locks` registry.

**expected outputs.** repaired builder, `apps/dashboard/check.mjs` regression guard, evidence.

**acceptance.** `pnpm --filter @strata/dashboard build` · `node apps/dashboard/check.mjs` ·
byte-identical rebuild with a fixed `STRATA_BUILD_UTC` · `pnpm verify`.

**constraints.** no new dependency; no derived metric in the browser; unmeasured stays NOT COMPUTABLE;
do not edit metrics.json (NET-005 owns the next metric update).
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T08:40:00Z | orchestrator -> tools-engineer | PROPOSAL

**rule.** The builder reads sources; it never asserts a value from memory. Anything it cannot source prints
NOT COMPUTABLE with the reason when the source carries one.

**mapping repaired.** GDD fields now come from `measured.gdd_modules` and `gdd_coverage.maturity`; the ledger
from `metrics.scope.ledger_entries` (12, previously NOT COMPUTABLE because the builder asked for
`measured.ledger_entries`); CIS from `metrics.cis` with its reason; tier and NET-GATE from `metrics`. The
coverage ratio is formatted as a percentage from the sourced `0..1` value.

**hardcoded claims removed.** `hc_version` is parsed from `HIGH_CONCEPT.md` (now 1.3, not the baked 1.2);
`t3_signature` is parsed from its §5 heading and keeps the "re-sign at each gate" caveat; `tracer` is built
only from the newest evidence log that actually contains `RESULT: PASS — tracer assert`, and names that log.

**locks.** The authoritative registry is the `state/locks` branch. The builder previously read the `main`
copy, which never has active locks, so `active_locks` could only ever be 0. It now reads
`origin/state/locks` first (with a local fallback) and names the ref it used. A stale local branch was
observed reporting 0 while the remote had 12 — exactly the failure this prevents.

**regression guard.** `apps/dashboard/check.mjs` rebuilds twice (byte-identical assertion), checks each
number against its declared source, and refuses five known stale literals in the builder. A negative run
that reintroduces `modules: 0` must exit 1.

**honest limits.** 20 fields remain NOT COMPUTABLE: tick p95, down/up KB/s, AoI, desyncs, reconnects,
economy, T1 word counts measured outside the metrics file. They are unmeasured, not mis-mapped. The view is
still a static file with no hydrator and no live server; this repair makes it truthful, not interactive.

**ACK** — tools-engineer, same process.
