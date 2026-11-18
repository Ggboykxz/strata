import { describe, expect, it } from 'vitest';
import {
  Ledger, LedgerError, SYSTEM_MINT, isBalanced, makeCheckpoint, restoreCheckpoint, transfer,
  verifyCheckpoint,
} from '../../../../packages/core/src/index';
import { runFuzz } from '../prn3_ledger';

describe('minor-unit ledger', () => {
  it('moves bigint minor units with zero drift', () => {
    const ledger = new Ledger();
    expect(ledger.post({ key: 'a', entries: transfer('a', SYSTEM_MINT, 5, 125n) })).toBe('posted');
    expect(ledger.balance(5)).toBe(125n);
    expect(ledger.balance(SYSTEM_MINT)).toBe(-125n);
    expect(ledger.drift()).toBe(0n);
  });

  it('refuses invalid entries before changing any balance', () => {
    const ledger = new Ledger();
    expect(() => transfer('a', 1, 1, 5n)).toThrow(LedgerError);
    expect(isBalanced(transfer('a', 1, 2, 5n))).toBe(true);
    expect(ledger.post({ key: 'a', entries: [{ id: 'x', debit: 1, credit: 1, minorUnits: 5n, idempotencyKey: 'a' }] })).toBe('refused');
    expect(ledger.post({ key: 'b', entries: [{ id: 'x', debit: 1, credit: 2, minorUnits: 5.5 as unknown as bigint, idempotencyKey: 'b' }] })).toBe('refused');
    expect(ledger.transactionCount).toBe(0);
  });

  it('is idempotent for an identical replay and conflicts on a changed payload', () => {
    const ledger = new Ledger();
    const tx = { key: 'k', entries: transfer('k', 1, 2, 7n) };
    expect(ledger.post(tx)).toBe('posted');
    expect(ledger.post(tx)).toBe('duplicate');
    expect(() => ledger.post({ key: 'k', entries: transfer('k', 1, 2, 8n) })).toThrow(LedgerError);
    expect(ledger.balance(2)).toBe(7n);
  });
});

describe('checkpoint and crash restore', () => {
  it('restores balances and rejects a replayed script as duplicates', () => {
    const ledger = new Ledger();
    ledger.post({ key: 'one', entries: transfer('one', SYSTEM_MINT, 3, 100n) });
    ledger.post({ key: 'two', entries: transfer('two', 3, 4, 40n) });
    const checkpoint = makeCheckpoint(ledger, 2);
    expect(verifyCheckpoint(checkpoint)).toBe(true);
    const restored = restoreCheckpoint(checkpoint);
    expect(restored.balance(3)).toBe(60n);
    expect(restored.balance(4)).toBe(40n);
    expect(restored.post({ key: 'one', entries: transfer('one', SYSTEM_MINT, 3, 100n) })).toBe('duplicate');
  });

  it('refuses a tampered checkpoint instead of repairing it', () => {
    const ledger = new Ledger();
    ledger.post({ key: 'one', entries: transfer('one', SYSTEM_MINT, 3, 100n) });
    const checkpoint = makeCheckpoint(ledger, 1);
    const tampered = { ...checkpoint, balances: [[3, '999']] as const };
    expect(verifyCheckpoint(tampered as typeof checkpoint)).toBe(false);
    expect(() => restoreCheckpoint(tampered as typeof checkpoint)).toThrow(LedgerError);
  });
});

describe('PR-N3 10k fuzz harness', () => {
  it('posts 10 000 transactions, dedupes, conflicts, and restores cleanly', () => {
    const report = runFuzz(10_000);
    console.log(JSON.stringify(report, null, 2));
    expect(report.transactions).toBe(10_000);
    expect(report.posted).toBe(10_000);
    expect(report.refused).toBe(0);
    expect(report.duplicates).toBe(1_000);
    expect(report.conflicts).toBe(1);
    expect(report.replay_posts_after_restore).toBe(0);
    expect(report.drift_minor_units).toBe('0');
    expect(report.restored_ok).toBe(true);
    expect(report.label).toContain('no database');
  });

  it('refuses an invalid fuzz size', () => {
    expect(() => runFuzz(5)).toThrow(RangeError);
  });
});
