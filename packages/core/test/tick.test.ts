import { describe, expect, it } from 'vitest';
import {
  HashRing, QuantizationError, TICK_HZ, TICK_MS, WALK_MM_PER_TICK, WIRE_MAX_MM, WORLD_BOUND_MM,
  asMoveCommand, createWorld, hashWorld, metresToMm, stepWorld, toWireMm,
  type MoveCommand, type WorldState,
} from '../src/index';

/** A deterministic command script: entity 1 walks +x, entity 2 walks the diagonal, forever. */
function script(tick: number): MoveCommand[] {
  return [
    { entity: 1, seq: tick + 1, dx: 1, dz: 0 },
    { entity: 2, seq: tick + 1, dx: 1, dz: 1 },
  ];
}

function run(seed: number, ticks: number): { world: WorldState; hashes: string[] } {
  let world = createWorld(seed, 2);
  const hashes: string[] = [];
  for (let i = 0; i < ticks; i++) {
    world = stepWorld(world, script(i));
    hashes.push(hashWorld(world));
  }
  return { world, hashes };
}

describe('tick constants', () => {
  it('runs at a fixed 30 Hz with no clock in the core', () => {
    expect(TICK_HZ).toBe(30);
    expect(TICK_MS).toBeCloseTo(33.333, 2);
  });
});

