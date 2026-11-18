/**
 * delta.ts — deterministic AoI + delta snapshot codec for the NET-GATE wire measurement.
 *
 * PROTOTYPE ONLY. This module is not wired into the server, does not change `binary.ts`, and adds no
 * frame kind to the production `FrameType` table (it uses its own 0x20 measurement frame). NET-101
 * owns the production AoI grid + delta + bitpacking work.
 *
 * Design:
 *   - AoI is a 32 m radius (D90) in integer millimetres, squared distance compared with bigint, then
 *     capped at 64 entities by (distance, id) so the cap is deterministic;
 *   - a keyframe carries every entity in the client's AoI at that tick;
 *   - a delta is computed against the last acknowledged keyframe, so it carries every entity that
 *     differs from that keyframe plus the ids that left the AoI. A lost delta is recovered by the next
 *     delta; a lost keyframe is recovered by retransmission;
 *   - integers only. No clock, no randomness, no float arithmetic, no dependency.
 *
 * Exact frame layout (little-endian):
 *
 *   header, 19 B: type u8 (0x20), version u8, flags u8, tick u32, baseTick u32, hash u32,
 *                 changedCount u16, removedCount u16
 *   keyframe entity, 24 B: id u32, x i32, z i32, vx i32, vz i32, seq u32
 *   relative delta entry, 10 B: id u16, tag u8 (0), dx i16, dz i16, vx i8, vz i8, seqDelta u8
 *   absolute delta entry, 23 B: id u16, tag u8 (1), x i32, z i32, vx i32, vz i32, seq u32
 *   removed id, 2 B: id u16
 *
 * A relative entry is used when (current - keyframe) fits i16 on each axis, the velocity fits i8 and
 * the per-entity seq advance fits u8; otherwise the entity is sent as an absolute entry. This is not
 * bitpacking: positions stay millimetres, velocities stay millimetres per tick.
 */
import { hashWorld, toWireMm, type EntityState, type WorldState } from '@strata/core';
import { MAX_ENTITIES } from './binary';

/** AoI radius from D90: 32 m, expressed in millimetres. */
export const AOI_RADIUS_MM = 32_000;

/** Measurement frame type. Deliberately outside binary.ts's production FrameType table. */
export const DELTA_FRAME_TYPE = 0x20;
export const DELTA_WIRE_VERSION = 1;

export const DELTA_HEADER_BYTES = 19;
export const KEYFRAME_ENTITY_BYTES = 24;
export const RELATIVE_ENTRY_BYTES = 10;
export const ABSOLUTE_ENTRY_BYTES = 23;
export const REMOVED_ID_BYTES = 2;

export const ENTRY_RELATIVE = 0;
export const ENTRY_ABSOLUTE = 1;

const KEYFRAME_FLAG = 0x01;
const MAX_U16 = 0xffff;
const MAX_U32 = 0xffff_ffff;
const HASH_RE = /^[0-9a-f]{8}$/;

export type DeltaErrorCode =
  | 'unknown-type'
  | 'version'
  | 'truncated'
  | 'trailing-bytes'
  | 'bad-flags'
  | 'bad-hash'
  | 'too-many-entities'
  | 'out-of-range'
  | 'duplicate-id'
  | 'overlap'
  | 'base-mismatch'
  | 'hash-mismatch'
  | 'needs-keyframe'
  | 'unknown-entity';

export class DeltaProtocolError extends Error {
  constructor(readonly code: DeltaErrorCode, message: string) {
    super(message);
    this.name = 'DeltaProtocolError';
  }
}

/** One entity change relative to the keyframe. */
export interface RelativeDeltaEntry {
  readonly kind: 'relative';
  readonly id: number;
  readonly dx: number;
  readonly dz: number;
  readonly vx: number;
  readonly vz: number;
  readonly seqDelta: number;
}

/** One entity new to the AoI since the keyframe, or too large for a relative entry. */
export interface AbsoluteDeltaEntry {
  readonly kind: 'absolute';
  readonly id: number;
  readonly x: number;
  readonly z: number;
  readonly vx: number;
  readonly vz: number;
  readonly seq: number;
}

export type DeltaEntry = RelativeDeltaEntry | AbsoluteDeltaEntry;

export interface DeltaKeyframeFrame {
  readonly kind: 'delta-keyframe';
  readonly tick: number;
  readonly hash: string;
  readonly entities: readonly EntityState[];
}

