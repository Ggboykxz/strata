## 2026-11-18T10:10:00Z | orchestrator -> backend-engineer | HANDOFF

**claim.** PR-N3 is the next selectable sig task: a zero-sum, bigint minor-unit ledger, a 10 000-transaction
duplicate fuzz, and crash restore from a checkpoint. It must prove D150 (every transaction sums to exactly zero)
and the persistence state machine in GDD-PERSISTENCE §6. No new dependency, no GPU/TPU.

**inputs.** GDD-PERSISTENCE §5/§6/§7, GDD-TRADE §5 (1 minor unit = 1 cent, 100 minor = 1 currency), D150,
PR-N1's harness pattern (`tools/sim/load/prn1_load.ts` + `test/`).

**expected outputs.** `packages/core/src/ledger/*` (entry, ledger, checkpoint), core export,
`tools/sim/persist/prn3_ledger.ts` + `test/prn3.test.ts`, `docs/qa/prototypes/PRN3.md`,
GDD-PERSISTENCE 0.2 → 0.3, GDD-TRADE 0.x → +1, PR-N3 acc repaired to a real command.

**acceptance.** `pnpm vitest run tools/sim/persist/test/prn3.test.ts` · `pnpm vitest run packages/core` ·
`pnpm test` · `pnpm typecheck` · `pnpm verify` · `pnpm tracer --assert`.

**constraints.** bigint minor units only; system accounts are explicit; zero drift under duplicated/retried
input; no silent repair of an unbalanced transaction; 30-min checkpoint.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T10:10:00Z | orchestrator -> backend-engineer | PROPOSAL

**entry shape.** `{id, debit, credit, minorUnits, idempotencyKey}` with amounts as `bigint`. A transaction is a
pair of entries whose signed sum is zero; `debit` and `credit` are account ids, never names. System accounts use
reserved ids (0 = mint, 1 = burn, 2 = fees) so a missing account cannot be silently invented.

**idempotency.** Every transaction carries a key. Replaying the same key returns the original result without
posting again — the 10k fuzz includes duplicates, reordered keys and retries after a simulated crash. A key whose
payload hash differs is a conflict, never an overwrite.

**checkpoint/restore.** Serialise the applied-key set, account balances and the transaction log into a plain
object. Restore replays the log in order and verifies that all balances match the checkpoint and that total supply
is conserved. A checksum mismatch is a hard failure, not a repair.

**harness.** Follow PR-N1: logic in `prn3_ledger.ts`, a vitest test that runs the 10k fuzz, prints a labelled
report and asserts structural truth. The blueprint's `pnpm sim prn3 --assert` is broken (no `sim` script) and is
repaired to the test path in the same PR.

**honest limits.** no real database, no multi-process concurrency, no 10-minute crash window evidence, no money
creation beyond explicit system-account transactions; restore timing is local CPU, not a disk benchmark.

**ACK** — backend-engineer, same process.
