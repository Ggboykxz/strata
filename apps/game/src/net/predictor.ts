/**
 * Client prediction and reconciliation (NET-004).
 *
 * The client predicts locally with the **same** `stepWorld` as the server (D86), but the server snapshot is
 * always truth (I1). On a snapshot: verify the snapshot is internally consistent, compare the client's own
 * entity at the acked tick, adopt the server state exactly, drop intents the server has applied, replay the rest.
 *
 * Scope of prediction: a client can predict **its own** entity because it knows its own intents. It cannot
 * predict other clients' entities: their intents are never sent to it, and a snapshot only arrives after the
 * fact. Whole-world prediction would require an input broadcast, which this protocol does not have. Therefore
 * the client hash timeline is authoritative only for ticks it adopted from a snapshot; a predicted whole-world
 * hash is not compared against the server. A mismatch in the predictable scope — snapshot hash vs its entities,
 * or the own entity at a fully acked tick — is a desync: rejected, never silently reconciled (GDD-NETCODE §4.3).
 */
import {
  HashTimeline, hashWorld, stepWorld,
  type Axis, type EntityState, type MoveCommand, type WorldState,
} from '@strata/core';

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

const sameEntity = (a: EntityState, b: EntityState): boolean =>
  a.id === b.id && a.x === b.x && a.z === b.z && a.vx === b.vx && a.vz === b.vz && a.seq === b.seq;

export class Predictor {
  private world: WorldState;
  private readonly timeline: HashTimeline;
  /** What this client believed its own entity was at a tick, before the snapshot for that tick arrived. */
  private readonly ownHistory = new Map<number, EntityState>();
  private readonly pending: PendingIntent[] = [];
  private lastSubmittedSeq = 0;
  private lastAckedSeqValue = 0;
  private desyncCount = 0;
  private needsResyncValue = false;

  constructor(initial: WorldState, readonly entityId: number, private readonly capacity = 128) {
    this.world = { tick: initial.tick, entities: [...initial.entities] };
    this.timeline = new HashTimeline(capacity);
    this.timeline.put(initial.tick, hashWorld(this.world));
    this.recordOwn();
  }

  get state(): WorldState { return this.world; }
  get pendingIntents(): readonly PendingIntent[] { return [...this.pending]; }
  get desyncs(): number { return this.desyncCount; }
  get needsResync(): boolean { return this.needsResyncValue; }
  get lastAckedSeq(): number { return this.lastAckedSeqValue; }

  /**
   * Advance one empty local tick. A client that is idle still has a tick: without this, its hash timeline
   * skips ticks and every snapshot becomes `unknown`. The caller owns the pacing (I14: no clock here).
   */
  advance(): number {
    this.world = stepWorld(this.world, []);
    this.timeline.put(this.world.tick, hashWorld(this.world));
    this.recordOwn();
    return this.world.tick;
  }

  /** The hash this client predicted at `tick`, or undefined when it never simulated that tick. */
  hashAt(tick: number): string | undefined { return this.timeline.get(tick); }

  /** The client's own entity at `tick` as it believed it before the snapshot arrived. */
  predictionAt(tick: number): EntityState | undefined {
    const entity = this.ownHistory.get(tick);
    return entity ? { ...entity } : undefined;
  }

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
    this.recordOwn();
    return true;
  }

  /** Reset to a server snapshot, then replay only intents it has not applied. */
  reconcile(snapshot: SnapshotView): ReconcileVerdict {
    const own = snapshot.entities.find((e) => e.id === this.entityId);
    if (!own) {
      this.markDesync();
      this.adopt(snapshot, undefined);
      return 'desync'; // our entity vanished from the authoritative world
    }

    // A snapshot whose hash does not describe its own entity list is corrupt: nothing in it can be trusted.
    if (hashWorld({ tick: snapshot.tick, entities: snapshot.entities }) !== snapshot.hash) {
      this.markDesync();
      this.adopt(snapshot, own);
      return 'desync';
    }

    const predicted = this.ownHistory.get(snapshot.tick);
    let verdict: ReconcileVerdict = 'unknown';
    if (predicted) {
      if (predicted.seq === own.seq) {
        verdict = sameEntity(predicted, own) ? 'ok' : 'desync';
      } else if (predicted.seq < own.seq) {
        // The server applied input ahead of the client's timeline: adopt it, but the prediction was not verified.
        verdict = 'unknown';
      } else {
        // The client applied input the server has not. In-flight input is prediction, not divergence; only a
        // tick with no covering intent can prove the server lost an input this client believes was applied.
        const inFlight = this.pending.some((intent) => intent.seq > own.seq && intent.tick <= snapshot.tick);
        verdict = inFlight ? 'unknown' : 'desync';
      }
    }

    if (verdict === 'desync') this.markDesync();
    this.adopt(snapshot, own);
    if (verdict === 'desync') return verdict;

    this.lastAckedSeqValue = own.seq;
    const survivors = this.pending
      .filter((intent) => intent.seq > this.lastAckedSeqValue)
      .sort((a, b) => (a.tick - b.tick) || (a.seq - b.seq));
    this.pending.length = 0;

    // Replay from the snapshot forward. A surviving intent whose original tick is at or before the
    // snapshot cannot have been applied there: it is re-scheduled on the next local tick.
    let scheduled = snapshot.tick;
    for (const intent of survivors) {
      const at = intent.tick > scheduled ? intent.tick : scheduled + 1;
      while (this.world.tick < at - 1) {
        this.world = stepWorld(this.world, []);
        this.timeline.put(this.world.tick, hashWorld(this.world));
        this.recordOwn();
      }
      this.world = stepWorld(this.world, [{ entity: intent.entity, seq: intent.seq, dx: intent.dx, dz: intent.dz }]);
      this.timeline.put(this.world.tick, hashWorld(this.world));
      this.recordOwn();
      scheduled = at;
    }
    for (const intent of survivors) this.pending.push(intent);
    return verdict;
  }

  /** Clear the resync request after the caller has sent a fresh-session intent. */
  acknowledgeResync(): void { this.needsResyncValue = false; }

  private markDesync(): void {
    this.desyncCount++;
    this.needsResyncValue = true;
    this.pending.length = 0;
    this.timeline.clear();
    this.ownHistory.clear();
  }

  private adopt(snapshot: SnapshotView, own: EntityState | undefined): void {
    this.world = {
      tick: snapshot.tick,
      entities: [...snapshot.entities].sort((a, b) => a.id - b.id),
    };
    this.lastAckedSeqValue = own?.seq ?? snapshot.appliedSeq;
    // The snapshot hash was verified above, so this tick is authoritative, not predicted.
    this.timeline.put(snapshot.tick, snapshot.hash);
    this.timeline.forgetBefore(snapshot.tick);
    for (const tick of this.ownHistory.keys()) if (tick < snapshot.tick) this.ownHistory.delete(tick);
    if (own) this.ownHistory.set(snapshot.tick, { ...own });
    else this.ownHistory.delete(snapshot.tick);
    this.pruneOwn();
  }

  private recordOwn(): void {
    const own = this.world.entities.find((e) => e.id === this.entityId);
    if (!own) return;
    this.ownHistory.set(this.world.tick, { ...own });
    this.pruneOwn();
  }

  private pruneOwn(): void {
    while (this.ownHistory.size > this.capacity) {
      const oldest = this.ownHistory.keys().next();
      if (oldest.done) break;
      this.ownHistory.delete(oldest.value);
    }
  }
}