export interface DeltaUpdateFrame {
  readonly kind: 'delta';
  readonly tick: number;
  readonly baseTick: number;
  readonly hash: string;
  readonly changed: readonly DeltaEntry[];
  readonly removed: readonly number[];
}

export type DeltaFrame = DeltaKeyframeFrame | DeltaUpdateFrame;

/** The AoI view of one client at one tick, plus its FNV-1a hash. */
export interface AoiSnapshot {
  readonly tick: number;
  readonly entities: readonly EntityState[];
  readonly hash: string;
}

/** The state a client must hold to apply deltas: exactly one acknowledged keyframe. */
export interface DeltaBaseline {
  readonly tick: number;
  readonly hash: string;
  readonly entities: ReadonlyMap<number, EntityState>;
}

export interface DeltaFrameSize {
  readonly header: number;
  readonly entities: number;
  readonly changed: number;
  readonly removed: number;
  readonly total: number;
}

function checkU32(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX_U32) {
    throw new DeltaProtocolError('out-of-range', `${field} ${String(value)} is not a u32`);
  }
  return value >>> 0;
}

function checkU16(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1 || value > MAX_U16) {
    throw new DeltaProtocolError('out-of-range', `${field} ${String(value)} is not a positive u16`);
  }
  return value;
}

function checkI32(value: number, field: string): number {
  try {
    return toWireMm(value);
  } catch {
    throw new DeltaProtocolError('out-of-range', `${field} ${String(value)} is not an int32 millimetre`);
  }
}

function checkI16(value: number, field: string): number {
  if (!Number.isInteger(value) || value < -32_768 || value > 32_767) {
    throw new DeltaProtocolError('out-of-range', `${field} ${String(value)} is not an i16`);
  }
  return value;
}

function checkI8(value: number, field: string): number {
  if (!Number.isInteger(value) || value < -128 || value > 127) {
    throw new DeltaProtocolError('out-of-range', `${field} ${String(value)} is not an i8`);
  }
  return value;
}

function checkU8(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new DeltaProtocolError('out-of-range', `${field} ${String(value)} is not a u8`);
  }
  return value;
}

function checkHash(hash: string): string {
  if (!HASH_RE.test(hash)) throw new DeltaProtocolError('bad-hash', `hash "${hash}" is not 8 lowercase hex chars`);
  return hash;
}

function hashToU32(hash: string): number {
  return Number.parseInt(checkHash(hash), 16) >>> 0;
}

function u32ToHash(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}

function checkEntity(entity: EntityState, field: string): void {
  checkU16(entity.id, `${field}.id`);
  checkI32(entity.x, `${field}.x`);
  checkI32(entity.z, `${field}.z`);
  checkI32(entity.vx, `${field}.vx`);
  checkI32(entity.vz, `${field}.vz`);
  checkU32(entity.seq, `${field}.seq`);
}

function checkEntities(entities: readonly EntityState[], field: string): void {
  if (entities.length > MAX_ENTITIES) {
    throw new DeltaProtocolError('too-many-entities', `${field} has ${entities.length} entities > ${MAX_ENTITIES}`);
  }
  let previousId = 0;
  for (const entity of entities) {
    checkEntity(entity, field);
    if (entity.id <= previousId) {
      throw new DeltaProtocolError('duplicate-id', `${field} is not sorted by unique ascending id`);
    }
    previousId = entity.id;
  }
}

function checkEntry(entry: DeltaEntry): void {
  checkU16(entry.id, 'entry.id');
  if (entry.kind === 'relative') {
    checkI16(entry.dx, 'entry.dx');
    checkI16(entry.dz, 'entry.dz');
    checkI8(entry.vx, 'entry.vx');
    checkI8(entry.vz, 'entry.vz');
    checkU8(entry.seqDelta, 'entry.seqDelta');
    return;
  }
  checkI32(entry.x, 'entry.x');
  checkI32(entry.z, 'entry.z');
  checkI32(entry.vx, 'entry.vx');
  checkI32(entry.vz, 'entry.vz');
  checkU32(entry.seq, 'entry.seq');
}

