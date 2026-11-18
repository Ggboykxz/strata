import { describe, expect, it } from 'vitest';
import {
  MAX_HIT_STOP_TICKS, cycleTicks, isLegalWindow, simulateCombat, type CombatParams,
} from '../prs1_combat';

const baseline: CombatParams = {
  hp: 100,
  damage: 25,
  windupTicks: 3,
  activeTicks: 2,
  recoveryTicks: 4,
  intervalTicks: 9,
  hitStopTicks: 2,
};

describe('combat windows', () => {
  it('accepts a legal window and refuses an illegal one instead of clamping', () => {
    expect(isLegalWindow(baseline)).toBe(true);
    expect(() => simulateCombat({ ...baseline, windupTicks: 0 })).toThrow(RangeError);
    expect(() => simulateCombat({ ...baseline, activeTicks: 0 })).toThrow(RangeError);
    expect(() => simulateCombat({ ...baseline, recoveryTicks: -1 })).toThrow(RangeError);
    expect(() => simulateCombat({ ...baseline, intervalTicks: 5 })).toThrow(RangeError);
    expect(() => simulateCombat({ ...baseline, damage: 0 })).toThrow(RangeError);
    expect(() => simulateCombat({ ...baseline, hitStopTicks: MAX_HIT_STOP_TICKS + 1 })).toThrow(RangeError);
    expect(() => simulateCombat({ ...baseline, damage: 1.5 })).toThrow(RangeError);
  });

  it('includes hit-stop in the cycle', () => {
    expect(cycleTicks(baseline)).toBe(11);
    expect(cycleTicks({ ...baseline, intervalTicks: 20 })).toBe(20);
  });
});

describe('PR-S1 greybox report', () => {
  it('computes integer TTK and prints a labelled local report', () => {
    const report = simulateCombat(baseline);
    console.log(JSON.stringify(report, null, 2));
    expect(report.hits_to_kill).toBe(4);
    expect(report.cycle_ticks).toBe(11);
    expect(report.ttk_ticks).toBe(3 * 11 + 3);
    expect(report.ttk_ms).toBe(Math.round((report.ttk_ticks * 1000) / 30));
    expect(report.hit_stop_ticks).toBe(8);
    expect(report.legal).toBe(true);
    expect(report.label).toContain('not a playtest');
  });

  it('is deterministic and scales linearly with hits to kill', () => {
    const a = simulateCombat(baseline);
    const b = simulateCombat(baseline);
    expect(a).toEqual(b);
    const tougher = simulateCombat({ ...baseline, hp: 200 });
    expect(tougher.hits_to_kill).toBe(8);
    expect(tougher.ttk_ticks).toBeGreaterThan(a.ttk_ticks);
  });
});
