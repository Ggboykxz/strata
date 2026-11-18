/**
 * Replicated client predictor for the NET-GATE matrix harness (harness-only, @strata/core only).
 *
 * The real client predictor lives in `apps/game/src/net/predictor.ts`; importing it from apps/server
 * would make the server package depend on the game package, so the reconciliation logic is replicated
 * here verbatim with @strata/core (`stepWorld`, `createWorld`, `hashEntity`, `HashTimeline`) and the
 * same semantics (NET-004):
 *
 *   - the client predicts ONLY its own entity's intents, applied immediately with `stepWorld`;
 *   - every snapshot triggers a reconcile at the snapshot's tick: compare `viewHash` (hash of the
 *     recipient's own entity) at that tick, adopt the server state exactly, replay only intents with
 *     `seq > appliedSeq` for the own entity;
 *   - a mismatch is a desync: rejected, never silently reconciled; pending intents are cleared and a
 *     resync is requested (`needsResync`) — this harness counts the request but does NOT send a resync
 *     frame (the wire protocol gives the client no way to address its own room client id);
 *   - `appliedSeq` is authoritative per entity (`EntityState.seq`), never the snapshot header.
 *
 * Per the matrix brief, the Predictor's known behaviour of predicting ahead of the server under latency
 * is NOT fixed here and this file is not the game predictor. Desync counts are recorded honestly.
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
  readonly tick: number;
}

const isAxis = (v: number): v is Axis => v === -1 || v === 0 || v === 1;

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
    const own = this.world.entities.find((e) => e.id === this.entityId);
    this.timeline.put(initial.tick, own ? hashEntity(initial.tick, own) : hashWorld(this.world));
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
    const own = this.world.entities.find((e) => e.id === this.entityId)!;
    this.timeline.put(this.world.tick, hashEntity(this.world.tick, own));
    return true;
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

    const survivors = this.pending
      .filter((intent) => intent.seq > this.lastAckedSeqValue && intent.tick > snapshot.tick)
      .sort((a, b) => (a.tick - b.tick) || (a.seq - b.seq));
    this.pending.length = 0;

    for (const intent of survivors) {
      while (this.world.tick < intent.tick - 1) this.world = stepWorld(this.world, []);
      if (this.world.tick === intent.tick - 1) {
        this.world = stepWorld(this.world, [
          { entity: intent.entity, seq: intent.seq, dx: intent.dx, dz: intent.dz },
        ]);
      }
    }
    for (const intent of survivors) this.pending.push(intent);
    return verdict;
  }
}
