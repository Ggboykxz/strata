/**
 * Ledger entries (PR-N3). Money is bigint **minor units** only (D150, GDD-TRADE §5): 100 minor = 1 currency
 * unit. One entry moves `minorUnits` from `debit` to `credit`; the signed sum over all accounts is zero by
 * construction. No float, no rounding, no silent repair of an invalid entry.
 */
export const SYSTEM_MINT = 0;
export const SYSTEM_BURN = 1;
export const SYSTEM_FEES = 2;

export interface LedgerEntry {
  readonly id: string;
  readonly debit: number;
  readonly credit: number;
  readonly minorUnits: bigint;
  readonly idempotencyKey: string;
}

export type LedgerErrorCode =
  | 'unbalanced'
  | 'non-positive-amount'
  | 'bad-account'
  | 'empty-key'
  | 'conflict'
  | 'checksum';

export class LedgerError extends Error {
  constructor(readonly code: LedgerErrorCode, message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

/** The single amount this entry moves. Kept as bigint to avoid float drift. */
export function amountOf(entry: LedgerEntry): bigint {
  return entry.minorUnits;
}

/** Apply one entry to a balance map: debit subtracts, credit adds. Mutates the map passed in. */
export function applyEntry(balances: Map<number, bigint>, entry: LedgerEntry): void {
  balances.set(entry.debit, (balances.get(entry.debit) ?? 0n) - entry.minorUnits);
  balances.set(entry.credit, (balances.get(entry.credit) ?? 0n) + entry.minorUnits);
}

/** A transaction is valid only when every entry has two distinct accounts and a positive bigint amount. */
export function isBalanced(entries: readonly LedgerEntry[]): boolean {
  return entries.length > 0 && entries.every((entry) =>
    Number.isInteger(entry.debit) && Number.isInteger(entry.credit)
    && entry.debit >= 0 && entry.credit >= 0
    && entry.debit !== entry.credit
    && typeof entry.minorUnits === 'bigint' && entry.minorUnits > 0n
    && entry.idempotencyKey.length > 0);
}

/** Build a zero-sum transfer. System accounts are explicit ids, never names. */
export function transfer(
  key: string,
  from: number,
  to: number,
  minorUnits: bigint,
  id = `${key}:0`,
): readonly LedgerEntry[] {
  const entries: readonly LedgerEntry[] = [{
    id,
    debit: from,
    credit: to,
    minorUnits,
    idempotencyKey: key,
  }];
  if (!isBalanced(entries)) {
    throw new LedgerError(key ? 'bad-account' : 'empty-key', `invalid transfer ${String(key)}`);
  }
  return entries;
}
