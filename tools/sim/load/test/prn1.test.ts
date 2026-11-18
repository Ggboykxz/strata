import { describe, expect, it } from 'vitest';
import { MAX_FRAME_BYTES } from '../../../../packages/protocol/src/index';
import { runLoad } from '../prn1_load';

describe('PR-N1 local load harness', () => {
  it('measures the real server code path and prints a labelled report', () => {
    const report = runLoad(180, 64, 20);
    console.log(JSON.stringify(report, null, 2));
    expect(report.ticks).toBe(180);
    expect(report.entities).toBe(64);
    expect(report.warmup_ticks).toBe(20);
    expect(report.deterministic).toBe(true);
    expect(report.snapshot_bytes).toBe(1555);
    expect(report.snapshot_bytes).toBeLessThanOrEqual(MAX_FRAME_BYTES);
    expect(report.snapshot_bytes_per_second).toBe(1555 * 30);
    expect(report.over_budget_factor).toBeGreaterThan(3);
    expect(report.tick_cpu_p95_ms).toBeGreaterThanOrEqual(report.tick_cpu_p50_ms);
    expect(report.tick_cpu_p50_ms).toBeGreaterThanOrEqual(0);
    expect(report.label).toContain('NOT network RTT');
  });

  it('is repeatable: two runs have the same framed byte rate and budgets', () => {
    const a = runLoad(60, 16, 5);
    const b = runLoad(60, 16, 5);
    expect(a.snapshot_bytes_per_second).toBe(b.snapshot_bytes_per_second);
    expect(a.over_budget_factor).toBe(b.over_budget_factor);
    expect(a.deterministic).toBe(true);
  });

  it('refuses invalid parameters', () => {
    expect(() => runLoad(10, 64, 10)).toThrow(RangeError);
    expect(() => runLoad(10, 0, 0)).toThrow(RangeError);
  });
});