function assertFrameShape(frame: DeltaFrame): void {
  if (frame.kind === 'delta-keyframe') {
    checkU32(frame.tick, 'tick');
    checkHash(frame.hash);
    checkEntities(frame.entities, 'keyframe.entities');
    return;
  }
  checkU32(frame.tick, 'tick');
  checkU32(frame.baseTick, 'baseTick');
  checkHash(frame.hash);
  if (frame.baseTick >= frame.tick) {
    throw new DeltaProtocolError('out-of-range', `baseTick ${frame.baseTick} must be before tick ${frame.tick}`);
  }
  if (frame.changed.length > MAX_ENTITIES) {
    throw new DeltaProtocolError('too-many-entities', `${frame.changed.length} changed > ${MAX_ENTITIES}`);
  }
  if (frame.removed.length > MAX_ENTITIES) {
    throw new DeltaProtocolError('too-many-entities', `${frame.removed.length} removed > ${MAX_ENTITIES}`);
  }
  const changedIds = new Set<number>();
  let previousChanged = 0;
  for (const entry of frame.changed) {
    checkEntry(entry);
    if (entry.id <= previousChanged) {
      throw new DeltaProtocolError('duplicate-id', 'changed entries are not sorted by unique ascending id');
    }
    previousChanged = entry.id;
    changedIds.add(entry.id);
  }
  let previousRemoved = 0;
  for (const id of frame.removed) {
    checkU16(id, 'removed.id');
    if (id <= previousRemoved) {
      throw new DeltaProtocolError('duplicate-id', 'removed ids are not sorted by unique ascending id');
    }
    previousRemoved = id;
    if (changedIds.has(id)) {
      throw new DeltaProtocolError('overlap', `entity ${id} is both changed and removed`);
    }
  }
}

function sameEntity(a: EntityState, b: EntityState): boolean {
  return a.id === b.id && a.x === b.x && a.z === b.z && a.vx === b.vx && a.vz === b.vz && a.seq === b.seq;
}

/** Hash of one AoI view at its tick. Same FNV-1a function as the full-world hash. */
export function hashAoiSnapshot(tick: number, entities: readonly EntityState[]): string {
  checkU32(tick, 'tick');
  checkEntities(entities, 'entities');
  return hashWorld({ tick, entities });
}

/**
 * Deterministic AoI selection: every entity whose squared distance to the viewer is <= radius²,
 * capped at `maxEntities` by (distance, id). Ties at the radius are included.
 */
export function selectAoi(
  viewer: EntityState,
  entities: readonly EntityState[],
  radiusMm = AOI_RADIUS_MM,
  maxEntities = MAX_ENTITIES,
): readonly EntityState[] {
  checkEntity(viewer, 'viewer');
  if (!Number.isInteger(radiusMm) || radiusMm < 1) {
    throw new DeltaProtocolError('out-of-range', `radius ${String(radiusMm)} is not a positive integer mm`);
  }
  if (!Number.isInteger(maxEntities) || maxEntities < 1 || maxEntities > MAX_ENTITIES) {
    throw new DeltaProtocolError('out-of-range', `maxEntities ${String(maxEntities)} is outside 1..${MAX_ENTITIES}`);
  }
  const radiusSquared = BigInt(radiusMm) * BigInt(radiusMm);
  const candidates: Array<{ readonly entity: EntityState; readonly distanceSquared: bigint }> = [];
  for (const entity of entities) {
    checkEntity(entity, 'entity');
    const dx = BigInt(entity.x - viewer.x);
    const dz = BigInt(entity.z - viewer.z);
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared <= radiusSquared) candidates.push({ entity, distanceSquared });
  }
  candidates.sort((a, b) => {
    if (a.distanceSquared < b.distanceSquared) return -1;
    if (a.distanceSquared > b.distanceSquared) return 1;
    return a.entity.id - b.entity.id;
  });
  const selected = candidates.slice(0, maxEntities).map((candidate) => candidate.entity);
  selected.sort((a, b) => a.id - b.id);
  return selected;
}

/** Build the AoI view of one client from a world tick. */
export function aoiSnapshotFor(
  world: WorldState,
  viewerId: number,
  radiusMm = AOI_RADIUS_MM,
): AoiSnapshot {
  checkU32(world.tick, 'tick');
  const viewer = world.entities.find((entity) => entity.id === viewerId);
  if (!viewer) throw new DeltaProtocolError('unknown-entity', `viewer ${viewerId} is not in the world`);
  const entities = selectAoi(viewer, world.entities, radiusMm);
  return { tick: world.tick, entities, hash: hashAoiSnapshot(world.tick, entities) };
}

