/**
 * PR-N3 fuzz harness. Runs 10 000 deterministic minor-unit transactions, reposts duplicates in reverse order,
 * attempts a key conflict, then checkpoints, restores and replays the whole script against the restored ledger.
 * The report is a LOCAL structural measurement: no database, no multi-process concurrency, no disk benchmark.
 */
import {
  Ledger, LedgerError, SYSTEM_FEES, SYSTEM_MINT, makeCheckpoint, restoreCheckpoint, transfer,
  type Transaction,
} from '../../../packages/core/src/index';

export interface FuzzReport {
  readonly transactions: number;
  readonly posted: number;
  readonly duplicates: number;
  readonly conflicts: number;
  readonly refused: number;
  readonly replay_posts_after_restore: number;
  readonly drift_minor_units: string;
  readonly restored_ok: boolean;
  readonly checkpoint_tick: number;
  readonly label: string;
}

function buildScript(count: number): readonly Transaction[] {
  const script: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    const from = i % 100 === 0 ? SYSTEM_MINT : (i % 97) + 3;
    let to = ((i * 7) % 97) + 3;
    if (to === from) to = (to % 97) + 3;
    if (i % 1000 === 0) to = SYSTEM_FEES;
    const key = `tx-${i}`;
    script.push({ key, entries: transfer(key, from, to, BigInt((i % 500) + 1)) });
  }
  return script;
}

export function runFuzz(count = 10_000): FuzzReport {
  if (!Number.isInteger(count) || count < 10) throw new RangeError('count must be an integer >= 10');
  const ledger = new Ledger();
  const script = buildScript(count);
  let posted = 0;
  let refused = 0;
  for (const transaction of script) {
    if (ledger.post(transaction) === 'posted') posted++;
    else refused++;
  }

  let duplicates = 0;
  for (let i = script.length - 1; i >= 0; i -= 10) {
    if (ledger.post(script[i]!) === 'duplicate') duplicates++;
  }

  let conflicts = 0;
  const conflict: Transaction = {
    key: 'tx-0',
    entries: transfer('tx-0', 3, 4, 999_999n, 'tx-0:conflict'),
  };
  try {
    ledger.post(conflict);
  } catch (error) {
    if (error instanceof LedgerError && error.code === 'conflict') conflicts++;
  }

  const checkpoint = makeCheckpoint(ledger, count);
  const restored = restoreCheckpoint(checkpoint);
  let replayPostsAfterRestore = 0;
  for (const transaction of script) {
    if (restored.post(transaction) === 'posted') replayPostsAfterRestore++;
  }
  const restoredOk = restored.drift() === 0n
    && JSON.stringify(restored.snapshot().balances) === JSON.stringify(ledger.snapshot().balances)
    && replayPostsAfterRestore === 0;

  return {
    transactions: count,
    posted,
    duplicates,
    conflicts,
    refused,
    replay_posts_after_restore: replayPostsAfterRestore,
    drift_minor_units: restored.drift().toString(),
    restored_ok: restoredOk,
    checkpoint_tick: count,
    label: 'local structural fuzz — no database, no multi-process concurrency, no disk benchmark',
  };
}