describe('determinism', () => {
  it('produces the same hash sequence for the same seed and script over 300 ticks', () => {
    const a = run(7, 300);
    const b = run(7, 300);
    expect(a.hashes).toEqual(b.hashes);
    expect(a.world).toEqual(b.world);
  });

  it('produces a different world for a different seed', () => {
    expect(hashWorld(run(7, 10).world)).not.toBe(hashWorld(run(8, 10).world));
  });

  it('is independent of command arrival order', () => {
    const base = createWorld(11, 3);
    const forward = stepWorld(base, [
      { entity: 1, seq: 1, dx: 1, dz: 0 },
      { entity: 2, seq: 1, dx: 0, dz: 1 },
      { entity: 3, seq: 1, dx: -1, dz: 0 },
    ]);
    const shuffled = stepWorld(base, [
      { entity: 3, seq: 1, dx: -1, dz: 0 },
      { entity: 1, seq: 1, dx: 1, dz: 0 },
      { entity: 2, seq: 1, dx: 0, dz: 1 },
    ]);
    expect(hashWorld(shuffled)).toBe(hashWorld(forward));
  });

  it('does not mutate the input world', () => {
    const before = createWorld(3, 2);
    const snapshot = JSON.stringify(before);
    stepWorld(before, script(0));
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('intents', () => {
  it('drops a replayed seq, so a duplicate can never double-move an entity', () => {
    const w0 = createWorld(5, 1);
    const once = stepWorld(w0, [{ entity: 1, seq: 5, dx: 1, dz: 0 }]);
    const replay = stepWorld(once, [{ entity: 1, seq: 5, dx: 1, dz: 0 }]);
    const ignored = stepWorld(once, []);
    expect(hashWorld(replay)).toBe(hashWorld(ignored));
    expect(replay.entities[0]?.seq).toBe(5);
  });

  it('drops an unknown entity and a non-increasing seq', () => {
    const w0 = createWorld(5, 1);
    const next = stepWorld(w0, [
      { entity: 99, seq: 1, dx: 1, dz: 0 },
      { entity: 1, seq: 0, dx: 1, dz: 0 },
    ]);
    const untouched = stepWorld(w0, []);
    expect(hashWorld(next)).toBe(hashWorld(untouched));
  });

  it('validates untrusted input without throwing', () => {
    expect(asMoveCommand(null)).toBeNull();
    expect(asMoveCommand({ entity: 1, seq: 1, dx: 0, dz: 0 })).toEqual({ entity: 1, seq: 1, dx: 0, dz: 0 });
    expect(asMoveCommand({ entity: 1, seq: 1, dx: 0.5, dz: 0 })).toBeNull();
    expect(asMoveCommand({ entity: 1, seq: 1, dx: 2, dz: 0 })).toBeNull();
    expect(asMoveCommand({ entity: 0, seq: 1, dx: 0, dz: 0 })).toBeNull();
    expect(asMoveCommand({ entity: 1, seq: 1, dx: 0, dz: 0, dt: 16 })).toEqual({ entity: 1, seq: 1, dx: 0, dz: 0 });
  });

  it('advances exactly one tick per step and one walk step per applied intent', () => {
    let w = createWorld(1, 1);
    const start = w.entities[0]!;
    w = stepWorld(w, [{ entity: 1, seq: 1, dx: 1, dz: 0 }]);
    expect(w.tick).toBe(1);
    expect(w.entities[0]!.x).toBe(start.x + WALK_MM_PER_TICK);
    expect(w.entities[0]!.vx).toBe(WALK_MM_PER_TICK);
  });

  it('stops at the world bound and zeroes the velocity there', () => {
    let w = createWorld(1, 1);
    for (let seq = 1; seq <= 2_000 && w.entities[0]!.x < WORLD_BOUND_MM; seq++) {
      w = stepWorld(w, [{ entity: 1, seq, dx: 1, dz: 0 }]);
    }
    expect(w.entities[0]!.x).toBe(WORLD_BOUND_MM);
    expect(w.entities[0]!.vx).toBe(0);
  });
});

describe('quantization', () => {
  it('keeps millimetre precision across the wire range', () => {
    expect(toWireMm(0)).toBe(0);
    expect(toWireMm(-1)).toBe(-1);
    expect(toWireMm(WIRE_MAX_MM)).toBe(WIRE_MAX_MM);
    expect(toWireMm(-WIRE_MAX_MM)).toBe(-WIRE_MAX_MM);
  });

  it('refuses a silent truncation instead of rounding it away', () => {
    expect(() => toWireMm(WIRE_MAX_MM + 1)).toThrow(QuantizationError);
    expect(() => toWireMm(0.5)).toThrow(QuantizationError);
    expect(() => toWireMm(Number.NaN)).toThrow(QuantizationError);
  });

  it('converts presentation metres to millimetres, half away from zero', () => {
    expect(metresToMm(1.5)).toBe(1_500);
    expect(metresToMm(-1.5)).toBe(-1_500);
    expect(metresToMm(0.0005)).toBe(1);
    expect(metresToMm(0)).toBe(0);
  });
});

describe('state hash', () => {
  it('hashes the state at its own tick', () => {
    const w = createWorld(2, 2);
    const h0 = hashWorld(w);
    const h1 = hashWorld(stepWorld(w, []));
    expect(h0).toMatch(/^[0-9a-f]{8}$/);
    expect(h1).not.toBe(h0);
  });

  it('refuses a state that left the integer domain', () => {
    const w = createWorld(2, 1);
    const broken = { tick: 0, entities: [{ ...w.entities[0]!, x: 1.5 }] };
    expect(() => hashWorld(broken)).toThrow(QuantizationError);
  });
});

describe('hash ring', () => {
  it('compares an ack at the acked tick, not at now', () => {
    const ring = new HashRing(4);
    ring.put(10, 'aaaa0000');
    ring.put(11, 'bbbb1111');
    expect(ring.ack(10, 'aaaa0000')).toBe('ok');
    expect(ring.ack(10, 'bbbb1111')).toBe('desync');
    expect(ring.ack(12, 'cccc2222')).toBe('unknown');
  });

  it('evicts the oldest tick and never grows past its capacity', () => {
    const ring = new HashRing(3);
    for (let t = 0; t < 5; t++) ring.put(t, `h${t}`);
    expect(ring.size).toBe(3);
    expect(ring.ack(0, 'h0')).toBe('unknown');
    expect(ring.ack(4, 'h4')).toBe('ok');
  });
});
