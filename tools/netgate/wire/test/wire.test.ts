import { describe, expect, it } from 'vitest';
import type { WorldState } from '../../../../packages/core/src/index';
import {
  AOI_RADIUS_MM,
  aoiSnapshotFor,
  selectAoi,
} from '../../../../packages/protocol/src/index';
import {
  DOWN_BUDGET_BYTES_PER_SECOND,
  KEYFRAME_INTERVAL_TICKS,
  MEASURE_TICKS,
  UP_BUDGET_BYTES_PER_SECOND,
  buildWorlds,
  measureControl,
  runClientStream,
  runWireMeasurement,
} from '../netgate_wire';

describe('wire budget arithmetic', () => {
  it('reproduces the v5 integration control exactly: 1 555 B x 30 Hz = 46 650 B/s down', () => {
    const control = measureControl(buildWorlds('dense', 600));
    expect(control.fullSnapshotBytes).toBe(1_555);
    expect(control.maxFrameBytes).toBe(1_555);
    expect(control.down.bestBytesPerSecond).toBe(46_650);
    expect(control.down.averageBytesPerSecond).toBe(46_650);
    expect(control.down.worstBytesPerSecond).toBe(46_650);
    expect(control.up.averageBytesPerSecond).toBe((15 + 13) * 30);
  });

  it('keeps the master §6 budgets at 12 288 B/s down and 3 072 B/s up', () => {
    expect(DOWN_BUDGET_BYTES_PER_SECOND).toBe(12 * 1024);
    expect(UP_BUDGET_BYTES_PER_SECOND).toBe(3 * 1024);
    expect(MEASURE_TICKS).toBe(600);
    expect(KEYFRAME_INTERVAL_TICKS).toBe(60);
  });
});