/** Build a full keyframe from an AoI view. */
export function buildKeyframe(snapshot: AoiSnapshot): DeltaKeyframeFrame {
  checkU32(snapshot.tick, 'tick');
  checkHash(snapshot.hash);
  const expected = hashAoiSnapshot(snapshot.tick, snapshot.entities);
  if (expected !== snapshot.hash) {
    throw new DeltaProtocolError('hash-mismatch', `snapshot hash ${snapshot.hash} != ${expected}`);
  }
  return { kind: 'delta-keyframe', tick: snapshot.tick, hash: snapshot.hash, entities: [...snapshot.entities] };
}

/** Take the keyframe a client holds as the baseline for subsequent deltas. */
export function baselineFromSnapshot(snapshot: AoiSnapshot): DeltaBaseline {
  checkU32(snapshot.tick, 'tick');
  checkHash(snapshot.hash);
  checkEntities(snapshot.entities, 'baseline.entities');
  const entities = new Map<number, EntityState>();
  for (const entity of snapshot.entities) entities.set(entity.id, entity);
  return { tick: snapshot.tick, hash: snapshot.hash, entities };
}

/**
 * Build the delta from an acknowledged keyframe to the current AoI view. Changed entities are sorted
 * by id; removed ids are those in the baseline but no longer in the AoI, sorted by id.
 */
export function buildDelta(baseline: DeltaBaseline, snapshot: AoiSnapshot): DeltaUpdateFrame {
  checkU32(baseline.tick, 'baseline.tick');
  if (baseline.tick >= snapshot.tick) {
    throw new DeltaProtocolError('base-mismatch', `baseline tick ${baseline.tick} is not before ${snapshot.tick}`);
  }
  const expected = hashAoiSnapshot(snapshot.tick, snapshot.entities);
  if (expected !== snapshot.hash) {
    throw new DeltaProtocolError('hash-mismatch', `snapshot hash ${snapshot.hash} != ${expected}`);
  }
  const current = new Set<number>();
  const changed: DeltaEntry[] = [];
  for (const entity of snapshot.entities) {
    current.add(entity.id);
    const previous = baseline.entities.get(entity.id);
    if (!previous) {
      if (entity.id > MAX_U16) {
        throw new DeltaProtocolError('needs-keyframe', `entity ${entity.id} does not fit the u16 delta id`);
      }
      changed.push({
        kind: 'absolute', id: entity.id, x: entity.x, z: entity.z, vx: entity.vx, vz: entity.vz, seq: entity.seq,
      });
      continue;
    }
    if (sameEntity(previous, entity)) continue;
    const dx = entity.x - previous.x;
    const dz = entity.z - previous.z;
    const seqDelta = entity.seq - previous.seq;
    const relative = entity.id <= MAX_U16
      && dx >= -32_768 && dx <= 32_767
      && dz >= -32_768 && dz <= 32_767
      && entity.vx >= -128 && entity.vx <= 127
      && entity.vz >= -128 && entity.vz <= 127
      && seqDelta >= 0 && seqDelta <= 255;
    if (relative) {
      changed.push({
        kind: 'relative', id: entity.id, dx, dz, vx: entity.vx, vz: entity.vz, seqDelta,
      });
    } else {
      if (entity.id > MAX_U16) {
        throw new DeltaProtocolError('needs-keyframe', `entity ${entity.id} does not fit the u16 delta id`);
      }
      changed.push({
        kind: 'absolute', id: entity.id, x: entity.x, z: entity.z, vx: entity.vx, vz: entity.vz, seq: entity.seq,
      });
    }
  }
  const removed: number[] = [];
  for (const id of [...baseline.entities.keys()].sort((a, b) => a - b)) {
    if (current.has(id)) continue;
    if (id > MAX_U16) {
      throw new DeltaProtocolError('needs-keyframe', `removed entity ${id} does not fit the u16 delta id`);
    }
    removed.push(id);
  }
  return {
    kind: 'delta',
    tick: snapshot.tick,
    baseTick: baseline.tick,
    hash: snapshot.hash,
    changed,
    removed,
  };
}

export function keyframeDue(tick: number, lastKeyframeTick: number | null, intervalTicks: number): boolean {
  checkU32(tick, 'tick');
  if (!Number.isInteger(intervalTicks) || intervalTicks < 1) {
    throw new DeltaProtocolError('out-of-range', `keyframe interval ${String(intervalTicks)} is not positive`);
  }
  if (lastKeyframeTick === null) return true;
  checkU32(lastKeyframeTick, 'lastKeyframeTick');
  return tick - lastKeyframeTick >= intervalTicks;
}

