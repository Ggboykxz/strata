/**
 * Per-client fixed-window rate limit (SEC-001 / GDD-SECURITY §5). 30 intents per 30-tick window at 30 Hz.
 * Excess messages are refused with a reason, never queued or delayed — a delayed flood is a hidden flood.
 */
export const MAX_INTENTS_PER_WINDOW = 30;
export const WINDOW_TICKS = 30;

export type RateVerdict = 'allowed' | 'rate-limited';

interface Counter {
  window: number;
  count: number;
}

export class RateLimiter {
  private readonly counters = new Map<number, Counter>();

  check(client: number, tick: number): RateVerdict {
    if (!Number.isInteger(client) || client < 0 || !Number.isInteger(tick) || tick < 0) {
      throw new RangeError('client and tick must be non-negative integers');
    }
    const window = Math.floor(tick / WINDOW_TICKS);
    const counter = this.counters.get(client) ?? { window, count: 0 };
    if (counter.window !== window) { counter.window = window; counter.count = 0; }
    if (counter.count >= MAX_INTENTS_PER_WINDOW) {
      this.counters.set(client, counter);
      return 'rate-limited';
    }
    counter.count++;
    this.counters.set(client, counter);
    return 'allowed';
  }

  reset(client: number): void { this.counters.delete(client); }
  get trackedClients(): number { return this.counters.size; }
}
