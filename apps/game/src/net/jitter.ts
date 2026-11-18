/**
 * Adaptive presentation jitter buffer (NET-006 / D149). Bounds: 100–250 ms at 30 Hz = 3–8 ticks.
 * Integer ticks only, presentation-only: it decides *which* snapshot to render, never what the server believes.
 * The observed inter-snapshot gap is a number, not a network RTT measurement (PR-N1 owns measurements).
 */
export const MIN_JITTER_TICKS = 3;  // 100 ms at 30 Hz
export const MAX_JITTER_TICKS = 8;  // 250 ms at 30 Hz

export class AdaptiveJitterBuffer {
  private bufferTicks: number;
  private lastSnapshotTick = -1;

  constructor(readonly min = MIN_JITTER_TICKS, readonly max = MAX_JITTER_TICKS) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) {
      throw new RangeError('jitter bounds must be integers with 1 <= min <= max');
    }
    this.bufferTicks = min;
  }

  get ticks(): number { return this.bufferTicks; }

  /** Observe the gap between two snapshots and adapt by at most one tick per observation. */
  observe(snapshotTick: number): void {
    if (!Number.isInteger(snapshotTick) || snapshotTick < 0) throw new RangeError('snapshot tick must be non-negative');
    if (this.lastSnapshotTick < 0) { this.lastSnapshotTick = snapshotTick; return; }
    const gap = snapshotTick - this.lastSnapshotTick;
    this.lastSnapshotTick = snapshotTick;
    if (gap <= 0) return; // duplicate/older snapshot: ignored, never rewinds
    if (gap > this.bufferTicks) this.bufferTicks = Math.min(this.max, this.bufferTicks + 1);
    else if (gap < this.bufferTicks - 1) this.bufferTicks = Math.max(this.min, this.bufferTicks - 1);
  }

  /** Which server tick should be rendered now. Deliberately behind the newest known snapshot. */
  renderTick(latestServerTick: number): number {
    if (!Number.isInteger(latestServerTick)) throw new RangeError('tick must be an integer');
    return latestServerTick - this.bufferTicks;
  }

  /** A resync discards the observation history and returns to the safe minimum. */
  reset(): void {
    this.lastSnapshotTick = -1;
    this.bufferTicks = this.min;
  }
}
