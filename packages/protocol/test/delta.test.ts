import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type EntityState } from '@strata/core';
import {
  ABSOLUTE_ENTRY_BYTES,
  AOI_RADIUS_MM,
  DELTA_FRAME_TYPE,
  DELTA_HEADER_BYTES,
  DeltaProtocolError,
  KEYFRAME_ENTITY_BYTES,
  RELATIVE_ENTRY_BYTES,
  REMOVED_ID_BYTES,
  applyDeltaFrame,
  aoiSnapshotFor,
  baselineFromSnapshot,
  buildClientFrame,
  buildDelta,
  buildKeyframe,
  decodeDeltaFrame,
  deltaFrameSize,
  encodeDeltaFrame,
  hashAoiSnapshot,
  selectAoi,
  type AoiSnapshot,
  type DeltaErrorCode,
  type DeltaFrame,
} from '../src/index';

function entity(id: number, x = 0, z = 0, vx = 0, vz = 0, seq = 0): EntityState {
  return { id, x, z, vx, vz, seq };
}

function snapshot(tick: number, entities: readonly EntityState[]): AoiSnapshot {
  const ordered = [...entities].sort((a, b) => a.id - b.id);
  return { tick, entities: ordered, hash: hashAoiSnapshot(tick, ordered) };
}

function mutate(bytes: Uint8Array, change: (view: DataView) => void): Uint8Array {
  const copy = new Uint8Array(bytes);
  change(new DataView(copy.buffer));
  return copy;
}

function codeOf(action: () => unknown): DeltaErrorCode {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(DeltaProtocolError);
    return (error as DeltaProtocolError).code;
  }
  throw new Error('expected a DeltaProtocolError');
}

describe('AoI selection', () => {
  const viewer = entity(1, 0, 0);

  it('includes the radius boundary and excludes one millimetre beyond it', () => {
    const entities = [
      viewer,
      entity(2, AOI_RADIUS_MM, 0),
      entity(3, 0, -AOI_RADIUS_MM),
      entity(4, AOI_RADIUS_MM + 1, 0),
      entity(5, -AOI_RADIUS_MM, 0),
      entity(6, 23_000, 23_000),
    ];
    expect(selectAoi(viewer, entities).map((e) => e.id)).toEqual([1, 2, 3, 5]);
  });

  it('caps by nearest distance then id, and returns the survivors sorted by id', () => {
    const entities = [
      entity(9, 0, 0),
      entity(7, 10, 0),
      entity(8, -10, 0),
      entity(6, 20, 0),
    ];
    expect(selectAoi(viewer, entities, AOI_RADIUS_MM, 2).map((e) => e.id)).toEqual([7, 9]);
  });

  it('rejects a non-positive radius and an out-of-range cap', () => {
    expect(codeOf(() => selectAoi(viewer, [viewer], 0))).toBe('out-of-range');
    expect(codeOf(() => selectAoi(viewer, [viewer], AOI_RADIUS_MM, 65))).toBe('out-of-range');
  });

  it('builds the same view and hash twice for the same world', () => {
    const world = createWorld(1337, 64);
    const a = aoiSnapshotFor(world, 3);
    const b = aoiSnapshotFor(world, 3);
    expect(a).toEqual(b);
    expect(a.entities.length).toBeGreaterThan(0);
    expect(a.entities.length).toBeLessThanOrEqual(64);
  });
});

describe('keyframe round-trip and exact lengths', () => {
  it('is header 19 + 24 per entity, and round-trips', () => {
    const view = snapshot(10, [entity(1, -50, 50, 0, 0, 2), entity(2, 100, -100, 50, -50, 3), entity(3)]);
    const frame = buildKeyframe(view);
    const size = deltaFrameSize(frame);
    expect(size).toEqual({
      header: DELTA_HEADER_BYTES,
      entities: 3 * KEYFRAME_ENTITY_BYTES,
      changed: 0,
      removed: 0,
      total: 19 + 72,
    });
    const bytes = encodeDeltaFrame(frame);
    expect(bytes.byteLength).toBe(91);
    expect(bytes[0]).toBe(DELTA_FRAME_TYPE);
    const decoded = decodeDeltaFrame(bytes);
    expect(decoded).toEqual(frame);
    const applied = applyDeltaFrame(null, decoded);
    expect(applied).toEqual({ tick: 10, entities: view.entities, hash: view.hash });
  });

  it('round-trips a full 64-entity keyframe at 1 555 bytes', () => {
    const world = createWorld(1337, 64);
    const view = aoiSnapshotFor(world, 1, Number.MAX_SAFE_INTEGER);
    expect(view.entities.length).toBe(64);
    const bytes = encodeDeltaFrame(buildKeyframe(view));
    expect(bytes.byteLength).toBe(DELTA_HEADER_BYTES + 64 * KEYFRAME_ENTITY_BYTES);
    expect(bytes.byteLength).toBe(1_555);
    expect(decodeDeltaFrame(bytes)).toEqual(buildKeyframe(view));
  });
});