export interface ClientFrameOptions {
  readonly keyframeIntervalTicks: number;
  readonly lastKeyframeTick: number | null;
  readonly radiusMm?: number;
  readonly forceKeyframe?: boolean;
}

export interface ClientFrameResult {
  readonly frame: DeltaFrame;
  readonly snapshot: AoiSnapshot;
  readonly keyframe: boolean;
}

/** One-client convenience: keyframe when due or forced, otherwise a delta against the baseline. */
export function buildClientFrame(
  world: WorldState,
  viewerId: number,
  baseline: DeltaBaseline | null,
  options: ClientFrameOptions,
): ClientFrameResult {
  const snapshot = aoiSnapshotFor(world, viewerId, options.radiusMm ?? AOI_RADIUS_MM);
  const keyframe = options.forceKeyframe === true
    || baseline === null
    || keyframeDue(snapshot.tick, options.lastKeyframeTick, options.keyframeIntervalTicks);
  if (keyframe) return { frame: buildKeyframe(snapshot), snapshot, keyframe: true };
  return { frame: buildDelta(baseline, snapshot), snapshot, keyframe: false };
}

/** Exact byte breakdown of one frame, from its current fields and entry kinds. */
export function deltaFrameSize(frame: DeltaFrame): DeltaFrameSize {
  assertFrameShape(frame);
  if (frame.kind === 'delta-keyframe') {
    const entities = frame.entities.length * KEYFRAME_ENTITY_BYTES;
    return {
      header: DELTA_HEADER_BYTES, entities, changed: 0, removed: 0, total: DELTA_HEADER_BYTES + entities,
    };
  }
  let changed = 0;
  for (const entry of frame.changed) {
    changed += entry.kind === 'relative' ? RELATIVE_ENTRY_BYTES : ABSOLUTE_ENTRY_BYTES;
  }
  const removed = frame.removed.length * REMOVED_ID_BYTES;
  return {
    header: DELTA_HEADER_BYTES,
    entities: 0,
    changed,
    removed,
    total: DELTA_HEADER_BYTES + changed + removed,
  };
}

/** Encode one measurement frame. Every length is exact and verified again by the decoder. */
export function encodeDeltaFrame(frame: DeltaFrame): Uint8Array {
  const size = deltaFrameSize(frame);
  const out = new Uint8Array(size.total);
  const view = new DataView(out.buffer);
  view.setUint8(0, DELTA_FRAME_TYPE);
  view.setUint8(1, DELTA_WIRE_VERSION);
  view.setUint8(2, frame.kind === 'delta-keyframe' ? KEYFRAME_FLAG : 0);
  view.setUint32(3, frame.tick, true);
  view.setUint32(7, frame.kind === 'delta-keyframe' ? 0 : frame.baseTick, true);
  view.setUint32(11, hashToU32(frame.hash), true);
  view.setUint16(15, frame.kind === 'delta-keyframe' ? frame.entities.length : frame.changed.length, true);
  view.setUint16(17, frame.kind === 'delta-keyframe' ? 0 : frame.removed.length, true);
  let offset = DELTA_HEADER_BYTES;
  if (frame.kind === 'delta-keyframe') {
    for (const entity of frame.entities) {
      view.setUint32(offset, entity.id, true);
      view.setInt32(offset + 4, entity.x, true);
      view.setInt32(offset + 8, entity.z, true);
      view.setInt32(offset + 12, entity.vx, true);
      view.setInt32(offset + 16, entity.vz, true);
      view.setUint32(offset + 20, entity.seq, true);
      offset += KEYFRAME_ENTITY_BYTES;
    }
    return out;
  }
  for (const entry of frame.changed) {
    view.setUint16(offset, entry.id, true);
    if (entry.kind === 'relative') {
      view.setUint8(offset + 2, ENTRY_RELATIVE);
      view.setInt16(offset + 3, entry.dx, true);
      view.setInt16(offset + 5, entry.dz, true);
      view.setInt8(offset + 7, entry.vx);
      view.setInt8(offset + 8, entry.vz);
      view.setUint8(offset + 9, entry.seqDelta);
      offset += RELATIVE_ENTRY_BYTES;
    } else {
      view.setUint8(offset + 2, ENTRY_ABSOLUTE);
      view.setInt32(offset + 3, entry.x, true);
      view.setInt32(offset + 7, entry.z, true);
      view.setInt32(offset + 11, entry.vx, true);
      view.setInt32(offset + 15, entry.vz, true);
      view.setUint32(offset + 19, entry.seq, true);
      offset += ABSOLUTE_ENTRY_BYTES;
    }
  }
  for (const id of frame.removed) {
    view.setUint16(offset, id, true);
    offset += REMOVED_ID_BYTES;
  }
  return out;
}

