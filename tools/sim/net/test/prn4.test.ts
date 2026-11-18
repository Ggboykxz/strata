import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../../../../packages/core/src/index';
import {
  COOLDOWN_TICKS, MAX_RANGE_MM, REWIND_TICKS, WorldHistory, distanceSquaredMm, hasLineOfSight,
  runLagComp, validateShot, type Wall,
} from '../prn4_lagcomp';

const walls: readonly Wall[] = [{ x0: 5_000, x1: 6_000, z0: -2_000, z1: 2_000 }];

function historyWithWorld() {
  const history = new WorldHistory();
  let world = createWorld(1337, 4);
  history.record(world);
  for (let tick = 1; tick <= 60; tick++) {
    world = stepWorld(world, [{ entity: 1, seq: tick, dx: 1, dz: 0 }]);
    history.record(world);
  }
  return history;
}

describe('integer geometry', () => {
  it('uses squared bigint distance and never a square root', () => {
    expect(distanceSquaredMm({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(25n);
    expect(distanceSquaredMm({ x: -10, z: -10 }, { x: 10, z: 10 })).toBe(800n);
  });

  it('blocks LOS through a wall cell and allows a clear ray', () => {
    expect(hasLineOfSight({ x: 0, z: 0 }, { x: 9_000, z: 0 }, walls)).toBe(false);
    expect(hasLineOfSight({ x: 0, z: 5_000 }, { x: 9_000, z: 5_000 }, walls)).toBe(true);
  });
});

describe('rewind history', () => {
  it('records by tick and evicts outside the ring', () => {
    const history = historyWithWorld();
    expect(history.at(60)).not.toBeNull();
    expect(history.at(30)).not.toBeNull(); // capacity 31 keeps ticks 30..60
    expect(history.at(29)).toBeNull();
    history.record({ tick: 1000, entities: [] });
    expect(history.at(30)).toBeNull();
    expect(history.newestTick).toBe(1000);
  });
});

describe('shot validation', () => {
  it('refuses a tick outside the rewind window instead of approximating', () => {
    const history = historyWithWorld();
    expect(validateShot(history, { shooter: 1, target: 2, tick: 0, claimed: true }, new Map(), walls))
      .toBe('stale-shot');
    expect(validateShot(history, { shooter: 1, target: 2, tick: 999, claimed: true }, new Map(), walls))
      .toBe('stale-shot');
    expect(REWIND_TICKS).toBe(30);
  });

  it('refuses an unknown entity', () => {
    const history = historyWithWorld();
    expect(validateShot(history, { shooter: 99, target: 2, tick: 40, claimed: true }, new Map(), walls))
      .toBe('unknown-entity');
  });

  it('enforces cooldown from the server map', () => {
    const history = historyWithWorld();
    const cooldowns = new Map([[1, 40 - COOLDOWN_TICKS + 1]]);
    expect(validateShot(history, { shooter: 1, target: 2, tick: 40, claimed: true }, cooldowns, walls))
      .toBe('cooldown');
  });

  it('refuses a shot beyond the squared range ceiling', () => {
    expect(MAX_RANGE_MM).toBe(12_000);
    expect(distanceSquaredMm({ x: 0, z: 0 }, { x: 13_000, z: 0 }) > BigInt(MAX_RANGE_MM) ** 2n).toBe(true);
  });

  it('ignores the client claim entirely', () => {
    const history = historyWithWorld();
    const shot = { shooter: 1, target: 2, tick: 40 };
    expect(validateShot(history, { ...shot, claimed: false }, new Map(), walls))
      .toBe(validateShot(history, { ...shot, claimed: true }, new Map(), walls));
  });
});

describe('PR-N4 harness', () => {
  it('prints a deterministic labelled report', () => {
    const report = runLagComp();
    console.log(JSON.stringify(report, null, 2));
    expect(report.shots).toBeGreaterThan(4);
    expect(report.deterministic).toBe(true);
    expect(report.client_claims_ignored).toBe(true);
    expect(report.stale).toBeGreaterThan(0);
    expect(report.label).toContain('NOT network RTT');
  });

  it('refuses an invalid shot count', () => {
    expect(() => runLagComp(3)).toThrow(RangeError);
  });
});
