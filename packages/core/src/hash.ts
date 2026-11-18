/**
 * Client tick→hash timeline (NET-004). The mirror of the server's `HashRing`: a client remembers the hash it
 * predicted at each tick, then compares it with the server snapshot hash **for that same tick**.
 *
 * Bounded by tick count, never by a wall clock. `forgetBefore` follows the snapshot stream, so an old tick is
 * dropped as soon as the server has acknowledged past it. A missing tick is `unknown`, never `ok` (GDD §8.3).
 */
export type HashVerdict = 'ok' | 'desync' | 'unknown';

const isHash = (value: string): boolean => /^[0-9a-f]{8}$/.test(value);

export class HashTimeline {
  private readonly hashes = new Map<number, string>();

  constructor(readonly capacity = 128) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('capacity must be a positive integer');
  }

  get size(): number { return this.hashes.size; }

  put(tick: number, hash: string): void {
    if (!Number.isInteger(tick) || tick < 0) throw new RangeError('tick must be a non-negative integer');
    if (!isHash(hash)) throw new RangeError(`hash ${String(hash)} is not 8 lowercase hex chars`);
    this.hashes.set(tick, hash);
    while (this.hashes.size > this.capacity) {
      const oldest = this.hashes.keys().next();
      if (oldest.done) break;
      this.hashes.delete(oldest.value);
    }
  }

  get(tick: number): string | undefined { return this.hashes.get(tick); }

  /** Compare at the tick the caller names. An unrecorded tick is `unknown`, not `ok`. */
  verify(tick: number, hash: string): HashVerdict {
    const expected = this.hashes.get(tick);
    if (expected === undefined) return 'unknown';
    return expected === hash ? 'ok' : 'desync';
  }

  /** Drop every tick strictly before `tick`. Called as the snapshot stream advances. */
  forgetBefore(tick: number): void {
    if (!Number.isInteger(tick) || tick < 0) throw new RangeError('tick must be a non-negative integer');
    for (const recorded of [...this.hashes.keys()]) {
      if (recorded < tick) this.hashes.delete(recorded);
    }
  }

  clear(): void { this.hashes.clear(); }
}
