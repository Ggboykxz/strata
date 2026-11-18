/**
 * Client prediction and reconciliation (NET-004).
 *
 * The client predicts locally with the **same** `stepWorld` as the server (D86), but the server snapshot is
 * always truth (I1). On a snapshot: compare at the acked tick, adopt the server state exactly, drop intents the
 * server has applied, replay the rest. A hash mismatch is a **desync**: rejected, never silently reconciled
 * (GDD-NETCODE §4.3), and a resync is requested on the next input.
 */
import { HashTimeline, hashWorld, stepWorld, type Axis, type EntityState, type MoveCommand, type WorldState } from '@strata/core';

/** The shape of a snapshot the predictor needs. `SnapshotFrame` from NET-002 satisfies it. */
export interface SnapshotView {
  readonly tick: number;
  readonly hash: string;
  readonly appliedSeq: number;
  readonly entities: readonly EntityState[];
}

export type ReconcileVerdict = 'ok' | 'desync' | 'unknown';

interface PendingIntent extends MoveCommand {
  /** Tick at which the client applied this intent locally. */
  readonly tick: number;
}

const isAxis = (v: number): v is Axis => v === -1 || v === 0 || v === 1;

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
    this.timeline.put(initial.tick, hashWorld(this.world));
  }

  get state(): WorldState { return this.world; }
  get pendingIntents(): readonly PendingIntent[] { return [...this.pending]; }
  get desyncs(): number { return this.desyncCount; }
  get needsResync(): boolean { return this.needsResyncValue; }
  get lastAckedSeq(): number { return this.lastAckedSeqValue; }

  /** Predict one local intent. A stale seq or a non-axis delta is refused, never repaired. */
  input(seq: number, dx: Axis, dz: Axis): boolean {
    if (!Number.isInteger(seq) || seq <= this.lastSubmittedSeq) return false;
    if (!isAxis(dx) || !isAxis(dz)) return false;
    if (!this.world.entities.some((e) => e.id === this.entityId)) return false;
    const command: MoveCommand = { entity: this.entityId, seq, dx, dz };
    this.world = stepWorld(this.world, [command]);
    this.lastSubmittedSeq = seq;
    this.pending.push({ ...command, tick: this.world.tick });
    this.timeline.put(this.world.tick, hashWorld(this.world));
    return true;
  }

  /** Reset to a server snapshot, then replay only intents it has not applied. */
  reconcile(snapshot: SnapshotView): ReconcileVerdict {
    let verdict: ReconcileVerdict = this.timeline.verify(snapshot.tick, snapshot.hash);
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
    this.timeline.put(snapshot.tick, hashWorld(this.world));
    this.timeline.forgetBefore(snapshot.tick);

    if (verdict === 'desync') return verdict;

    const survivors = this.pending
      .filter((intent) => intent.seq > this.lastAckedSeqValue && intent.tick > snapshot.tick)
      .sort((a, b) => (a.tick - b.tick) || (a.seq - b.seq));
    this.pending.length = 0;

    for (const intent of survivors) {
      while (this.world.tick < intent.tick - 1) this.world = stepWorld(this.world, []);
      if (this.world.tick === intent.tick - 1) {
        this.world = stepWorld(this.world, [{ entity: intent.entity, seq: intent.seq, dx: intent.dx, dz: intent.dz }]);
      }
    }
    for (const intent of survivors) this.pending.push(intent);
    return verdict;
  }

  /** Clear the resync request after the caller has sent a fresh-session intent. */
  acknowledgeResync(): void { this.needsResyncValue = false; }
}