describe('AoI inclusion and exclusion', () => {
  it('uses the 32 m radius in millimetres on a real world tick', () => {
    const world: WorldState = {
      tick: 1,
      entities: [
        { id: 1, x: 0, z: 0, vx: 0, vz: 0, seq: 0 },
        { id: 2, x: 32_000, z: 0, vx: 0, vz: 0, seq: 0 },
        { id: 3, x: 32_001, z: 0, vx: 0, vz: 0, seq: 0 },
        { id: 4, x: 0, z: -32_000, vx: 0, vz: 0, seq: 0 },
      ],
    };
    const view = aoiSnapshotFor(world, 1);
    expect(AOI_RADIUS_MM).toBe(32_000);
    expect(view.entities.map((entity) => entity.id)).toEqual([1, 2, 4]);
    expect(view.hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('selects the nearby entity and excludes the far one for a moving viewer', () => {
    const world = buildWorlds('dense', 1)[0]!;
    const view = aoiSnapshotFor(world, 3);
    const viewer = world.entities.find((entity) => entity.id === 3)!;
    expect(view.entities).toEqual(selectAoi(viewer, world.entities));
    for (const entity of view.entities) {
      const dx = BigInt(entity.x - viewer.x);
      const dz = BigInt(entity.z - viewer.z);
      expect(dx * dx + dz * dz <= BigInt(AOI_RADIUS_MM) * BigInt(AOI_RADIUS_MM)).toBe(true);
    }
  });
});

describe('keyframe recovery after loss', () => {
  it('retransmits a lost keyframe and still ends on the server hash', () => {
    const worlds = buildWorlds('dense', 120);
    const clean = runClientStream(worlds, 2);
    const lossy = runClientStream(worlds, 2, {
      drop: (tick, clientId, kind) => clientId === 2 && tick <= 3 && kind === 'keyframe',
    });
    expect(lossy.framesDropped).toBe(3);
    expect(lossy.keyframeRetries).toBe(3);
    expect(lossy.keyframes).toBe(clean.keyframes + 3);
    expect(lossy.desyncs).toBe(0);
    expect(lossy.finalViewHash).toBe(lossy.finalServerHash);
  });

  it('recovers from a lost delta by forcing a keyframe re-anchor', () => {
    const worlds = buildWorlds('dense', 120);
    const lossy = runClientStream(worlds, 4, {
      drop: (tick, clientId, kind) => clientId === 4 && tick === 10 && kind === 'delta',
    });
    expect(lossy.framesDropped).toBe(1);
    expect(lossy.keyframeRetries).toBe(0); // reanchored by a fresh keyframe, not by a retransmission
    expect(lossy.desyncs).toBe(0);
    expect(lossy.finalViewHash).toBe(lossy.finalServerHash);
  });

  it('recovers when a keyframe and several deltas are lost together', () => {
    const worlds = buildWorlds('four-client', 180);
    const lossy = runClientStream(worlds, 2, {
      drop: (tick, clientId, kind) => clientId === 2 && (
        (tick === 1 && kind === 'keyframe')
        || (tick >= 4 && tick <= 7 && kind === 'delta')
        || (tick === 61 && kind === 'keyframe')
      ),
    });
    // Chained re-anchoring turns most scheduled delta drops into keyframes, so only the drops that
    // actually occur are counted: the tick-1 and tick-61 keyframes and one delta before re-anchor.
    expect(lossy.framesDropped).toBe(3);
    expect(lossy.desyncs).toBe(0);
    expect(lossy.finalViewHash).toBe(lossy.finalServerHash);
  });
});

describe('measurement report', () => {
  it('measures both activity bounds deterministically and prints the report', () => {
    const first = runWireMeasurement(600);
    const second = runWireMeasurement(600);
    expect(second).toEqual(first);
    console.log(JSON.stringify(first, null, 2));

    expect(first.ticks).toBe(600);
    expect(first.entities).toBe(64);
    expect(first.clients).toEqual([1, 2, 3, 4]);
    expect(first.scenarios.map((scenario) => scenario.scenario)).toEqual(['dense', 'four-client']);

    for (const scenario of first.scenarios) {
      expect(scenario.control.down.averageBytesPerSecond).toBe(46_650);
      expect(scenario.treatment.desyncs).toBe(0);
      expect(scenario.treatment.allFinalHashesMatch).toBe(true);
      expect(scenario.treatment.down.bestBytesPerSecond).toBeLessThan(scenario.control.down.bestBytesPerSecond);
      expect(scenario.treatment.down.averageBytesPerSecond).toBeLessThan(scenario.control.down.averageBytesPerSecond);
      expect(scenario.treatment.down.worstBytesPerSecond).toBeLessThan(scenario.control.down.worstBytesPerSecond);
      expect(scenario.improvement.downAveragePercent).toBeGreaterThan(0);
    }

    const dense = first.scenarios.find((scenario) => scenario.scenario === 'dense')!;
    const fourClient = first.scenarios.find((scenario) => scenario.scenario === 'four-client')!;
    // v2 6 B packed entries move both measured bounds under the down budget. These assertions record
    // framed-byte arithmetic in a local harness, not a NET-GATE pass (no sockets, loss matrix or soak).
    expect(fourClient.treatment.down.worstBytesPerSecond).toBeLessThan(dense.treatment.down.worstBytesPerSecond);
    expect(fourClient.treatment.up.worstBytesPerSecond).toBeLessThanOrEqual(UP_BUDGET_BYTES_PER_SECOND);
    expect(fourClient.budget.downMetWorst).toBe(true);
    expect(dense.budget.downMetBest).toBe(true);
    expect(dense.budget.downMetAverage).toBe(true);
    expect(dense.budget.downMetWorst).toBe(true);
    expect(dense.budget.upMetWorst).toBe(true);
  });

  it('uses a shorter run for the deterministic repeat check', () => {
    const a = runWireMeasurement(120);
    const b = runWireMeasurement(120);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.scenarios.every((scenario) => scenario.treatment.desyncs === 0)).toBe(true);
  });
});