describe('delta round-trip, removals and exact lengths', () => {
  const baseView = snapshot(1, [
    entity(1, 0, 0, 0, 0, 0),
    entity(2, 100, 0, 0, 0, 0),
    entity(3, -100, 0, 0, 0, 0),
  ]);
  const nextView = snapshot(2, [
    entity(1, 50, 0, 50, 0, 1),
    entity(2, 100, 0, 0, 0, 0),
    entity(4, 3_000, 0, 0, 0, 7),
  ]);

  it('encodes only changed entities and removed ids', () => {
    const baseline = baselineFromSnapshot(baseView);
    const delta = buildDelta(baseline, nextView);
    expect(delta.kind).toBe('delta');
    if (delta.kind !== 'delta') throw new Error('unreachable');
    expect(delta.baseTick).toBe(1);
    expect(delta.changed).toEqual([
      { kind: 'relative', id: 1, dx: 50, dz: 0, vx: 50, vz: 0, seqDelta: 1 },
      { kind: 'absolute', id: 4, x: 3_000, z: 0, vx: 0, vz: 0, seq: 7 },
    ]);
    expect(delta.removed).toEqual([3]);
    const size = deltaFrameSize(delta);
    expect(size).toEqual({
      header: DELTA_HEADER_BYTES,
      entities: 0,
      changed: RELATIVE_ENTRY_BYTES + ABSOLUTE_ENTRY_BYTES,
      removed: REMOVED_ID_BYTES,
      total: 19 + 10 + 23 + 2,
    });
    const bytes = encodeDeltaFrame(delta);
    expect(bytes.byteLength).toBe(54);
    const decoded = decodeDeltaFrame(bytes);
    expect(decoded).toEqual(delta);
    const applied = applyDeltaFrame(baseline, decoded);
    expect(applied).toEqual({ tick: 2, entities: nextView.entities, hash: nextView.hash });
  });

  it('is idempotent for removals when the same delta is applied again', () => {
    const baseline = baselineFromSnapshot(baseView);
    const delta = buildDelta(baseline, nextView);
    const once = applyDeltaFrame(baseline, delta);
    const twice = applyDeltaFrame(baseline, delta);
    expect(once).toEqual(twice);
    expect(twice.entities.map((e) => e.id)).toEqual([1, 2, 4]);
  });

  it('encodes an unchanged view as an empty delta of 19 header bytes', () => {
    const baseline = baselineFromSnapshot(baseView);
    const delta = buildDelta(baseline, snapshot(2, baseView.entities));
    expect(delta.changed).toEqual([]);
    expect(delta.removed).toEqual([]);
    expect(encodeDeltaFrame(delta).byteLength).toBe(DELTA_HEADER_BYTES);
    expect(applyDeltaFrame(baseline, delta)).toEqual({
      tick: 2, entities: baseView.entities, hash: hashAoiSnapshot(2, baseView.entities),
    });
  });
});

describe('determinism', () => {
  it('produces byte-identical frames and decode/encode is stable', () => {
    const world = createWorld(1337, 64);
    let next = stepWorld(world, [
      { entity: 1, seq: 1, dx: 1, dz: 0 },
      { entity: 2, seq: 1, dx: 0, dz: -1 },
    ]);
    next = stepWorld(next, [{ entity: 1, seq: 2, dx: -1, dz: 1 }]);
    const base = aoiSnapshotFor(world, 3);
    const view = aoiSnapshotFor(next, 3);
    const baseline = baselineFromSnapshot(base);
    const first = encodeDeltaFrame(buildDelta(baseline, view));
    const second = encodeDeltaFrame(buildDelta(baseline, view));
    expect(first).toEqual(second);
    expect(encodeDeltaFrame(decodeDeltaFrame(first))).toEqual(first);
    expect(applyDeltaFrame(baseline, decodeDeltaFrame(first))).toEqual({
      tick: view.tick, entities: view.entities, hash: view.hash,
    });
  });

  it('builds a keyframe when due or forced, a delta otherwise', () => {
    const world = createWorld(1337, 8);
    const first = buildClientFrame(world, 2, null, { keyframeIntervalTicks: 60, lastKeyframeTick: null });
    expect(first.keyframe).toBe(true);
    const baseline = baselineFromSnapshot(first.snapshot);
    const next = stepWorld(world, [{ entity: 2, seq: 1, dx: 1, dz: 0 }]);
    const delta = buildClientFrame(next, 2, baseline, { keyframeIntervalTicks: 60, lastKeyframeTick: 0 });
    expect(delta.keyframe).toBe(false);
    const forced = buildClientFrame(next, 2, baseline, {
      keyframeIntervalTicks: 60, lastKeyframeTick: 0, forceKeyframe: true,
    });
    expect(forced.keyframe).toBe(true);
  });
});

