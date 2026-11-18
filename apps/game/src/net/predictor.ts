/**
 * Client prediction and reconciliation (NET-004, target-tick contract in v5).
 *
 * The client predicts locally with the **same** `stepWorld` as the server (D86), but the server snapshot is
 * always truth (I1). On a snapshot: compare at the acked tick, adopt the server state exactly, drop intents the
 * server has applied, replay the rest. A hash mismatch is a **desync**: rejected, never silently reconciled
 * (GDD-NETCODE §4.3), and a resync is requested on the next input.
 *
 * Target-tick contract: an intent names the tick at which it must be applied (`targetTick`). The predicted
 * world only applies it when `advanceTo()` reaches that tick. `input()` (immediate, single-player tests) is
 * `schedule(..., world.tick + 1)` followed by the matching `advanceTo`. `reconcile()` replays unacked intents
 * at their original `targetTick`; an intent whose `targetTick` already passed while unacknowledged is still
 * replayed, clamped to the earliest available tick.
 */
import {
  HashTimeline, hashEntity, hashWorld, stepWorld,
  type Axis, type EntityState, type MoveCommand, type WorldState,
} from '@strata/core';

/**
 * The shape of a snapshot the predictor needs. `SnapshotFrame` from NET-002 satisfies it.
 *
 * `viewHash` is the hash of this client's own entity — the only state a client can reproduce when
 * other players move. Older single-entity callers omit it and fall back to the global `hash` (A0010).
 */
export interface SnapshotView {
  readonly tick: number;
  readonly hash: string;
  readonly viewHash?: string;
  readonly appliedSeq: number;
  readonly entities: readonly EntityState[];
}

export type ReconcileVerdict = 'ok' | 'desync' | 'unknown';

interface PendingIntent extends MoveCommand {
  /** Tick at which this intent must be applied, chosen when it was scheduled. */
  readonly targetTick: number;
}

const isAxis = (v: number): v is Axis => v === -1 || v === 0 || v === 1;

const toCommand = ({ entity, seq, dx, dz }: PendingIntent): MoveCommand => ({ entity, seq, dx, dz });

export class Predictor {
  private world: WorldState;
  private readonly timeline: HashTimeline;
  private readonly pending: PendingIntent[] = [];
  private lastSubmittedSeq = 0;
  private lastAckedSeqValue = 0;
  private desyncCount = 0;
  private needsResyncValue = false;

  constructor(initial: WorldState, readonly entityId: number, capacity = 128) {
    this.world = { tick: initial.tick, entities: [...initial.entities] };
    this.timeline = new HashTimeline(capacity);
    this.recordTimeline();
  }

  get state(): WorldState { return this.world; }
  get pendingIntents(): readonly PendingIntent[] { return [...this.pending]; }
  get desyncs(): number { return this.desyncCount; }
  get needsResync(): boolean { return this.needsResyncValue; }
  get lastAckedSeq(): number { return this.lastAckedSeqValue; }

  /**
   * Schedule an intent for `targetTick`. It is applied when the predicted world advances to that tick;
   * until then it waits in the pending set. A stale seq, a non-axis delta or a target tick that is not an
   * integer ahead of the world is refused, never repaired.
   */
  schedule(seq: number, dx: Axis, dz: Axis, targetTick: number): boolean {
    if (!Number.isInteger(seq) || seq <= this.lastSubmittedSeq) return false;
    if (!isAxis(dx) || !isAxis(dz)) return false;
    if (!Number.isInteger(targetTick) || targetTick <= this.world.tick) return false;
    if (!this.world.entities.some((e) => e.id === this.entityId)) return false;
    this.pending.push({ entity: this.entityId, seq, dx, dz, targetTick });
    this.lastSubmittedSeq = seq;
    return true;
  }

  /**
   * Advance the predicted world to `tick`. Every tick is stepped, recording the hash timeline exactly as
   * the immediate path does; ticks whose scheduled intents name them apply exactly those intents, every
   * other tick advances with an empty `stepWorld`.
   */
  advanceTo(tick: number): void {
    if (!Number.isInteger(tick)) throw new RangeError('tick must be an integer');
    while (this.world.tick < tick) {
      const next = this.world.tick + 1;
      const due = this.pending
        .filter((intent) => intent.targetTick === next)
        .sort((a, b) => (a.entity - b.entity) || (a.seq - b.seq))
        .map(toCommand);
      this.world = stepWorld(this.world, due);
      this.recordTimeline();
    }
  }

  /** Predict one local intent. A stale seq or a non-axis delta is refused, never repaired. */
  input(seq: number, dx: Axis, dz: Axis): boolean {
    const targetTick = this.world.tick + 1;
    if (!this.schedule(seq, dx, dz, targetTick)) return false;
    this.advanceTo(targetTick);
    return true;
  }

  /** Reset to a server snapshot, then replay only intents it has not applied. */
  reconcile(snapshot: SnapshotView): ReconcileVerdict {
    const expected = snapshot.viewHash ?? snapshot.hash;
    let verdict: ReconcileVerdict = this.timeline.verify(snapshot.tick, expected);
    const own = snapshot.entities.find((e) => e.id === this.entityId);
    if (!own) verdict = 'desync'; // our entity vanished from the authoritative world

    if (verdict === 'desync') {
      this.desyncCount++;
      this.needsResyncValue = true;
      this.pending.length = 0;
      this.timeline.clear();
    } else {
      if (verdict === 'ok') this.needsResyncValue = false;
    }

    this.world = {
      tick: snapshot.tick,
      entities: [...snapshot.entities].sort((a, b) => a.id - b.id),
    };
    this.lastAckedSeqValue = own?.seq ?? snapshot.appliedSeq;
    this.timeline.put(snapshot.tick, own ? hashEntity(snapshot.tick, own) : hashWorld(this.world));
    this.timeline.forgetBefore(snapshot.tick);

    if (verdict === 'desync') return verdict;

    // Replay unacked intents at their original targetTick. An intent whose targetTick already passed
    // while unacknowledged is still replayed, clamped to the earliest tick available. Intents sharing a
    // targetTick are applied in one step, so replay matches how the world would have advanced live.
    const survivors = this.pending
      .filter((intent) => intent.seq > this.lastAckedSeqValue)
      .sort((a, b) => (a.targetTick - b.targetTick) || (a.seq - b.seq));
    this.pending.length = 0;

    const byTarget = new Map<number, PendingIntent[]>();
    for (const intent of survivors) {
      const group = byTarget.get(intent.targetTick);
      if (group) group.push(intent);
      else byTarget.set(intent.targetTick, [intent]);
    }
    for (const [targetTick, group] of [...byTarget.entries()].sort((a, b) => a[0] - b[0])) {
      const applyAt = Math.max(targetTick, this.world.tick + 1);
      while (this.world.tick < applyAt - 1) this.world = stepWorld(this.world, []);
      this.world = stepWorld(this.world, group.map(toCommand));
    }
    for (const intent of survivors) this.pending.push(intent);
    return verdict;
  }

  /** Clear the resync request after the caller has sent a fresh-session intent. */
  acknowledgeResync(): void { this.needsResyncValue = false; }

  private recordTimeline(): void {
    const own = this.world.entities.find((e) => e.id === this.entityId);
    this.timeline.put(this.world.tick, own ? hashEntity(this.world.tick, own) : hashWorld(this.world));
  }
}
