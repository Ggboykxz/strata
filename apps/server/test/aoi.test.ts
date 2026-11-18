import { describe, expect, it } from 'vitest';
import { createWorld, type EntityState, type WorldState } from '@strata/core';
import { AOI_RADIUS_MM as WIRE_AOI_RADIUS_MM, MAX_ENTITIES, selectAoi } from '@strata/protocol';
import {
  AOI_GRID_CELL_MM,
  AOI_MAX_ENTITIES,
  AOI_RADIUS_MM,
  AoiQueryError,
  queryAoi,
} from '../src/aoi';

function entity(id: number, x = 0, z = 0): EntityState {
  return { id, x, z, vx: 0, vz: 0, seq: 0 };
}

function worldAt(tick: number, entities: readonly EntityState[]): WorldState {
  return { tick, entities };
}

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(AoiQueryError);
    return (error as AoiQueryError).code;
  }
  throw new Error('expected an AoiQueryError');
}

describe('uniform-grid AoI (NET-101 / A0011-i)', () => {
  const viewer = entity(1, 0, 0);

  it('shares the cell size, radius and cap with the wire prototype', () => {
    expect(AOI_GRID_CELL_MM).toBe(32_000);
    expect(AOI_RADIUS_MM).toBe(WIRE_AOI_RADIUS_MM);
    expect(AOI_RADIUS_MM).toBe(AOI_GRID_CELL_MM);
    expect(AOI_MAX_ENTITIES).toBe(MAX_ENTITIES);
  });

  it('includes the radius boundary and excludes one millimetre beyond it', () => {
    const state = worldAt(1, [
      viewer,
      entity(2, AOI_RADIUS_MM, 0),
      entity(3, 0, -AOI_RADIUS_MM),
      entity(4, AOI_RADIUS_MM + 1, 0),
      entity(5, -AOI_RADIUS_MM, 0),
      entity(6, 23_000, 23_000),
    ]);
    expect(queryAoi(state, 1).map((e) => e.id)).toEqual([1, 2, 3, 5]);
  });

  it('caps by bigint squared distance then id, and returns survivors sorted by id', () => {
    // Viewer at 0,0; candidates span two grid cells (x=10 and x=-10 are in the same cell,
    // x=20 crosses none, x=32_001 is in the next cell but still inside the radius).
    const state = worldAt(1, [
      viewer,
      entity(9, 0, 0),
      entity(7, 10, 0),
      entity(8, -10, 0),
      entity(6, 20, 0),
      entity(5, 32_001, 0),
    ]);
    // The viewer (id 1, distance 0) and id 9 (same position) win the cap before id 7.
    expect(queryAoi(state, 1, AOI_RADIUS_MM, 2).map((e) => e.id)).toEqual([1, 9]);
    expect(queryAoi(state, 1, AOI_RADIUS_MM, 4).map((e) => e.id)).toEqual([1, 7, 8, 9]);
  });

  it('uses integer cell coordinates for negative positions', () => {
    const state = worldAt(1, [
      entity(1, -1_000, -1_000),  // viewer in cell (-1,-1)
      entity(2, -10, -10),        // in cell (-1,-1), close
      entity(3, 31_000, 31_000),  // in cell (0,0), far away
      entity(4, -33_000, 0),      // cell (-2,0) is visited, but just outside the radius
    ]);
    expect(queryAoi(state, 1).map((e) => e.id)).toEqual([1, 2]);
  });

  it('matches the wire prototype exactly on seeded worlds, viewers and radii', () => {
    for (const seed of [1337, 20261118, 7]) {
      const state = createWorld(seed, 64);
      for (const viewerId of [1, 2, 17, 64]) {
        for (const radius of [1_000, 15_000, AOI_RADIUS_MM, 48_000]) {
          const own = state.entities.find((e) => e.id === viewerId)!;
          const expected = selectAoi(own, state.entities, radius, AOI_MAX_ENTITIES);
          expect(queryAoi(state, viewerId, radius)).toEqual(expected);
        }
      }
    }
  });

  it('is deterministic: repeated identical calls return identical arrays', () => {
    const state = createWorld(1337, 64);
    const first = queryAoi(state, 3);
    const second = queryAoi(state, 3);
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(first.length).toBeLessThanOrEqual(AOI_MAX_ENTITIES);
  });

  it('refuses a non-positive radius, an out-of-range cap and an absent viewer', () => {
    const state = worldAt(1, [viewer]);
    expect(codeOf(() => queryAoi(state, 1, 0))).toBe('bad-radius');
    expect(codeOf(() => queryAoi(state, 1, 1.5))).toBe('bad-radius');
    expect(codeOf(() => queryAoi(state, 1, AOI_RADIUS_MM, 65))).toBe('bad-cap');
    expect(codeOf(() => queryAoi(state, 99))).toBe('viewer-missing');
  });
});
