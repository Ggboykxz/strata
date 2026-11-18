# PR-N3 — minor-unit ledger, 10k duplicate fuzz, crash restore

| field | value |
|---|---|
| date | 2026-11-18 |
| task | PR-N3 |
| evidence | `docs/state/evidence/20261118T092845Z-PR-N3/01-acc-fuzz.log` |
| command | `pnpm vitest run tools/sim/persist/test/prn3.test.ts --reporter=verbose` |
| exit | 0 (7/7) |

## Measured

| metric | value | meaning |
|---|---|---|
| transactions posted | **10 000** | deterministic bigint minor-unit script, accounts from system mint/fees + 3..99 |
| refused | **0** | every well-formed transaction posted |
| duplicate replays deduped | **1 000** | every 10th key reposted in reverse order |
| key conflicts | **1** | same key, different amount → `LedgerError('conflict')`, no overwrite |
| drift | **0 minor units** | sum over every account, D150 |
| posts after crash restore | **0** | the entire 10k script replayed against the restored ledger |
| restore verified | **true** | balances, applied keys and FNV-1a checksum all match |

## Invariants proven

- One entry moves `minorUnits` from `debit` to `credit` as **bigint**; no float, no rounding.
- An identical `(key, payload)` replay returns `duplicate` without a balance change. A changed payload under an
  existing key raises `conflict` and leaves balances untouched.
- `checkpoint v1 {version, tick, checksum, balances, applied, log}` is a plain object. Restore replays the log
  and refuses a tampered checkpoint instead of repairing it.
- Invalid entries (same account, non-bigint amount) are refused before any mutation.

## What this is NOT

- **Not a database test.** No durable store, no disk benchmark, no multi-process concurrency.
- **Not a 30-minute crash window.** A simulated crash at checkpoint tick 10 000 followed by a full replay.
- **Not a throughput claim.** The fuzz is a structural correctness run on local CPU.

## Blueprint acc repair

`pnpm sim prn3 --assert` could not run (no `sim` script). The acc is now the vitest command above. This is the
ninth distinct broken acc form found; 7 `pnpm test --filter` forms remain.
