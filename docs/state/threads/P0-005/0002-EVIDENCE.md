## 2026-11-18T01:21:00Z | tools-engineer -> all | EVIDENCE

**claim:** the session can be resumed from a dead shell, and the drill fails when the state is broken.

**evidence** (`docs/state/evidence/20261118T012151Z-P0-005/`)
- `01-drill-dry.log` — exit 0; pwd, git status, branch, 15 commits, all state files, metrics JSON, heartbeat
  (absent → warning, not failure), locks, and a printed resume plan with the open Director items.
- `02-setup-syntax.log` — `bash -n` exit 0.
- `03-setup-dry.log` — dry bootstrap exit 0; no install, no network, no GPU job, no state write.
- `04-watchdog-dry.log` — dry watchdog exit 0; requires a `session/*` branch and passes the lock probe.
- `05-detect-tier.log` — **measured** `Tesla T4`, 15360 MiB, nominal **16GB** tier. The raw 15 GiB figure is
  ECC-reserved memory; mapping it to the master's 12 GB tier would have been wrong.
- `06-heartbeat-and-notebook.log` — heartbeat fields valid, 0 expired locks, notebook JSON valid.
- `07-negative-tests.log` — **7/7**: baseline 0; missing SESSION 1; expired lock in drill 1; expired lock in
  watchdog probe 1; corrupt heartbeat 1; valid `bash -n` 0; broken `bash -n` 2.
- `08-verify.log` — `pnpm verify` **11/11**, exit 0 (the drill is now an enabled step).

**defects found before commit**
1. The drill matched `file.endsWith('SESSION.md')` for both SESSION.md and NEXT_SESSION.md, so the second
   file overwrote the first and the session id was unreadable. Exact filename comparison fixed it.
2. The negative-test harness swapped its needle and label arguments, making every case look broken. Fixed.
   A broken harness is not evidence that the system works.

**honest debt.** The watchdog **fails closed** on an expired active lock instead of auto-releasing it:
releasing requires the git compare-and-swap protocol on `state/locks`, which a Colab watchdog must not fake
by rewriting the mirror on a session branch. The lock is reported with the reclaim instruction. Recorded,
not hidden.

**impact:** concept_role `sup`; SL-P0-005, 1 session; tier S0. No model used; I4 still blocks until P0-006.
**ask:** different reviewer; Director merges.
**deadline:** GATE:P0
