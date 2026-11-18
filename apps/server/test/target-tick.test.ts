/**
 * Target-tick contract (protocol v5): server-side buffering, late-intent drop and ingress refusal.
 *
 * An intent names the tick at which the client wants it applied. The room drops a command whose
 * targetTick is already in the past at the moment it arrives (counted as `late_intents`), refuses a
 * target scheduled more than 64 ticks ahead, and buffers the rest; buffered intents are submitted
 * before the world advances to their targetTick, in (targetTick, entity, seq) order.
 */
import { describe, expect, it } from 'vitest';
import { WALK_MM_PER_TICK, stepWorld, createWorld } from '@strata/core';
import { decodeFrame, encodeFrame } from '@strata/protocol';
import { Room, type RoomSocket } from '../src/rooms';

class FakeSocket implements RoomSocket {
  readonly sent: Uint8Array[] = [];
  send(data: Uint8Array): void { this.sent.push(data); }
  close(): void { /* noop */ }
}

const intent = (seq: number, targetTick: number, dx = 1, dz = 0) =>
  encodeFrame({ kind: 'intent', entity: 1, seq, targetTick, dx, dz });

const entity = (room: Room, id = 1) => room.sim.state.entities.find((e) => e.id === id)!;

describe('target-tick buffer', () => {
  it('applies a buffered intent exactly at its targetTick and not before', () => {
    const room = new Room('sched', { seed: 5 });
    const client = room.join(new FakeSocket())!;
    expect(room.handleBytes(client.clientId, intent(1, 3))).toBe(true);
    expect(room.sim.buffered).toBe(1);
    room.tick(); // -> 1
    expect(entity(room).vx).toBe(0);
    expect(entity(room).seq).toBe(0);
    room.tick(); // -> 2
    expect(entity(room).vx).toBe(0);
    expect(entity(room).seq).toBe(0);
    room.tick(); // -> 3: the intent is due and applied exactly now
    expect(entity(room).vx).toBe(WALK_MM_PER_TICK);
    expect(entity(room).seq).toBe(1);
    expect(room.sim.buffered).toBe(0);
  });

  it('two rooms with the same seed and schedule hash identically at every tick', () => {
    const run = () => {
      const room = new Room('sched', { seed: 5 });
      const client = room.join(new FakeSocket())!;
      const hashes: string[] = [];
      room.handleBytes(client.clientId, intent(1, 2));
      room.handleBytes(client.clientId, intent(2, 4, 0, 1));
      for (let i = 0; i < 6; i++) hashes.push(room.tick().hash);
      return hashes;
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
  });

  it('applies a buffered intent exactly once at T, then never again', () => {
    const room = new Room('once', { seed: 9 });
    const client = room.join(new FakeSocket())!;
    room.handleBytes(client.clientId, intent(1, 2));
    room.tick(); // -> 1
    room.tick(); // -> 2 (applied)
    const seqAfterApply = entity(room).seq;
    const xAfterApply = entity(room).x;
    room.tick(); // -> 3 (must not re-apply)
    expect(entity(room).seq).toBe(seqAfterApply);
    expect(entity(room).x).toBe(xAfterApply); // no command at tick 3: no movement either
  });

  it('submits due intents before the world advances, in canonical order', () => {
    const room = new Room('order', { seed: 13 });
    const client = room.join(new FakeSocket())!;
    // Both buffered: arrival tick is 0, so targets 2 and 3 are both safely ahead.
    room.handleBytes(client.clientId, intent(1, 3)); // arrives first, applies later
    room.handleBytes(client.clientId, intent(2, 2, 0, 1)); // arrives second, applies earlier
    const first = room.tick(); // -> 1
    expect(entity(room).seq).toBe(0);
    const second = room.tick(); // -> 2: seq 2 applies (target 2), seq 1 still buffered
    expect(entity(room).seq).toBe(2);
    expect(entity(room).vz).toBe(WALK_MM_PER_TICK);
    expect(second.hash).not.toBe(first.hash);
    const third = room.tick(); // -> 3: seq 1 applies
    expect(entity(room).seq).toBe(2); // seq 1 < applied seq 2: dropped by the world, not re-applied
    expect(third.hash).toBeDefined();
  });

  it('keeps intents for exactly the next tick on today\'s behaviour', () => {
    const room = new Room('next', { seed: 5 });
    const client = room.join(new FakeSocket())!;
    expect(room.handleBytes(client.clientId, intent(1, 1))).toBe(true); // target == tick + 1
    expect(room.sim.buffered).toBe(0); // not buffered
    room.tick(); // -> 1
    expect(entity(room).seq).toBe(1);
  });
});

describe('late-intent drop', () => {
  it('drops a command whose targetTick is in the past at arrival and counts it', () => {
    const room = new Room('late', { seed: 5 });
    const client = room.join(new FakeSocket())!;
    room.tick(); // -> 1
    expect(room.handleBytes(client.clientId, intent(1, 1))).toBe(false); // target == current tick: in the past
    expect(room.handleBytes(client.clientId, intent(2, 0))).toBe(false); // target behind
    expect(room.lateIntents).toBe(2);
    expect(entity(room).seq).toBe(0); // nothing applied
    expect(room.sim.buffered).toBe(0);
  });

  it('a dropped late intent does not block a later valid intent with a higher seq', () => {
    const room = new Room('late2', { seed: 5 });
    const client = room.join(new FakeSocket())!;
    room.tick(); // -> 1
    room.handleBytes(client.clientId, intent(1, 1)); // dropped as late
    expect(room.handleBytes(client.clientId, intent(2, 2))).toBe(true);
    room.tick(); // -> 2
    expect(entity(room).seq).toBe(2);
    expect(room.lateIntents).toBe(1);
  });

  it('two-replica hash equality with a scheduled intent applied at T', () => {
    const run = () => {
      const room = new Room('replica', { seed: 21 });
      const client = room.join(new FakeSocket())!;
      room.handleBytes(client.clientId, intent(1, 2));
      room.tick();
      room.tick();
      room.tick();
      return room.hash;
    };
    expect(run()).toBe(run());
    // And the room agrees with a raw stepWorld replica from the same seed.
    let replica = createWorld(21, 2);
    replica = stepWorld(replica, []);
    replica = stepWorld(replica, [{ entity: 1, seq: 1, dx: 1, dz: 0 }]);
    replica = stepWorld(replica, []);
    const room = new Room('replica', { seed: 21 });
    const client = room.join(new FakeSocket())!;
    room.handleBytes(client.clientId, intent(1, 2));
    room.tick();
    room.tick();
    room.tick();
    expect(room.sim.state).toEqual(replica);
  });
});

describe('ingress refusal, more than 64 ticks ahead', () => {
  it('refuses a target beyond 64 ticks of lead and accepts exactly 64', () => {
    const room = new Room('lead', { seed: 5 });
    const client = room.join(new FakeSocket())!;
    room.tick(); // -> 1
    expect(room.handleBytes(client.clientId, intent(1, 1 + 65))).toBe(false); // 65 ticks ahead: refused
    expect(room.handleBytes(client.clientId, intent(2, 1 + 64, 0, 1))).toBe(true); // exactly 64: admitted
    expect(room.sim.buffered).toBe(1);
    expect(room.lateIntents).toBe(0); // a far-future refusal is not a late intent
  });

  it('keeps the buffer intact when a malformed frame arrives', () => {
    const room = new Room('lead2', { seed: 5 });
    const client = room.join(new FakeSocket())!;
    const frame = encodeFrame({ kind: 'intent', entity: 1, seq: 1, targetTick: 3, dx: 1, dz: 0 });
    expect(room.handleBytes(client.clientId, frame)).toBe(true);
    expect(room.sim.buffered).toBe(1);
    expect(room.handleBytes(client.clientId, new Uint8Array([0xff]))).toBe(false);
    expect(room.sim.buffered).toBe(1);
  });
});
