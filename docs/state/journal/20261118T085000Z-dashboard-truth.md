# 2026-11-18T08:50:00Z · P0-007 · dashboard truth repair

- **scope** Director asked "is the dashboard ready?" — answer was no: it built but reported false values
- **agent** tools-engineer · **branch** `session/20261118-dashboard-truth` · **base** `914ed5a`

## found
- `gdd.modules = 0` and `"GDD-001 (P1, not started)"` hardcoded; repo has 32 modules, 15 DRAFT
- `HIGH_CONCEPT v1.2` hardcoded; current version is 1.3
- `tracer = "green"` hardcoded, no log named
- metric key drift: builder asked `measured.ledger_entries`, metrics stores `scope.ledger_entries` → 12 hidden
- `active_locks` read main's LOCKS.yaml, which never has active locks; registry lives on `state/locks`

## fixed
- every value sourced from metrics.json, HIGH_CONCEPT.md, an evidence log or `origin/state/locks`
- two new views: `tier` and `netgate`, from metrics
- `apps/dashboard/check.mjs`: two byte-identical rebuilds, field-by-field source comparison, five forbidden
  stale literals; negative injection of `modules: 0` → exit 1 with both failures named

## measured
- build exit 0, 10 view groups, 20 NOT COMPUTABLE (down from 21; 12 of the old 21 were mis-mapped keys)
- check 0 · negative check **1** (correct) · restored check 0 · `pnpm verify` **17/17**

## honest limits
Still a static file: no hydrator, no server, `dist/` gitignored. The 20 NOT COMPUTABLE fields are genuinely
unmeasured (tick p95, wire KB/s, AoI, economy, T1 counts). `check.mjs` is not a verify step yet: adding one
would change the 17-step baseline and is left as a named follow-up.

## next
Back to NET-005 in the main worktree; then wire `check.mjs` into verify as a separate tooling task.
