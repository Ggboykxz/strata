/**
 * Replicated client predictor for the NET-GATE matrix harness (harness-only, @strata/core only).
 *
 * The real client predictor lives in `apps/game/src/net/predictor.ts`; importing it from apps/server
 * would make the server package depend on the game package, so the reconciliation logic is replicated
 * here **verbatim in semantics** with @strata/core (v5, target-tick contract, commit a1e5961 / b8d13c7):
 *
 *   - an intent names the tick at which it must be applied (`targetTick`); it waits in the pending set
 *     and is applied only when the predicted world's own tick reaches `targetTick` (`advanceTo`);
 *   - every tick is stepped, recording the hash timeline exactly as the immediate path does; ticks
 *     whose scheduled intents name them apply exactly those intents, every other tick advances with an
 *     empty `stepWorld`;
 *   - every snapshot triggers a reconcile at the snapshot's tick: compare `viewHash` (hash of the
 *     recipient's own entity), adopt the server state exactly, replay unacked intents at their original
 *     `targetTick` (an intent whose targetTick passed while unacknowledged is still replayed, clamped
 *     to the earliest available tick);
 *   - a mismatch is a desync: rejected, never silently reconciled; pending intents are cleared and a
 *     resync is requested (`needsResync`) — this harness counts the request but does NOT send a resync
 *     frame (the wire protocol gives the client no way to address its own room client id);
 *   - `appliedSeq` is authoritative per entity (`EntityState.seq`), never the snapshot header.
 */
import {
  HashTimeline, hashEntity, hashWorld, stepWorld,
  type Axis, type EntityState, type MoveCommand, type WorldState,
} from '@strata/core';

export interface MatrixSnapshotView {
  readonly tick: number;
  readonly hash: string;
  readonly viewHash?: string;
  readonly appliedSeq: number;
  readonly entities: readonly EntityState[];
}

export type MatrixReconcileVerdict = 'ok' | 'desync' | 'unknown';

interface PendingIntent extends MoveCommand {
  /** Tick at which this intent must be applied, chosen when it was scheduled. */
  readonly targetTick: number;
}

const isAxis = (v: number): v is Axis => v === -1 || v === 0 || v === 1;

const toCommand = ({ entity, seq, dx, dz }: PendingIntent): MoveCommand => ({ entity, seq, dx, dz });

export class MatrixPredictor {
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

  /** Schedule an intent for `targetTick`. Applied when the predicted world advances to that tick. */
  schedule(seq: number, dx: Axis, dz: Axis, targetTick: number): boolean {
    if (!Number.isInteger(seq) || seq <= this.lastSubmittedSeq) return false;
    if (!isAxis(dx) || !isAxis(dz)) return false;
    if (!Number.isInteger(targetTick) || targetTick <= this.world.tick) return false;
    if (!this.world.entities.some((e) => e.id === this.entityId)) return false;
    this.pending.push({ entity: this.entityId, seq, dx, dz, targetTick });
    this.lastSubmittedSeq = seq;
    return true;
  }

  /** Advance the predicted world to `tick`, stepping every tick, applying due intents. */
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

  /** Schedule one intent for `targetTick`. Scheduling only — the world advances via `advanceTo`. */
  input(seq: number, dx: Axis, dz: Axis, targetTick: number): boolean {
    return this.schedule(seq, dx, dz, targetTick);
  }

  /** Reset to a server snapshot, then replay only intents it has not applied. */
  reconcile(snapshot: MatrixSnapshotView): MatrixReconcileVerdict {
    const expected = snapshot.viewHash ?? snapshot.hash;
    let verdict: MatrixReconcileVerdict = this.timeline.verify(snapshot.tick, expected);
    const own = snapshot.entities.find((e) => e.id === this.entityId);
    if (!own) verdict = 'desync'; // own entity vanished from the authoritative world

    if (verdict === 'desync') {
      this.desyncCount++;
      this.needsResyncValue = true;
      this.pending.length = 0;
      this.timeline.clear();
    } else if (verdict === 'ok') {
      this.needsResyncValue = false;
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
    // while unacknowledged is still replayed, clamped to the earliest tick available.
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

  private recordTimeline(): void {
    const own = this.world.entities.find((e) => e.id === this.entityId);
    this.timeline.put(this.world.tick, own ? hashEntity(this.world.tick, own) : hashWorld(this.world));
  }
}
