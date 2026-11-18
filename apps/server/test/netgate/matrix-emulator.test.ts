/**
 * Self-check tests for the NET-GATE matrix emulator and its helpers.
 *
 * These assert ONLY on the harness's own helpers (matrix-emulator.ts). They make no claim about any
 * NET-GATE criterion: no assertion here may be read as "four-client-matrix passed".
 */
import { describe, expect, it } from 'vitest';
import {
  ByteMeter, MATRIX_DEFAULT_SEED, MATRIX_WORLD_SEED, MatrixChannel, SeededLcg,
  isLost, jitterDelayMs, oneWayDelayMs, packetDelayMs, percentile, summarizeDurations, toBytes,
} from './matrix-emulator';

describe('delay math', () => {
  it('one-way delay is exactly half the RTT', () => {
    expect(oneWayDelayMs(0)).toBe(0);
    expect(oneWayDelayMs(50)).toBe(25);
    expect(oneWayDelayMs(150)).toBe(75);
    expect(oneWayDelayMs(300)).toBe(150);
  });

  it('rejects a negative or non-finite RTT', () => {
    expect(() => oneWayDelayMs(-1)).toThrow(RangeError);
    expect(() => oneWayDelayMs(Number.NaN)).toThrow(RangeError);
    expect(() => oneWayDelayMs(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('jitter is uniform in [0, jitterMs] and zero when jitter is disabled', () => {
    const rng = new SeededLcg(42);
    for (let i = 0; i < 1000; i++) {
      const j = jitterDelayMs(30, () => rng.next());
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThanOrEqual(30);
    }
    expect(jitterDelayMs(0, () => 0.9999)).toBe(0);
  });

  it('packet delay is one-way plus jitter and equals one-way when jitter is zero', () => {
    const config = { rttMs: 150, lossPct: 0, jitterMs: 0 };
    expect(packetDelayMs(config, () => 0.5)).toBe(75);
    const jittered = packetDelayMs({ rttMs: 150, lossPct: 0, jitterMs: 30 }, () => 0.5);
    expect(jittered).toBe(75 + 15);
  });

  it('loss probability boundaries are enforced', () => {
    expect(() => isLost(-0.1, () => 0)).toThrow(RangeError);
    expect(() => isLost(100, () => 0)).toThrow(RangeError);
    expect(isLost(0, () => 0)).toBe(false);
    expect(isLost(5, () => 0.049)).toBe(true);
    expect(isLost(5, () => 0.051)).toBe(false);
  });
});

describe('seeded determinism', () => {
  it('the same seed reproduces the same LCG sequence', () => {
    const a = new SeededLcg(MATRIX_DEFAULT_SEED);
    const b = new SeededLcg(MATRIX_DEFAULT_SEED);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it('different seeds produce different sequences', () => {
    const a = new SeededLcg(MATRIX_DEFAULT_SEED);
    const b = new SeededLcg(MATRIX_DEFAULT_SEED + 1);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('loss draws are reproducible: two channels with the same seed drop the same frames', () => {
    const config = { rttMs: 0, lossPct: 5, jitterMs: 0 };
    const plan = (offset: number) => {
      const channel = new MatrixChannel(config, MATRIX_DEFAULT_SEED);
      const losses: number[] = [];
      for (let i = 0; i < 500; i++) {
        const delivered = channel.push(new Uint8Array([i & 0xff]), () => {});
        if (!delivered) losses.push(i);
      }
      channel.dispose();
      return losses;
    };
    expect(plan(0)).toEqual(plan(1));
    // 5% of 500 frames ≈ 25 drops; assert only that the run is non-degenerate.
    expect(plan(0).length).toBeGreaterThan(0);
    expect(plan(0).length).toBeLessThan(100);
  });

  it('a channel with zero loss delivers every frame', async () => {
    const channel = new MatrixChannel({ rttMs: 0, lossPct: 0, jitterMs: 0 }, MATRIX_DEFAULT_SEED);
    let delivered = 0;
    for (let i = 0; i < 50; i++) channel.push(new Uint8Array([i]), () => { delivered += 1; });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(delivered).toBe(50);
    expect(channel.stats.delivered).toBe(50);
    expect(channel.stats.dropped).toBe(0);
    channel.dispose();
  });

  it('dispose clears pending deliveries', async () => {
    const channel = new MatrixChannel({ rttMs: 50, lossPct: 0, jitterMs: 0 }, MATRIX_DEFAULT_SEED);
    let delivered = 0;
    for (let i = 0; i < 10; i++) channel.push(new Uint8Array([i]), () => { delivered += 1; });
    channel.dispose();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(delivered).toBe(0);
    expect(channel.pending).toBe(0);
  });

  it('sub-seeds are stable and distinct per stream', () => {
    expect(SeededLcg.subSeed(MATRIX_DEFAULT_SEED, 1)).toBe(SeededLcg.subSeed(MATRIX_DEFAULT_SEED, 1));
    expect(SeededLcg.subSeed(MATRIX_DEFAULT_SEED, 1)).not.toBe(SeededLcg.subSeed(MATRIX_DEFAULT_SEED, 2));
  });

  it('world seed constant matches the harness contract', () => {
    expect(MATRIX_WORLD_SEED).toBe(1337);
    expect(MATRIX_DEFAULT_SEED).toBe(20261118);
  });
});

describe('byte accounting', () => {
  it('counts encoded frame bytes and computes a per-second rate', () => {
    const meter = new ByteMeter();
    meter.add(1500);
    meter.add(1500);
    meter.add(31);
    expect(meter.bytes).toBe(3031);
    expect(meter.count).toBe(3);
    expect(meter.ratePerSecond(2)).toBeCloseTo(1515.5);
    expect(meter.ratePerSecond(0)).toBe(0);
  });

  it('rejects a negative byte count', () => {
    const meter = new ByteMeter();
    expect(() => meter.add(-1)).toThrow(RangeError);
  });

  it('toBytes measures Uint8Array payloads exactly', () => {
    expect(toBytes(new Uint8Array([1, 2, 3, 4])).byteLength).toBe(4);
    expect(toBytes(new Uint8Array(10)).byteLength).toBe(10);
  });
});

describe('percentile and duration summary', () => {
  it('percentile interpolates between closest ranks', () => {
    expect(percentile([], 95)).toBe(0);
    expect(percentile([5], 95)).toBe(5);
    expect(percentile([1, 2, 3, 4], 50)).toBeCloseTo(2.5);
    expect(percentile([1, 2, 3, 4], 100)).toBe(4);
    expect(percentile([1, 2, 3, 4], 0)).toBe(1);
  });

  it('summarizeDurations reports p50/p95/p99/max and mean', () => {
    const samples = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    const stats = summarizeDurations(samples);
    expect(stats.count).toBe(100);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(100);
    expect(stats.mean).toBeCloseTo(50.5);
    expect(stats.p50).toBeCloseTo(50.5);
    expect(stats.p95).toBeCloseTo(95.05);
    expect(stats.p99).toBeCloseTo(99.01);
  });

  it('summarizeDurations of an empty set is all zeros with count 0', () => {
    const stats = summarizeDurations([]);
    expect(stats).toEqual({ count: 0, min: 0, mean: 0, p50: 0, p95: 0, p99: 0, max: 0 });
  });
});
