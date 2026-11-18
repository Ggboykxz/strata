import { describe, expect, it } from 'vitest';
import { hashWorld } from '@strata/core';
import { SimHost } from '../src/sim/host';

describe('SimHost', () => {
  it('starts at tick 0 with a recorded hash', () => {
    const host = new SimHost(7, 2);
    expect(host.tick).toBe(0);
    expect(host.hash).toBe(hashWorld(host.state));
    expect(host.hashAt(0)).toBe(host.hash);
  });

  it('advances one tick per step and records every hash', () => {
    const host = new SimHost(7, 2);
    const a = host.step();
    const b = host.step();
    expect(a.tick).toBe(1);
    expect(b.tick).toBe(2);
    expect(host.hashAt(1)).toBe(a.hash);
    expect(host.hashAt(2)).toBe(b.hash);
  });

  it('is isomorphic: two hosts with the same seed and intents agree tick by tick', () => {
    const a = new SimHost(42, 3);
    const b = new SimHost(42, 3);
    for (let i = 1; i <= 120; i++) {
      for (const entity of [1, 2, 3]) {
        const cmd = { entity, seq: i, dx: entity === 2 ? 0 : 1, dz: entity === 3 ? -1 : 0 };
        expect(a.submit(cmd)).toBe(true);
        expect(b.submit(cmd)).toBe(true);
      }
      expect(a.step()).toEqual(b.step());
    }
    expect(a.state).toEqual(b.state);
  });

  it('rejects malformed intents at the ingress and counts them', () => {
    const host = new SimHost(1, 1);
    expect(host.submit({ entity: 1, seq: 1, dx: 1, dz: 0 })).toBe(true);
    expect(host.submit({ entity: 1, seq: 2, dx: 1 })).toBe(false);
    expect(host.submit('move')).toBe(false);
    expect(host.rejected).toBe(2);
  });

  it('answers an ack at the acked tick: ok, desync, unknown', () => {
    const host = new SimHost(3, 1);
    host.run(5);
    const hash5 = host.hashAt(5)!;
    expect(host.ack(5, hash5)).toBe('ok');
    expect(host.ack(5, 'deadbeef')).toBe('desync');
    expect(host.ack(999, hash5)).toBe('unknown');
  });

  it('ignores a replayed intent instead of moving twice', () => {
    const host = new SimHost(3, 1);
    const before = host.state.entities[0]!;
    host.submit({ entity: 1, seq: 1, dx: 1, dz: 0 });
    host.step();
    const after = host.state.entities[0]!;
    host.submit({ entity: 1, seq: 1, dx: 1, dz: 0 });
    host.step();
    expect(host.state.entities[0]).toEqual(after);
    expect(after.x).toBeGreaterThan(before.x);
  });

  it('exposes a snapshot per entity with its applied seq', () => {
    const host = new SimHost(9, 2);
    host.submit({ entity: 2, seq: 4, dx: -1, dz: 0 });
    host.step();
    const snap = host.snapshot(2)!;
    expect(snap.tick).toBe(1);
    expect(snap.appliedSeq).toBe(4);
    expect(snap.hash).toBe(host.hash);
    expect(snap.entity.vx).toBeLessThan(0);
    expect(host.snapshot(99)).toBeUndefined();
  });

  it('runs N ticks without a clock', () => {
    const host = new SimHost(1, 1);
    const out = host.run(30);
    expect(out.tick).toBe(30);
    expect(host.ack(30, out.hash)).toBe('ok');
  });
});
