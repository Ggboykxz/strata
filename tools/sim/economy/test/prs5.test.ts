import { describe, expect, it } from 'vitest';
import { giniMicro, recordOnce, runEconomy } from '../prs5_economy';

describe('economy measures', () => {
  it('computes Gini in micro units with integer math', () => {
    expect(giniMicro([10n, 10n, 10n, 10n])).toBeLessThanOrEqual(0n);
    expect(giniMicro([0n, 0n, 0n, 100n])).toBeGreaterThan(0n);
    expect(giniMicro([0n, 0n, 0n, 100n])).toBeLessThanOrEqual(1_000_000n);
  });

  it('refuses an idempotency-key replay', () => {
    const keys = new Set<string>();
    expect(recordOnce(keys, 'f-1')).toBe(true);
    expect(recordOnce(keys, 'f-1')).toBe(false);
  });
});

describe('PR-S5 economy simulation', () => {
  it('conserves bigint minor units on a small run', () => {
    const report = runEconomy(10, 1);
    expect(report.conserved).toBe(true);
    expect(report.negative_balances).toBe(0);
    expect(report.epochs).toBe(24);
  });

  it('prints a deterministic labelled report for 1000 bots x 30 days', () => {
    const report = runEconomy();
    console.log(JSON.stringify(report, null, 2));
    expect(report.bots).toBe(1000);
    expect(report.days).toBe(30);
    expect(report.epochs).toBe(720);
    expect(report.conserved).toBe(true);
    expect(report.negative_balances).toBe(0);
    expect(report.replay_refusals).toBe(10);
    expect(report.exploit_cycles).toBe(1);
    expect(report.cycle_path.length).toBeGreaterThan(0);
    expect(BigInt(report.gini_micro)).toBeGreaterThanOrEqual(0n);
    expect(report.checksum).toMatch(/^[0-9a-f]{8}$/);
    expect(report.label).toContain('NOT a 30 Hz replay');
    expect(runEconomy()).toEqual(report);
  });

  it('refuses invalid simulation parameters', () => {
    expect(() => runEconomy(1, 30)).toThrow(RangeError);
    expect(() => runEconomy(1000, 0)).toThrow(RangeError);
  });
});
