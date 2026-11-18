import { describe, expect, it } from 'vitest';
import { CASCADE_BOUND_TICKS, WorldTick, runWorldPrototype } from '../prs7_worldtick';

describe('bounded Rouille cascade', () => {
  it('terminates at the bound and never erases a node twice', () => {
    const world = new WorldTick(12);
    world.overHarvest(1, 95);
    for (let tick = 0; tick < CASCADE_BOUND_TICKS + 4; tick++) world.step();
    expect(world.lastActive).toBeLessThanOrEqual(CASCADE_BOUND_TICKS);
    expect(world.erases).toBe(world.state.filter((node) => node.erased).length);
    expect(world.factsWritten.length).toBe(world.erases);
  });

  it('records facts after the bound without erasing', () => {
    const world = new WorldTick(12);
    world.overHarvest(1, 95);
    const before = world.erases;
    for (let tick = 0; tick < CASCADE_BOUND_TICKS + 8; tick++) world.step();
    expect(world.erases).toBeGreaterThanOrEqual(before);
    expect(world.lastActive).toBeLessThanOrEqual(CASCADE_BOUND_TICKS);
  });

  it('refuses an over-harvest on an erased or unknown node', () => {
    const world = new WorldTick(6);
    expect(world.overHarvest(99, 5)).toBe(false);
    expect(world.overHarvest(1, 200)).toBe(false);
    expect(world.overHarvest(1, 95)).toBe(true);
    expect(world.overHarvest(1, 10)).toBe(false); // only 5 units remain, below the request
  });
});

describe('PR-S7 harness', () => {
  it('prints a deterministic labelled local report', () => {
    const report = runWorldPrototype();
    console.log(JSON.stringify(report, null, 2));
    expect(report.bound_ticks).toBe(CASCADE_BOUND_TICKS);
    expect(report.last_active_tick).toBeLessThanOrEqual(CASCADE_BOUND_TICKS);
    expect(report.facts).toBe(report.erases);
    expect(report.deterministic).toBe(true);
    expect(report.label).toContain('not a world demo');
  });
});
