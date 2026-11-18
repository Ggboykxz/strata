import { describe, expect, it } from 'vitest';
import {
  HashTimeline, WALK_MM_PER_TICK, createWorld, hashEntity, hashWorld, stepWorld,
  type WorldState,
} from '@strata/core';
import {
  Predictor, SnapshotBuffer, interpolateEntity, interpolateWorld, lerpMm,
  type SnapshotView,
} from '../src/net';

const world0 = (seed = 7) => createWorld(seed, 2);
const snapshotOf = (world: WorldState): SnapshotView => ({
  tick: world.tick,
  hash: hashWorld(world),
  viewHash: hashEntity(world.tick, world.entities.find((e) => e.id === 1)!),
  appliedSeq: world.entities.reduce((max, e) => Math.max(max, e.seq), 0),
  entities: world.entities,
});
const pos = (world: WorldState, id = 1) => world.entities.find((e) => e.id === id)!;

describe('client hash timeline', () => {
  it('compares at the named tick and refuses to equate an unrecorded tick with ok', () => {
    const timeline = new HashTimeline(4);
    timeline.put(3, 'aaaa0000');
    expect(timeline.verify(3, 'aaaa0000')).toBe('ok');
    expect(timeline.verify(3, 'bbbb1111')).toBe('desync');
    expect(timeline.verify(4, 'aaaa0000')).toBe('unknown');
  });

  it('prunes by tick and evicts by capacity', () => {
    const timeline = new HashTimeline(3);
    for (let tick = 0; tick < 5; tick++) timeline.put(tick, `a${tick}${tick}${tick}0000`.slice(0, 8).padEnd(8, '0'));
    expect(timeline.size).toBe(3);
    expect(timeline.get(0)).toBeUndefined();
    const second = new HashTimeline();
    second.put(1, 'aaaa0000');
    second.put(2, 'bbbb1111');
    second.forgetBefore(2);
    expect(second.get(1)).toBeUndefined();
    expect(second.get(2)).toBe('bbbb1111');
  });

  it('refuses a malformed hash instead of comparing garbage', () => {
    expect(() => new HashTimeline().put(0, 'DEADBEEF')).toThrow(RangeError);
  });
});

