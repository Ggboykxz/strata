## 2026-11-18T10:00:00Z | backend-engineer -> all | EVIDENCE

**claim.** PR-N3 is implemented: a zero-sum bigint minor-unit ledger with idempotency, a checkpoint/checksum
restore, and a 10 000-transaction duplicate fuzz that ends with zero drift and zero reposts after restore.

**evidence** (`docs/state/evidence/20261118T092845Z-PR-N3/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm sim prn3 --assert` | **1** | no `sim` script |
| `01-acc-fuzz.log` | `pnpm vitest run tools/sim/persist/test/prn3.test.ts --reporter=verbose` | 0 | **7/7**, report printed |
| `02-core.log` | `pnpm vitest run packages/core` | 0 | **41/41** (ledger included) |
| `03-typecheck.log` | `pnpm typecheck` | 0 | strict, no error |
| `04-full-tests.log` | `pnpm test` | 0 | **132/132** (14 files) |
| `05-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock/RNG/transcendental/foreign import |
| `06-verify.log` / `10-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `07-gdd.log` / `08-blueprint.log` / `09-tracer.log` | validators and tracer | 0 | 32 modules · 63 tasks · green |

**measured in the evidence run.** 10 000 posted, 0 refused, 1 000 duplicates deduped in reverse order, 1 conflict,
drift **0** minor units, 0 posts after restore, restored_ok true.

**what the tests prove.** Bigint deltas cancel exactly; a same-account transfer throws before posting; non-bigint
and unbalanced entries are refused with no mutation; idempotent replay returns `duplicate`; a changed payload
under an existing key throws `conflict`; checkpoint restore rebuilds balances and rejects a replayed script;
a tampered checkpoint fails verification instead of being repaired; the full fuzz reports zero drift.

**defects repaired.** `pnpm sim prn3 --assert` could never run (no `sim` script) — ninth broken acc form. Repaired
to the vitest command. `validate-blueprint` B2 then caught that `docs/qa/prototypes/PRN3.md` is qa-engineer-owned
while PR-N3's agent is backend-engineer; the task now declares `co: [qa-engineer]`. Append-only zones still need
an ownership declaration for the validator. 7 `pnpm test --filter` accs remain.

**docs.** GDD-PERSISTENCE 0.2 → 0.3 and GDD-TRADE 0.2 → 0.3 (I9): bigint minor units, payload hashes, conflict
semantics, checkpoint contract, fuzz numbers. Both corrupted §18 open-question tables were replaced with real
questions. Prototype report at `docs/qa/prototypes/PRN3.md`.

**honest limits.** No database, no multi-process concurrency, no disk benchmark, no 30-minute crash window, no
RPO promise. This is a local structural fuzz; throughput and latency remain out of scope. No GPU/TPU needed.

**locks.** 12 globs, one sorted commit, four owners (backend-engineer, economy-designer, gameplay-engineer,
orchestrator).
