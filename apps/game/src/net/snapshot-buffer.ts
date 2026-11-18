/**
 * Bounded presentation buffer of authoritative snapshots (NET-004). It only chooses what to render; it never
 * changes simulation state. A desync clears it so a stale pose cannot be drawn after a resync.
 */
import { type WorldState } from '@strata/core';
import type { SnapshotView } from './predictor';

export interface SnapshotPair {
  readonly from: WorldState;
  readonly to: WorldState;
  readonly numerator: number;
  readonly denominator: number;
}

interface Stored {
  readonly tick: number;
  readonly state: WorldState;
}

export class SnapshotBuffer {
  private readonly entries: Stored[] = [];

  constructor(readonly capacity = 4) {
    if (!Number.isInteger(capacity) || capacity < 2) throw new RangeError('capacity must be at least 2');
  }

  get size(): number { return this.entries.length; }
  get latest(): WorldState | null { return this.entries.at(-1)?.state ?? null; }

  push(snapshot: SnapshotView): void {
    if (!Number.isInteger(snapshot.tick) || snapshot.tick < 0) throw new RangeError('snapshot tick must be non-negative');
    const previous = this.entries.at(-1);
    if (previous && snapshot.tick <= previous.tick) return; // duplicate or out-of-order: never rewind presentation
    this.entries.push({
      tick: snapshot.tick,
      state: { tick: snapshot.tick, entities: [...snapshot.entities].sort((a, b) => a.id - b.id) },
    });
    while (this.entries.length > this.capacity) this.entries.shift();
  }

  clear(): void { this.entries.length = 0; }

  /** Bracketing pair for a render tick, with an integer alpha in `0..denominator`. */
  sample(renderTick: number, denominator = 30): SnapshotPair | null {
    if (this.entries.length === 0) return null;
    if (!Number.isInteger(renderTick) || !Number.isInteger(denominator) || denominator < 1) {
      throw new RangeError('renderTick and denominator must be integers, denominator >= 1');
    }
    const first = this.entries[0]!;
    const last = this.entries.at(-1)!;
    if (renderTick <= first.tick) return { from: first.state, to: first.state, numerator: 0, denominator };
    if (renderTick >= last.tick) return { from: last.state, to: last.state, numerator: denominator, denominator };

    for (let i = 0; i < this.entries.length - 1; i++) {
      const current = this.entries[i]!;
      const next = this.entries[i + 1]!;
      if (renderTick >= current.tick && renderTick <= next.tick) {
        const span = next.tick - current.tick;
        const numerator = Math.round(((renderTick - current.tick) * denominator) / span);
        return { from: current.state, to: next.state, numerator, denominator };
      }
    }
    return null;
  }
}
