/**
 * Server-owned hit frames (NET-006 / GDD-ANIM-ARCHITECTURE §4.3). The clip manifest names the tick offsets;
 * only the server turns them into hits. A client claiming a hit is ignored, not reconciled (I1 / I3).
 */
import { eventsAt, type ClipManifest, type ClipEventKind } from '@strata/core';

export interface HitEvent {
  readonly tick: number;
  readonly entity: number;
  readonly clipId: number;
  readonly kind: ClipEventKind;
}

/** Deduplicating ledger keyed by (absolute tick, entity, kind). Bounded by the caller's tick advance. */
export class HitLedger {
  private readonly fired = new Set<string>();

  get count(): number { return this.fired.size; }

  /** Fire the events of one clip at one absolute tick. Repeated calls never fire the same hit twice. */
  process(manifest: ClipManifest, clipId: number, startTick: number, entity: number, tick: number): readonly HitEvent[] {
    const out: HitEvent[] = [];
    for (const event of eventsAt(manifest, clipId, startTick, tick)) {
      const key = `${tick}:${entity}:${event.kind}`;
      if (this.fired.has(key)) continue;
      this.fired.add(key);
      out.push({ tick, entity, clipId, kind: event.kind });
    }
    return out;
  }

  /** Client claims carry no authority. Kept as an explicit method so the rule is testable. */
  clientClaim(_entity: number, _tick: number): readonly HitEvent[] {
    return [];
  }

  clear(): void { this.fired.clear(); }
}
