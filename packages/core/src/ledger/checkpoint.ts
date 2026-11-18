/**
 * Checkpoint and crash restore (PR-N3 / GDD-PERSISTENCE §6). A checkpoint is a plain serialisable object; restore
 * replays the transaction log in order and then refuses to continue if balances or checksum disagree. A bad
 * checkpoint is a hard failure — it is never silently repaired.
 */
import { fnv1a32 } from '../tick';
import { LedgerError } from './entry';
import { Ledger, type Transaction } from './ledger';

export interface Checkpoint {
  readonly version: 1;
  readonly tick: number;
  readonly checksum: string;
  readonly balances: readonly (readonly [number, string])[];
  readonly applied: readonly (readonly [string, string])[];
  readonly log: readonly Transaction[];
}

function checksumOf(tick: number, balances: readonly (readonly [number, string])[],
  applied: readonly (readonly [string, string])[]): string {
  const parts: string[] = [String(tick)];
  for (const [id, amount] of balances) parts.push(`${id}:${amount}`);
  for (const [key, hash] of applied) parts.push(`${key}:${hash}`);
  const codes: number[] = [];
  for (const part of parts) for (let i = 0; i < part.length; i++) codes.push(part.charCodeAt(i));
  return fnv1a32(codes).toString(16).padStart(8, '0');
}

export function makeCheckpoint(ledger: Ledger, tick = 0): Checkpoint {
  if (!Number.isInteger(tick) || tick < 0) throw new RangeError('checkpoint tick must be non-negative');
  const snapshot = ledger.snapshot();
  return {
    version: 1,
    tick,
    checksum: checksumOf(tick, snapshot.balances, snapshot.applied),
    balances: snapshot.balances,
    applied: snapshot.applied,
    log: snapshot.log,
  };
}

/** Replay the log, then verify balances, applied keys and checksum. Throws on any mismatch. */
export function restoreCheckpoint(checkpoint: Checkpoint): Ledger {
  if (checkpoint.version !== 1) throw new LedgerError('checksum', 'unsupported checkpoint version');
  const rebuilt = new Ledger();
  for (const transaction of checkpoint.log) {
    if (rebuilt.post(transaction) !== 'posted') {
      throw new LedgerError('checksum', `log replay refused ${String(transaction?.key)}`);
    }
  }
  const snapshot = rebuilt.snapshot();
  const balancesMatch = JSON.stringify(snapshot.balances) === JSON.stringify(checkpoint.balances);
  const appliedMatch = JSON.stringify(snapshot.applied) === JSON.stringify(checkpoint.applied);
  const checksum = checksumOf(checkpoint.tick, checkpoint.balances, checkpoint.applied);
  if (!balancesMatch || !appliedMatch || checksum !== checkpoint.checksum) {
    throw new LedgerError('checksum', 'checkpoint does not match its replayed log');
  }
  return rebuilt;
}

export function verifyCheckpoint(checkpoint: Checkpoint): boolean {
  try { restoreCheckpoint(checkpoint); return true; } catch { return false; }
}
