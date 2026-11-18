/**
 * host.ts — headless authoritative host for the NET-001 tick.
 *
 * No socket, no clock, no Babylon: the caller decides when a tick happens. `apps/server/src/main.ts`
 * (NET-003) will put a wall clock and rooms around it. The host only applies validated intents, advances
 * the core tick, and keeps a bounded (tick → hash) history so a client ack is compared at the tick it
 * names (D147), never at "now".
 */
import {
  HashRing,
  asMoveCommand,
  createWorld,
  hashWorld,
  stepWorld,
  type EntityState,
  type MoveCommand,
  type WorldState,
} from '@strata/core';

export type AckVerdict = 'ok' | 'desync' | 'unknown';

export interface TickResult {
  readonly tick: number;
  readonly hash: string;
}

export interface Snapshot {
  readonly tick: number;
  readonly hash: string;
  readonly appliedSeq: number;
  readonly entity: EntityState;
}

export class SimHost {
  private world: WorldState;
  private lastHash: string;
  private readonly ring: HashRing;
  private readonly queue: MoveCommand[] = [];
  private rejectedIntents = 0;

  constructor(seed = 1, entityCount = 1, ringCapacity = 128) {
    this.world = createWorld(seed, entityCount);
    this.ring = new HashRing(ringCapacity);
    this.lastHash = hashWorld(this.world);
    this.ring.put(this.world.tick, this.lastHash);
  }

  get tick(): number { return this.world.tick; }
  get state(): WorldState { return this.world; }
  get hash(): string { return this.lastHash; }
  get rejected(): number { return this.rejectedIntents; }

  /** Validate an intent at the ingress. Malformed input is counted and dropped, never repaired (I1). */
  submit(raw: unknown): boolean {
    const cmd = asMoveCommand(raw);
    if (!cmd) { this.rejectedIntents++; return false; }
    this.queue.push(cmd);
    return true;
  }

  /** Advance exactly one tick with the intents received since the last one. */
  step(): TickResult {
    const batch = this.queue.splice(0, this.queue.length);
    this.world = stepWorld(this.world, batch);
    this.lastHash = hashWorld(this.world);
    this.ring.put(this.world.tick, this.lastHash);
    return { tick: this.world.tick, hash: this.lastHash };
  }

  /** Advance `ticks` ticks back to back. The caller owns the pacing, not the host. */
  run(ticks: number): TickResult {
    if (!Number.isInteger(ticks) || ticks < 0) throw new RangeError('ticks must be a non-negative integer');
    let result: TickResult = { tick: this.world.tick, hash: this.lastHash };
    for (let i = 0; i < ticks; i++) result = this.step();
    return result;
  }

  hashAt(tick: number): string | undefined { return this.ring.get(tick); }

  /** Verdict for a client hash ack, resolved at the tick the client names. */
  ack(tick: number, hash: string): AckVerdict { return this.ring.ack(tick, hash); }

  snapshot(entityId: number): Snapshot | undefined {
    const entity = this.world.entities.find((e) => e.id === entityId);
    if (!entity) return undefined;
    return { tick: this.world.tick, hash: this.lastHash, appliedSeq: entity.seq, entity };
  }
}
