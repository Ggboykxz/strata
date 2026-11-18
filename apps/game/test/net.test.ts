import { describe, expect, it } from 'vitest';
import {
  HashTimeline, WALK_MM_PER_TICK, createWorld, hashWorld, stepWorld,
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
    const bad: SnapshotView = { ...snapshotOf(server), hash: 'deadbeef' };
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