function lengthError(got: number, want: number): DeltaProtocolError {
  return got > want
    ? new DeltaProtocolError('trailing-bytes', `frame is ${got} bytes, expected ${want}`)
    : new DeltaProtocolError('truncated', `frame is ${got} bytes, expected ${want}`);
}

/** Decode one measurement frame. Truncated, trailing, duplicate, overlapping and undefined input is refused. */
export function decodeDeltaFrame(bytes: Uint8Array): DeltaFrame {
  if (bytes.length < DELTA_HEADER_BYTES) throw new DeltaProtocolError('truncated', 'delta header truncated');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint8(0) !== DELTA_FRAME_TYPE) {
    throw new DeltaProtocolError('unknown-type', `unknown frame type 0x${view.getUint8(0).toString(16)}`);
  }
  if (view.getUint8(1) !== DELTA_WIRE_VERSION) {
    throw new DeltaProtocolError('version', `unsupported delta version ${view.getUint8(1)}`);
  }
  const flags = view.getUint8(2);
  if ((flags & ~KEYFRAME_FLAG) !== 0) throw new DeltaProtocolError('bad-flags', `reserved flags 0x${flags.toString(16)}`);
  const keyframe = (flags & KEYFRAME_FLAG) !== 0;
  const tick = view.getUint32(3, true);
  const baseTick = view.getUint32(7, true);
  const hash = u32ToHash(view.getUint32(11, true));
  const changedCount = view.getUint16(15, true);
  const removedCount = view.getUint16(17, true);

  if (keyframe) {
    if (baseTick !== 0) throw new DeltaProtocolError('out-of-range', 'keyframe baseTick must be 0');
    if (removedCount !== 0) throw new DeltaProtocolError('bad-flags', 'keyframe cannot carry removed ids');
    if (changedCount > MAX_ENTITIES) {
      throw new DeltaProtocolError('too-many-entities', `${changedCount} entities > ${MAX_ENTITIES}`);
    }
    const expected = DELTA_HEADER_BYTES + changedCount * KEYFRAME_ENTITY_BYTES;
    if (bytes.length !== expected) throw lengthError(bytes.length, expected);
    const entities: EntityState[] = [];
    let offset = DELTA_HEADER_BYTES;
    for (let index = 0; index < changedCount; index += 1) {
      entities.push({
        id: view.getUint32(offset, true),
        x: view.getInt32(offset + 4, true),
        z: view.getInt32(offset + 8, true),
        vx: view.getInt32(offset + 12, true),
        vz: view.getInt32(offset + 16, true),
        seq: view.getUint32(offset + 20, true),
      });
      offset += KEYFRAME_ENTITY_BYTES;
    }
    checkEntities(entities, 'keyframe.entities');
    return { kind: 'delta-keyframe', tick, hash, entities };
  }

  if (baseTick >= tick) {
    throw new DeltaProtocolError('out-of-range', `delta baseTick ${baseTick} must be before tick ${tick}`);
  }
  if (changedCount > MAX_ENTITIES) {
    throw new DeltaProtocolError('too-many-entities', `${changedCount} changed > ${MAX_ENTITIES}`);
  }
  if (removedCount > MAX_ENTITIES) {
    throw new DeltaProtocolError('too-many-entities', `${removedCount} removed > ${MAX_ENTITIES}`);
  }
  const changed: DeltaEntry[] = [];
  let offset = DELTA_HEADER_BYTES;
  for (let index = 0; index < changedCount; index += 1) {
    if (offset + 3 > bytes.length) throw new DeltaProtocolError('truncated', 'delta entry header truncated');
    const id = view.getUint16(offset, true);
    const tag = view.getUint8(offset + 2);
    if (tag === ENTRY_RELATIVE) {
      if (offset + RELATIVE_ENTRY_BYTES > bytes.length) {
        throw new DeltaProtocolError('truncated', 'relative delta entry truncated');
      }
      changed.push({
        kind: 'relative',
        id,
        dx: view.getInt16(offset + 3, true),
        dz: view.getInt16(offset + 5, true),
        vx: view.getInt8(offset + 7),
        vz: view.getInt8(offset + 8),
        seqDelta: view.getUint8(offset + 9),
      });
      offset += RELATIVE_ENTRY_BYTES;
    } else if (tag === ENTRY_ABSOLUTE) {
      if (offset + ABSOLUTE_ENTRY_BYTES > bytes.length) {
        throw new DeltaProtocolError('truncated', 'absolute delta entry truncated');
      }
      changed.push({
        kind: 'absolute',
        id,
        x: view.getInt32(offset + 3, true),
        z: view.getInt32(offset + 7, true),
        vx: view.getInt32(offset + 11, true),
        vz: view.getInt32(offset + 15, true),
        seq: view.getUint32(offset + 19, true),
      });
      offset += ABSOLUTE_ENTRY_BYTES;
    } else {
      throw new DeltaProtocolError('out-of-range', `unknown delta entry tag ${tag}`);
    }
  }
  if (offset + removedCount * REMOVED_ID_BYTES > bytes.length) {
    throw new DeltaProtocolError('truncated', 'removed id list truncated');
  }
  const removed: number[] = [];
  for (let index = 0; index < removedCount; index += 1) {
    removed.push(view.getUint16(offset, true));
    offset += REMOVED_ID_BYTES;
  }
  if (offset !== bytes.length) throw lengthError(bytes.length, offset);
  const frame: DeltaUpdateFrame = { kind: 'delta', tick, baseTick, hash, changed, removed };
  assertFrameShape(frame);
  return frame;
}

