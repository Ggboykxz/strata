import { describe, expect, it } from 'vitest';
import { AdaptiveJitterBuffer, MAX_JITTER_TICKS, MIN_JITTER_TICKS } from '../src/net';

describe('adaptive jitter buffer', () => {
  it('starts at the 100 ms floor and renders behind the newest snapshot', () => {
    const buffer = new AdaptiveJitterBuffer();
    expect(MIN_JITTER_TICKS).toBe(3); // 100 ms at 30 Hz
    expect(MAX_JITTER_TICKS).toBe(8); // 250 ms at 30 Hz
    expect(buffer.ticks).toBe(MIN_JITTER_TICKS);
    expect(buffer.renderTick(100)).toBe(97);
  });

  it('grows one tick per late gap and never exceeds the ceiling', () => {
    const buffer = new AdaptiveJitterBuffer();
    buffer.observe(0);
    for (let tick = 10; tick <= 120; tick += 10) buffer.observe(tick);
    expect(buffer.ticks).toBe(MAX_JITTER_TICKS);
  });

  it('shrinks when snapshots arrive closer than the current buffer', () => {
    const buffer = new AdaptiveJitterBuffer();
    buffer.observe(0);
    for (let tick = 10; tick <= 120; tick += 10) buffer.observe(tick);
    expect(buffer.ticks).toBe(MAX_JITTER_TICKS);
    for (let tick = 121; tick <= 150; tick++) buffer.observe(tick);
    expect(buffer.ticks).toBe(MIN_JITTER_TICKS);
  });

  it('ignores duplicate or older snapshots and resets on resync', () => {
    const buffer = new AdaptiveJitterBuffer();
    buffer.observe(10);
    buffer.observe(10);
    buffer.observe(9);
    expect(buffer.ticks).toBe(MIN_JITTER_TICKS);
    buffer.reset();
    expect(buffer.ticks).toBe(MIN_JITTER_TICKS);
    expect(buffer.renderTick(50)).toBe(47);
  });

  it('refuses an invalid bound', () => {
    expect(() => new AdaptiveJitterBuffer(8, 3)).toThrow(RangeError);
    expect(() => new AdaptiveJitterBuffer(0, 8)).toThrow(RangeError);
  });
});