describe('prediction', () => {
  it('uses the same core step and clock as the server', () => {
    const p = new Predictor(world0(), 1);
    const before = pos(p.state).x;
    expect(p.input(1, 1, 0)).toBe(true);
    expect(p.state.tick).toBe(1);
    expect(pos(p.state).x).toBe(before + WALK_MM_PER_TICK);
    expect(p.input(1, 1, 0)).toBe(false); // stale seq refused
    expect(p.input(2, 2, 0)).toBe(false); // non-axis delta refused
  });

  it('is deterministic: the same seed and script give the same predicted hashes', () => {
    const run = () => {
      const p = new Predictor(world0(11), 1);
      const hashes: string[] = [];
      for (let seq = 1; seq <= 60; seq++) {
        p.input(seq, seq % 2 === 0 ? 0 : 1, seq % 3 === 0 ? -1 : 0);
        hashes.push(hashWorld(p.state));
      }
      return hashes;
    };
    expect(run()).toEqual(run());
  });

  it('schedules an intent and applies it exactly at its targetTick, never before', () => {
    const p = new Predictor(world0(), 1);
    expect(p.schedule(1, 1, 0, 3)).toBe(true);
    p.advanceTo(1);
    const x1 = pos(p.state).x;
    expect(p.state.tick).toBe(1);
    expect(pos(p.state).x).toBe(x1); // not due yet
    p.advanceTo(2);
    expect(p.state.tick).toBe(2);
    expect(pos(p.state).x).toBe(x1); // not due yet
    p.advanceTo(3);
    expect(p.state.tick).toBe(3);
    expect(pos(p.state).x).toBe(x1 + WALK_MM_PER_TICK); // applied exactly at T = 3
    expect(p.pendingIntents.map((i) => i.targetTick)).toEqual([3]);
  });

  it('matches a two-replica comparison when both replicas apply the intent at T', () => {
    // Replica A: the client predictor with a scheduled intent.
    const a = new Predictor(world0(5), 1);
    a.schedule(1, 1, 0, 4);
    a.advanceTo(4);
    // Replica B: raw core stepWorld calls, same seed, same schedule.
    let replica = world0(5);
    replica = stepWorld(replica, []);
    replica = stepWorld(replica, []);
    replica = stepWorld(replica, []);
    replica = stepWorld(replica, [{ entity: 1, seq: 1, dx: 1, dz: 0 }]);
    // Replica C: a second, independently constructed client predictor.
    const b = new Predictor(world0(5), 1);
    b.schedule(1, 1, 0, 4);
    b.advanceTo(4);
    expect(a.state).toEqual(replica);
    expect(a.state).toEqual(b.state);
    expect(hashEntity(a.state.tick, pos(a.state))).toBe(hashEntity(replica.tick, pos(replica)));
  });

  it('refuses a schedule whose targetTick is not an integer ahead of the world', () => {
    const p = new Predictor(world0(), 1);
    expect(p.schedule(1, 1, 0, 0)).toBe(false); // in the past
    expect(p.schedule(1, 1, 0, 1.5)).toBe(false); // not an integer
    expect(p.schedule(1, 2, 0, 2)).toBe(false); // non-axis delta
    expect(p.schedule(1, 1, 0, 2)).toBe(true);
    expect(p.state.tick).toBe(0); // scheduling alone never advances the world
  });

  it('is deterministic: the same seed, schedule and hashes replay identically', () => {
    const run = () => {
      const p = new Predictor(world0(11), 1);
      const hashes: string[] = [];
      p.schedule(1, 1, 0, 3);
      p.schedule(2, 0, -1, 5);
      for (let tick = 1; tick <= 6; tick++) {
        p.advanceTo(tick);
        hashes.push(hashEntity(tick, pos(p.state)));
      }
      return { hashes, state: p.state };
    };
    expect(run()).toEqual(run());
  });

  it('records the timeline hash at every tick, empty ones included', () => {
    const p = new Predictor(world0(), 1);
    p.schedule(1, 1, 0, 3);
    p.advanceTo(2); // two empty ticks stepped before the intent is due
    let server = world0();
    server = stepWorld(server, []);
    server = stepWorld(server, []);
    // An empty tick the snapshot names must verify — it was recorded like any other.
    expect(p.reconcile(snapshotOf(server))).toBe('ok');
  });

  it('replays scheduled intents at their original targetTick and never double-applies', () => {
    const p = new Predictor(world0(), 1);
    p.schedule(1, 1, 0, 2);
    p.schedule(2, 0, 1, 4);
    p.advanceTo(4); // client applied both locally, at ticks 2 and 4
    // The server applied seq 1 only (tick 2); seq 2 is still in flight.
    let server = world0();
    server = stepWorld(server, []);
    server = stepWorld(server, [{ entity: 1, seq: 1, dx: 1, dz: 0 }]);
    server = stepWorld(server, []);
    expect(p.reconcile(snapshotOf(server))).toBe('ok');
    // Reference replay from tick 0: same schedule, i1 at 2, i2 at 4, applied exactly once.
    let expected = world0();
    expected = stepWorld(expected, []);
    expected = stepWorld(expected, [{ entity: 1, seq: 1, dx: 1, dz: 0 }]);
    expected = stepWorld(expected, []);
    expected = stepWorld(expected, [{ entity: 1, seq: 2, dx: 0, dz: 1 }]);
    expect(p.state).toEqual(expected);
    expect(p.state.tick).toBe(4);
    expect(p.pendingIntents.map((i) => [i.seq, i.targetTick])).toEqual([[2, 4]]);
  });

  it('still replays an unacknowledged intent whose targetTick passed, at the earliest available tick', () => {
    const p = new Predictor(world0(), 1);
    p.schedule(1, 1, 0, 3);
    p.advanceTo(2); // client only reached tick 2; the target (3) has not arrived locally either
    // Server is ahead: snapshot at tick 4 names a tick the client never recorded -> 'unknown'.
    let server = world0();
    while (server.tick < 4) server = stepWorld(server, []);
    const snapshot: SnapshotView = {
      tick: server.tick,
      hash: hashWorld(server),
      viewHash: hashEntity(server.tick, server.entities.find((e) => e.id === 1)!),
      appliedSeq: 0,
      entities: server.entities,
    };
    expect(p.reconcile(snapshot)).toBe('unknown');
    // The unacked intent was still replayed (clamped to the earliest available tick), exactly once.
    expect(pos(p.state).x).toBe(world0().entities[0]!.x + WALK_MM_PER_TICK);
    expect(p.state.tick).toBe(5);
    expect(p.pendingIntents.map((i) => i.seq)).toEqual([1]);
  });

  it('uses input() as schedule-at-next-tick followed by the matching advance', () => {
    const p = new Predictor(world0(), 1);
    expect(p.input(1, 1, 0)).toBe(true);
    expect(p.state.tick).toBe(1);
    expect(p.pendingIntents.map((i) => [i.seq, i.targetTick])).toEqual([[1, 1]]);
  });


  it('accepts a matching snapshot and drops intents the server applied', () => {
    const p = new Predictor(world0(), 1);
    p.input(1, 1, 0);
    p.input(2, 1, 0);
    const server = stepWorld(world0(), [{ entity: 1, seq: 1, dx: 1, dz: 0 }]);
    expect(p.reconcile(snapshotOf(server))).toBe('ok');
    expect(p.lastAckedSeq).toBe(1);
    expect(p.pendingIntents.map((i) => i.seq)).toEqual([2]);
    expect(pos(p.state).x).toBe(pos(server).x + WALK_MM_PER_TICK);
    expect(p.state.tick).toBe(2);
  });

  it('replays every unacked intent when the snapshot predates them all', () => {
    const p = new Predictor(world0(), 1);
    p.input(1, 1, 0);
    p.input(2, 0, 1);
    expect(p.reconcile(snapshotOf(world0()))).toBe('ok');
    expect(p.state.tick).toBe(2);
    expect(p.pendingIntents.map((i) => i.seq)).toEqual([1, 2]);
    const expected = stepWorld(stepWorld(world0(), [{ entity: 1, seq: 1, dx: 1, dz: 0 }]),
      [{ entity: 1, seq: 2, dx: 0, dz: 1 }]);
    expect(p.state).toEqual(expected);
  });

  it('adopts the authoritative state and requests resync on a hash mismatch', () => {
    const p = new Predictor(world0(), 1);
    p.input(1, 1, 0);
    const server = stepWorld(world0(), [{ entity: 1, seq: 1, dx: 1, dz: 0 }]);
    const bad: SnapshotView = { ...snapshotOf(server), hash: 'deadbeef', viewHash: 'deadbeef' };
    expect(p.reconcile(bad)).toBe('desync');
    expect(p.desyncs).toBe(1);
    expect(p.needsResync).toBe(true);
    expect(p.pendingIntents).toHaveLength(0);
    expect(p.state).toEqual({ tick: server.tick, entities: server.entities });
    expect(p.lastAckedSeq).toBe(1);
    p.acknowledgeResync();
    expect(p.needsResync).toBe(false);
  });

  it('treats a missing own entity as a desync, not a silent correction', () => {
    const p = new Predictor(world0(), 1);
    p.input(1, 1, 0);
    const other = world0().entities.filter((e) => e.id !== 1);
    expect(p.reconcile({ tick: 1, hash: '00000000', appliedSeq: 0, entities: other })).toBe('desync');
    expect(p.desyncs).toBe(1);
    expect(p.state.entities.map((e) => e.id)).toEqual([2]);
  });

  it('verifies the client-scoped hash when another entity moved in the same tick', () => {
    const p = new Predictor(world0(7), 1);
    expect(p.input(1, 1, 0)).toBe(true);
    const server = stepWorld(world0(7), [
      { entity: 1, seq: 1, dx: 1, dz: 0 },
      { entity: 2, seq: 1, dx: -1, dz: 0 },
    ]);
    const snapshot = snapshotOf(server);
    const own = server.entities.find((e) => e.id === 1)!;
    expect(snapshot.hash).not.toBe(hashEntity(server.tick, own)); // the global hash cannot be reproduced
    expect(snapshot.viewHash).toBe(hashEntity(server.tick, own));
    expect(p.reconcile(snapshot)).toBe('ok');
    expect(p.desyncs).toBe(0);
  });

  it('does not flag the first snapshot as a desync when no prediction existed', () => {
    const p = new Predictor(world0(), 1);
    expect(p.reconcile(snapshotOf(world0()))).toBe('ok');
    expect(p.desyncs).toBe(0);
  });
});

