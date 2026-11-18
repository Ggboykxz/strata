/**
 * Double-entry ledger with idempotency (PR-N3). One idempotency key posts at most once. A replay of the same
 * key with the same payload returns `duplicate`; the same key with a different payload is a `conflict`, never
 * an overwrite. Invalid transactions are refused before any balance changes.
 */
import { fnv1a32 } from '../tick';
import { LedgerError, applyEntry, isBalanced, type LedgerEntry } from './entry';

export interface Transaction {
  readonly key: string;
  readonly entries: readonly LedgerEntry[];
}

export type PostResult = 'posted' | 'duplicate' | 'conflict' | 'refused';

function asTransaction(raw: unknown): Transaction | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.key !== 'string' || !value.key || !Array.isArray(value.entries)) return null;
  const entries: LedgerEntry[] = [];
  for (const item of value.entries) {
    if (typeof item !== 'object' || item === null) return null;
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== 'string' || typeof entry.idempotencyKey !== 'string'
      || typeof entry.debit !== 'number' || typeof entry.credit !== 'number'
      || typeof entry.minorUnits !== 'bigint') return null;
    entries.push({
      id: entry.id,
      debit: entry.debit,
      credit: entry.credit,
      minorUnits: entry.minorUnits,
      idempotencyKey: entry.idempotencyKey,
    });
  }
  return { key: value.key, entries };
}

/** Deterministic FNV-1a over the full payload, including bigint amounts as decimal strings. */
export function payloadHash(transaction: Transaction): string {
  const parts: string[] = [transaction.key];
  for (const entry of transaction.entries) {
    parts.push(entry.id, String(entry.debit), String(entry.credit), entry.minorUnits.toString(), entry.idempotencyKey);
  }
  const codes: number[] = [];
  for (const part of parts) for (let i = 0; i < part.length; i++) codes.push(part.charCodeAt(i));
  return fnv1a32(codes).toString(16).padStart(8, '0');
}

export class Ledger {
  private readonly balances = new Map<number, bigint>();
  private readonly applied = new Map<string, string>();
  private readonly log: Transaction[] = [];

  post(raw: unknown): PostResult {
    const transaction = asTransaction(raw);
    if (!transaction) return 'refused';
    const hash = payloadHash(transaction);
    const previous = this.applied.get(transaction.key);
    if (previous === hash) return 'duplicate';
    if (previous !== undefined) throw new LedgerError('conflict', `key ${transaction.key} reused with a different payload`);
    if (!isBalanced(transaction.entries)) return 'refused';
    for (const entry of transaction.entries) applyEntry(this.balances, entry);
    this.applied.set(transaction.key, hash);
    this.log.push(transaction);
    return 'posted';
  }

  balance(account: number): bigint { return this.balances.get(account) ?? 0n; }
  get transactionCount(): number { return this.log.length; }
  get appliedKeys(): ReadonlyMap<string, string> { return this.applied; }
  get transactionLog(): readonly Transaction[] { return this.log; }
  get accounts(): readonly number[] { return [...this.balances.keys()].sort((a, b) => a - b); }

  /** Sum over every account. Must be exactly 0n; D150. */
  drift(): bigint {
    let total = 0n;
    for (const amount of this.balances.values()) total += amount;
    return total;
  }

  snapshot(): { balances: readonly (readonly [number, string])[]; applied: readonly (readonly [string, string])[]; log: readonly Transaction[] } {
    return {
      balances: [...this.balances].sort((a, b) => a[0] - b[0]).map(([id, amount]) => [id, amount.toString()] as const),
      applied: [...this.applied].sort((a, b) => a[0].localeCompare(b[0])).map(([key, hash]) => [key, hash] as const),
      log: this.log,
    };
  }
}