describe('malformed frames are refused', () => {
  const view = snapshot(4, [entity(1, 0, 0, 0, 0, 1), entity(2, 50, 0, 0, 0, 1)]);
  const keyframe = encodeDeltaFrame(buildKeyframe(view));
  const baseView = snapshot(1, [entity(1, 0, 0, 0, 0, 0), entity(2, 50, 0, 0, 0, 0)]);
  const delta = encodeDeltaFrame(buildDelta(baselineFromSnapshot(baseView), view));

  it('refuses empty, short, wrong-type and wrong-version frames', () => {
    expect(codeOf(() => decodeDeltaFrame(new Uint8Array(0)))).toBe('truncated');
    expect(codeOf(() => decodeDeltaFrame(new Uint8Array(DELTA_HEADER_BYTES - 1)))).toBe('truncated');
    expect(codeOf(() => decodeDeltaFrame(mutate(keyframe, (v) => v.setUint8(0, 0x21))))).toBe('unknown-type');
    expect(codeOf(() => decodeDeltaFrame(mutate(keyframe, (v) => v.setUint8(1, 2))))).toBe('version');
  });

  it('refuses reserved flags and keyframe fields that must be zero', () => {
    expect(codeOf(() => decodeDeltaFrame(mutate(keyframe, (v) => v.setUint8(2, 0x80))))).toBe('bad-flags');
    expect(codeOf(() => decodeDeltaFrame(mutate(keyframe, (v) => v.setUint32(7, 1, true))))).toBe('out-of-range');
    expect(codeOf(() => decodeDeltaFrame(mutate(keyframe, (v) => v.setUint16(17, 1, true))))).toBe('bad-flags');
  });

  it('refuses too many entities, truncation and trailing bytes', () => {
    expect(codeOf(() => decodeDeltaFrame(mutate(keyframe, (v) => v.setUint16(15, 65, true))))).toBe('too-many-entities');
    expect(codeOf(() => decodeDeltaFrame(keyframe.slice(0, keyframe.byteLength - 1)))).toBe('truncated');
    const trailing = new Uint8Array(keyframe.byteLength + 1);
    trailing.set(keyframe);
    expect(codeOf(() => decodeDeltaFrame(trailing))).toBe('trailing-bytes');
  });

  it('refuses an unknown delta entry tag and a non-monotonic base tick', () => {
    expect(codeOf(() => decodeDeltaFrame(mutate(delta, (v) => v.setUint8(DELTA_HEADER_BYTES + 2, 2))))).toBe('out-of-range');
    expect(codeOf(() => decodeDeltaFrame(mutate(delta, (v) => v.setUint32(7, 4, true))))).toBe('out-of-range');
  });

  it('refuses duplicate changed ids and a changed id that is also removed', () => {
    const twoChanges = snapshot(2, [entity(1, 10), entity(2, 20)]);
    const twoBase = snapshot(1, [entity(1), entity(2)]);
    const twoDelta = encodeDeltaFrame(buildDelta(baselineFromSnapshot(twoBase), twoChanges));
    expect(twoDelta.byteLength).toBe(DELTA_HEADER_BYTES + 2 * RELATIVE_ENTRY_BYTES);
    expect(codeOf(() => decodeDeltaFrame(mutate(twoDelta, (v) => v.setUint16(DELTA_HEADER_BYTES + RELATIVE_ENTRY_BYTES, 1, true)))))
      .toBe('duplicate-id');

    const withRemoval = snapshot(2, [entity(1, 10)]);
    const removal = encodeDeltaFrame(buildDelta(baselineFromSnapshot(twoBase), withRemoval));
    const removedOffset = DELTA_HEADER_BYTES + RELATIVE_ENTRY_BYTES;
    expect(codeOf(() => decodeDeltaFrame(mutate(removal, (v) => v.setUint16(removedOffset, 1, true))))).toBe('overlap');
  });

  it('refuses a delta applied to the wrong baseline or with a bad hash', () => {
    const baseline = baselineFromSnapshot(baseView);
    const frame = decodeDeltaFrame(delta);
    expect(codeOf(() => applyDeltaFrame(null, frame))).toBe('base-mismatch');
    expect(codeOf(() => applyDeltaFrame({ ...baseline, tick: 3 }, frame))).toBe('base-mismatch');
    const badHash: DeltaFrame = { ...frame, hash: '00000000' };
    expect(codeOf(() => applyDeltaFrame(baseline, badHash))).toBe('hash-mismatch');
  });

  it('refuses a relative entry whose baseline entity is absent', () => {
    const frame: DeltaFrame = {
      kind: 'delta',
      tick: 2,
      baseTick: 1,
      hash: '00000000',
      changed: [{ kind: 'relative', id: 5, dx: 1, dz: 0, vx: 0, vz: 0, seqDelta: 1 }],
      removed: [],
    };
    expect(codeOf(() => applyDeltaFrame(baselineFromSnapshot(baseView), frame))).toBe('base-mismatch');
  });

  it('refuses a keyframe or snapshot hash that does not match its contents', () => {
    const good = buildKeyframe(view);
    const bad: DeltaFrame = { ...good, hash: '00000000' };
    expect(codeOf(() => applyDeltaFrame(null, bad))).toBe('hash-mismatch');
    expect(codeOf(() => buildKeyframe({ ...view, hash: '00000000' }))).toBe('hash-mismatch');
  });
});