export interface AppliedDelta {
  readonly tick: number;
  readonly entities: readonly EntityState[];
  readonly hash: string;
}

/**
 * Apply one frame. A keyframe replaces the client view; a delta must name the baseline tick the client
 * actually holds. The resulting view is hashed and must equal the frame hash, or the frame is refused.
 */
export function applyDeltaFrame(baseline: DeltaBaseline | null, frame: DeltaFrame): AppliedDelta {
  assertFrameShape(frame);
  if (frame.kind === 'delta-keyframe') {
    const entities = [...frame.entities];
    const hash = hashAoiSnapshot(frame.tick, entities);
    if (hash !== frame.hash) throw new DeltaProtocolError('hash-mismatch', `keyframe hash ${frame.hash} != ${hash}`);
    return { tick: frame.tick, entities, hash };
  }
  if (!baseline) throw new DeltaProtocolError('base-mismatch', 'a delta cannot be applied without a keyframe baseline');
  if (baseline.tick !== frame.baseTick) {
    throw new DeltaProtocolError('base-mismatch', `delta base ${frame.baseTick} != client baseline ${baseline.tick}`);
  }
  const entities = new Map<number, EntityState>(baseline.entities);
  for (const entry of frame.changed) {
    if (entry.kind === 'relative') {
      const previous = entities.get(entry.id);
      if (!previous) {
        throw new DeltaProtocolError('base-mismatch', `relative entry ${entry.id} has no baseline entity`);
      }
      const seq = previous.seq + entry.seqDelta;
      checkU32(seq, 'entity.seq');
      entities.set(entry.id, {
        id: entry.id,
        x: checkI32(previous.x + entry.dx, 'entity.x'),
        z: checkI32(previous.z + entry.dz, 'entity.z'),
        vx: entry.vx,
        vz: entry.vz,
        seq,
      });
      continue;
    }
    entities.set(entry.id, {
      id: entry.id, x: entry.x, z: entry.z, vx: entry.vx, vz: entry.vz, seq: entry.seq,
    });
  }
  for (const id of frame.removed) entities.delete(id);
  const ordered = [...entities.values()].sort((a, b) => a.id - b.id);
  if (ordered.length > MAX_ENTITIES) {
    throw new DeltaProtocolError('too-many-entities', `${ordered.length} entities > ${MAX_ENTITIES}`);
  }
  const hash = hashAoiSnapshot(frame.tick, ordered);
  if (hash !== frame.hash) throw new DeltaProtocolError('hash-mismatch', `delta hash ${frame.hash} != ${hash}`);
  return { tick: frame.tick, entities: ordered, hash };
}