describe('presentation interpolation', () => {
  it('interpolates integer millimetres and rejects an out-of-range alpha', () => {
    expect(lerpMm(0, 100, 0, 4)).toBe(0);
    expect(lerpMm(0, 100, 1, 4)).toBe(25);
    expect(lerpMm(0, 100, 4, 4)).toBe(100);
    expect(lerpMm(-10, 10, 1, 2)).toBe(0);
    expect(() => lerpMm(0, 100, 5, 4)).toThrow(RangeError);
    expect(() => lerpMm(0, 100, -1, 4)).toThrow(RangeError);
    expect(() => lerpMm(0.5, 1, 1, 2)).toThrow(RangeError);
  });

  it('interpolates entities by id and never mixes two different ones', () => {
    const a = pos(world0(), 1);
    const b = { ...a, x: a.x + 100, seq: 9 };
    expect(interpolateEntity(a, b, 1, 2).x).toBe(a.x + 50);
    expect(interpolateEntity(a, b, 1, 2).seq).toBe(9);
    expect(() => interpolateEntity(a, { ...b, id: 2 }, 1, 2)).toThrow(RangeError);
  });

  it('interpolates whole worlds without changing their hashes', () => {
    const a = world0();
    const b = stepWorld(a, [{ entity: 1, seq: 1, dx: 1, dz: 0 }]);
    const mixed = interpolateWorld(a, b, 1, 2);
    expect(mixed.tick).toBe(b.tick);
    expect(pos(mixed).x).toBe(pos(a).x + WALK_MM_PER_TICK / 2);
    expect(hashWorld(a)).toBe(hashWorld(world0())); // inputs untouched
  });
});

