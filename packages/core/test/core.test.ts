import { describe, expect, it } from 'vitest';
import { CORE_VERSION, TICK_HZ, TICK_MS } from '../src/index';

describe('core skeleton', () => {
  it('runs the simulation at 30 Hz', () => {
    expect(TICK_HZ).toBe(30);
    expect(TICK_MS).toBeCloseTo(33.333, 2);
  });

  it('declares a version', () => {
    expect(CORE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