describe('snapshot buffer', () => {
  it('ignores duplicate or older snapshots and keeps only the newest', () => {
    const buffer = new SnapshotBuffer(2);
    buffer.push(snapshotOf(world0()));
    const next = stepWorld(world0(), [{ entity: 1, seq: 1, dx: 1, dz: 0 }]);
    buffer.push(snapshotOf(next));
    buffer.push(snapshotOf(world0())); // older: ignored
    expect(buffer.size).toBe(2);
    expect(buffer.latest?.tick).toBe(1);
    const third = stepWorld(next, []);
    buffer.push(snapshotOf(third));
    expect(buffer.size).toBe(2);
    expect(buffer.latest?.tick).toBe(2);
  });

  it('brackets a render tick with integer alpha, and clears on resync', () => {
    const buffer = new SnapshotBuffer();
    const a = world0();
    const b = stepWorld(a, [{ entity: 1, seq: 1, dx: 1, dz: 0 }]);
    buffer.push(snapshotOf(a));
    buffer.push(snapshotOf(b));
    expect(buffer.sample(0, 4)).toMatchObject({ numerator: 0, denominator: 4 });
    expect(buffer.sample(1, 4)).toMatchObject({ numerator: 4, denominator: 4 });
    const middle = buffer.sample(0, 2)!;
    expect(middle.numerator).toBe(0); // tick 0 is exactly the first snapshot
    buffer.clear();
    expect(buffer.sample(0)).toBeNull();
  });
});
