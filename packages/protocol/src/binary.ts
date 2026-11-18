/**
 * binary.ts — the binary wire contract (NET-002).
 *
 * v1 was the TRACER-001 JSON framing (`./tracer.ts`), kept for the walking skeleton. v5 is this binary
 * frame: one type byte, a fixed little-endian layout, strict length, no optional fields, no strings on the
 * hot path. A decoder that sees one byte too many refuses the frame instead of guessing.
 *
 * The codec is isomorphic (no Node, no DOM) and carries no dependency beyond the core range contract.
 * It is a *correctness* codec: it packs fields exactly, but it does not delta-compress or bit-pack. The
 * 12 KB/s down budget at 64 AoI entities is NET-101's job; a full v5 snapshot here is 1 555 bytes, which is
 * ~46.65 KB/s at 30 Hz — measured, over budget, and deliberately left to the AoI task (see the test).
 */
import { hashEntity, toWireMm } from '@strata/core';
import { ANIM_STATES, type AnimStateName, type Axis, type EntityState, type WorldState } from '@strata/core';

/** Bumped whenever the wire layout changes. A peer with another version is refused, never truncated. */
export const PROTOCOL_VERSION = 5;

/** Version bounds the handshake accepts. One version today; a range so a future bump can widen it. */
export const SUPPORTED_MIN_VERSION = 5;
export const SUPPORTED_MAX_VERSION = 5;

/** AoI cap from D90: never more than 64 entities in a snapshot. */
export const MAX_ENTITIES = 64;

export const FrameType = {
  Intent: 0x01,
  Snapshot: 0x02,
  HashAck: 0x03,
  Anim: 0x04,
  Resync: 0x05,
  Hello: 0x10,
  Welcome: 0x11,
  Reject: 0x12,
} as const;

export type FrameTypeValue = (typeof FrameType)[keyof typeof FrameType];

export const INTENT_BYTES = 15;
export const SNAPSHOT_HEADER_BYTES = 19;
export const ENTITY_BYTES = 24;
export const HASH_ACK_BYTES = 13;
export const ANIM_BYTES = 17;
export const RESYNC_BYTES = 10;
export const HELLO_BYTES = 4;
export const WELCOME_BYTES = 3;
export const REJECT_BYTES = 4;

/** Largest legal frame: a full 64-entity snapshot. */
export const MAX_FRAME_BYTES = SNAPSHOT_HEADER_BYTES + MAX_ENTITIES * ENTITY_BYTES;

export type RejectReason = 'version' | 'malformed' | 'rate-limit' | 'unauthorized';

export const RESYNC_REASONS = ['hash-mismatch', 'missing-entity', 'timeout'] as const;
export type ResyncReason = (typeof RESYNC_REASONS)[number];

/** 12-byte anim_state (NET-005) plus a type byte and an entity id. No bone data, ever (I3 / A0001). */
export interface AnimFrame {
  readonly kind: 'anim';
  readonly entity: number;
  readonly archetype: number;
  readonly state: AnimStateName;
  readonly clipId: number;
  readonly transitionTick: number;
  readonly sequence: number;
}

/** A client asks to resynchronise. It is a request: the server still decides the snapshot (I1). */
export interface ResyncFrame {
  readonly kind: 'resync';
  readonly client: number;
  readonly tick: number;
  readonly reason: ResyncReason;
}

export interface IntentFrame {
  readonly kind: 'intent';
  readonly entity: number;
  readonly seq: number;
  /** Tick at which the sender wants this intent applied (v5). The server drops past targets, refuses far-future ones. */
  readonly targetTick: number;
  readonly dx: Axis;
  readonly dz: Axis;
}

export interface SnapshotFrame {
  readonly kind: 'snapshot';
  readonly tick: number;
  readonly appliedSeq: number;
  /** Server audit hash of the whole world at this tick. */
  readonly hash: string;
  /** Hash of the recipient's own entity at this tick — the only state a client can predict. */
  readonly viewHash: string;
  readonly entities: readonly EntityState[];
}

export interface HashAckFrame {
  readonly kind: 'hashack';
  readonly client: number;
  readonly tick: number;
  readonly hash: string;
}

export interface HelloFrame {
  readonly kind: 'hello';
  readonly version: number;
  readonly capabilities: number;
}

export interface WelcomeFrame {
  readonly kind: 'welcome';
  readonly version: number;
}

export interface RejectFrame {
  readonly kind: 'reject';
  readonly version: number;
  readonly reason: RejectReason;
}

export type WireMessage =
  | IntentFrame
  | SnapshotFrame
  | HashAckFrame
  | AnimFrame
  | ResyncFrame
  | HelloFrame
  | WelcomeFrame
  | RejectFrame;

export type ProtocolErrorCode =
  | 'unknown-type'
  | 'truncated'
  | 'trailing-bytes'
  | 'out-of-range'
  | 'bad-hash'
  | 'too-many-entities'
  | 'version';

export class ProtocolError extends Error {
  constructor(readonly code: ProtocolErrorCode, message: string) {
    super(message);
    this.name = 'ProtocolError';
  }
}

const REASONS: readonly RejectReason[] = ['version', 'malformed', 'rate-limit', 'unauthorized'];
const isAxis = (v: number): v is Axis => v === -1 || v === 0 || v === 1;

/** FNV-1a hashes are 8 lowercase hex chars; the wire carries them as a u32. */
export function hashToU32(hash: string): number {
  if (!/^[0-9a-f]{8}$/.test(hash)) throw new ProtocolError('bad-hash', `hash "${hash}" is not 8 lowercase hex chars`);
  return Number.parseInt(hash, 16) >>> 0;
}

export function u32ToHash(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}

function checkMm(value: number, field: string): number {
  try {
    return toWireMm(value);
  } catch {
    throw new ProtocolError('out-of-range', `${field} ${String(value)} is not an int32 millimetre`);
  }
}

function checkU32(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new ProtocolError('out-of-range', `${field} ${String(value)} is not a u32`);
  }
  return value >>> 0;
}

function checkU16(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new ProtocolError('out-of-range', `${field} ${String(value)} is not a u16`);
  }
  return value;
}

/** Encode one frame. Throws ProtocolError rather than emitting an ambiguous byte string. */
export function encodeFrame(msg: WireMessage): Uint8Array {
  switch (msg.kind) {
    case 'intent': {
      const out = new Uint8Array(INTENT_BYTES);
      const dv = new DataView(out.buffer);
      dv.setUint8(0, FrameType.Intent);
      dv.setUint32(1, checkU32(msg.entity, 'entity'), true);
      dv.setUint32(5, checkU32(msg.seq, 'seq'), true);
      dv.setUint32(9, checkU32(msg.targetTick, 'targetTick'), true);
      dv.setInt8(13, msg.dx);
      dv.setInt8(14, msg.dz);
      return out;
    }
    case 'snapshot': {
      if (msg.entities.length > MAX_ENTITIES) {
        throw new ProtocolError('too-many-entities', `${msg.entities.length} entities > ${MAX_ENTITIES}`);
      }
      const out = new Uint8Array(SNAPSHOT_HEADER_BYTES + msg.entities.length * ENTITY_BYTES);
      const dv = new DataView(out.buffer);
      dv.setUint8(0, FrameType.Snapshot);
      dv.setUint32(1, checkU32(msg.tick, 'tick'), true);
      dv.setUint32(5, checkU32(msg.appliedSeq, 'appliedSeq'), true);
      dv.setUint32(9, hashToU32(msg.hash), true);
      dv.setUint32(13, hashToU32(msg.viewHash), true);
      dv.setUint16(17, msg.entities.length, true);
      let o = SNAPSHOT_HEADER_BYTES;
      for (const e of msg.entities) {
        dv.setUint32(o, checkU32(e.id, 'id'), true);
        dv.setInt32(o + 4, checkMm(e.x, 'x'), true);
        dv.setInt32(o + 8, checkMm(e.z, 'z'), true);
        dv.setInt32(o + 12, checkMm(e.vx, 'vx'), true);
        dv.setInt32(o + 16, checkMm(e.vz, 'vz'), true);
        dv.setUint32(o + 20, checkU32(e.seq, 'seq'), true);
        o += ENTITY_BYTES;
      }
      return out;
    }
    case 'hashack': {
      const out = new Uint8Array(HASH_ACK_BYTES);
      const dv = new DataView(out.buffer);
      dv.setUint8(0, FrameType.HashAck);
      dv.setUint32(1, checkU32(msg.client, 'client'), true);
      dv.setUint32(5, checkU32(msg.tick, 'tick'), true);
      dv.setUint32(9, hashToU32(msg.hash), true);
      return out;
    }
    case 'anim': {
      const stateIndex = ANIM_STATES.indexOf(msg.state);
      if (stateIndex < 0) throw new ProtocolError('out-of-range', `unknown anim state ${String(msg.state)}`);
      if (!Number.isInteger(msg.archetype) || msg.archetype < 0 || msg.archetype > 255) {
        throw new ProtocolError('out-of-range', `archetype ${String(msg.archetype)} is not a u8`);
      }
      const out = new Uint8Array(ANIM_BYTES);
      const dv = new DataView(out.buffer);
      dv.setUint8(0, FrameType.Anim);
      dv.setUint32(1, checkU32(msg.entity, 'entity'), true);
      dv.setUint8(5, msg.archetype);
      dv.setUint8(6, stateIndex);
      dv.setUint16(7, checkU16(msg.clipId, 'clipId'), true);
      dv.setUint32(9, checkU32(msg.transitionTick, 'transitionTick'), true);
      dv.setUint32(13, checkU32(msg.sequence, 'sequence'), true);
      return out;
    }
    case 'resync': {
      const reasonIndex = RESYNC_REASONS.indexOf(msg.reason);
      if (reasonIndex < 0) throw new ProtocolError('out-of-range', `unknown resync reason ${String(msg.reason)}`);
      const out = new Uint8Array(RESYNC_BYTES);
      const dv = new DataView(out.buffer);
      dv.setUint8(0, FrameType.Resync);
      dv.setUint32(1, checkU32(msg.client, 'client'), true);
      dv.setUint32(5, checkU32(msg.tick, 'tick'), true);
      dv.setUint8(9, reasonIndex);
      return out;
    }
    case 'hello': {
      const out = new Uint8Array(HELLO_BYTES);
      const dv = new DataView(out.buffer);
      dv.setUint8(0, FrameType.Hello);
      dv.setUint16(1, checkU16(msg.version, 'version'), true);
      dv.setUint8(3, msg.capabilities & 0xff);
      return out;
    }
    case 'welcome': {
      const out = new Uint8Array(WELCOME_BYTES);
      const dv = new DataView(out.buffer);
      dv.setUint8(0, FrameType.Welcome);
      dv.setUint16(1, checkU16(msg.version, 'version'), true);
      return out;
    }
    case 'reject': {
      const out = new Uint8Array(REJECT_BYTES);
      const dv = new DataView(out.buffer);
      dv.setUint8(0, FrameType.Reject);
      dv.setUint16(1, checkU16(msg.version, 'version'), true);
      dv.setUint8(3, REASONS.indexOf(msg.reason));
      return out;
    }
  }
}

/** Decode one frame. Every length is exact: a trailing byte is a rejected frame, not padding. */
export function decodeFrame(bytes: Uint8Array): WireMessage {
  if (bytes.length < 1) throw new ProtocolError('truncated', 'empty frame');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const type = dv.getUint8(0);

  switch (type) {
    case FrameType.Intent: {
      if (bytes.length !== INTENT_BYTES) throw lengthError(bytes.length, INTENT_BYTES);
      const dx = dv.getInt8(13);
      const dz = dv.getInt8(14);
      if (!isAxis(dx) || !isAxis(dz)) throw new ProtocolError('out-of-range', `axis (${dx},${dz}) is not in {-1,0,1}`);
      return {
        kind: 'intent',
        entity: dv.getUint32(1, true),
        seq: dv.getUint32(5, true),
        targetTick: dv.getUint32(9, true),
        dx,
        dz,
      };
    }
    case FrameType.Snapshot: {
      if (bytes.length < SNAPSHOT_HEADER_BYTES) throw new ProtocolError('truncated', 'snapshot header truncated');
      const count = dv.getUint16(17, true);
      if (count > MAX_ENTITIES) throw new ProtocolError('too-many-entities', `${count} entities > ${MAX_ENTITIES}`);
      const expected = SNAPSHOT_HEADER_BYTES + count * ENTITY_BYTES;
      if (bytes.length !== expected) throw lengthError(bytes.length, expected);
      const entities: EntityState[] = [];
      let o = SNAPSHOT_HEADER_BYTES;
      for (let i = 0; i < count; i++) {
        entities.push({
          id: dv.getUint32(o, true),
          x: dv.getInt32(o + 4, true),
          z: dv.getInt32(o + 8, true),
          vx: dv.getInt32(o + 12, true),
          vz: dv.getInt32(o + 16, true),
          seq: dv.getUint32(o + 20, true),
        });
        o += ENTITY_BYTES;
      }
      return {
        kind: 'snapshot',
        tick: dv.getUint32(1, true),
        appliedSeq: dv.getUint32(5, true),
        hash: u32ToHash(dv.getUint32(9, true)),
        viewHash: u32ToHash(dv.getUint32(13, true)),
        entities,
      };
    }
    case FrameType.HashAck: {
      if (bytes.length !== HASH_ACK_BYTES) throw lengthError(bytes.length, HASH_ACK_BYTES);
      return {
        kind: 'hashack',
        client: dv.getUint32(1, true),
        tick: dv.getUint32(5, true),
        hash: u32ToHash(dv.getUint32(9, true)),
      };
    }
    case FrameType.Anim: {
      if (bytes.length !== ANIM_BYTES) throw lengthError(bytes.length, ANIM_BYTES);
      const state = ANIM_STATES[dv.getUint8(6)];
      if (!state) throw new ProtocolError('out-of-range', `unknown anim state index ${dv.getUint8(6)}`);
      return {
        kind: 'anim',
        entity: dv.getUint32(1, true),
        archetype: dv.getUint8(5),
        state,
        clipId: dv.getUint16(7, true),
        transitionTick: dv.getUint32(9, true),
        sequence: dv.getUint32(13, true),
      };
    }
    case FrameType.Resync: {
      if (bytes.length !== RESYNC_BYTES) throw lengthError(bytes.length, RESYNC_BYTES);
      const reason = RESYNC_REASONS[dv.getUint8(9)];
      if (!reason) throw new ProtocolError('out-of-range', `unknown resync reason index ${dv.getUint8(9)}`);
      return { kind: 'resync', client: dv.getUint32(1, true), tick: dv.getUint32(5, true), reason };
    }
    case FrameType.Hello: {
      if (bytes.length !== HELLO_BYTES) throw lengthError(bytes.length, HELLO_BYTES);
      return { kind: 'hello', version: dv.getUint16(1, true), capabilities: dv.getUint8(3) };
    }
    case FrameType.Welcome: {
      if (bytes.length !== WELCOME_BYTES) throw lengthError(bytes.length, WELCOME_BYTES);
      return { kind: 'welcome', version: dv.getUint16(1, true) };
    }
    case FrameType.Reject: {
      if (bytes.length !== REJECT_BYTES) throw lengthError(bytes.length, REJECT_BYTES);
      const reason = REASONS[dv.getUint8(3)];
      if (!reason) throw new ProtocolError('out-of-range', `unknown reject reason ${dv.getUint8(3)}`);
      return { kind: 'reject', version: dv.getUint16(1, true), reason };
    }
    default:
      throw new ProtocolError('unknown-type', `unknown frame type 0x${type.toString(16)}`);
  }
}

function lengthError(got: number, want: number): ProtocolError {
  return got > want
    ? new ProtocolError('trailing-bytes', `frame is ${got} bytes, expected ${want}`)
    : new ProtocolError('truncated', `frame is ${got} bytes, expected ${want}`);
}

/**
 * Build the snapshot frame of a world state at its tick.
 *
 * `viewEntityId` names the recipient's entity: the frame then carries `viewHash`, the hash that client
 * can reproduce from its own predictions. Without it (tracer, single-entity replay) `viewHash === hash`.
 * `appliedSeq` defaults to the highest seq in the world, but a per-client frame passes the recipient's
 * own seq so the client never replays an intent the server already applied (GDD-NETCODE §7).
 */
export function snapshotFromWorld(
  world: WorldState,
  hash: string,
  viewEntityId?: number,
  appliedSeq?: number,
): SnapshotFrame {
  const own = viewEntityId === undefined ? undefined : world.entities.find((e) => e.id === viewEntityId);
  return {
    kind: 'snapshot',
    tick: world.tick,
    appliedSeq: appliedSeq ?? world.entities.reduce((max, e) => Math.max(max, e.seq), 0),
    hash,
    viewHash: own ? hashEntity(world.tick, own) : hash,
    entities: world.entities,
  };
}

/** Answer a hello. A version outside the supported range is refused with `version`, never coerced. */
export function negotiate(helloVersion: number): WelcomeFrame | RejectFrame {
  if (helloVersion < SUPPORTED_MIN_VERSION || helloVersion > SUPPORTED_MAX_VERSION) {
    return { kind: 'reject', version: PROTOCOL_VERSION, reason: 'version' };
  }
  return { kind: 'welcome', version: PROTOCOL_VERSION };
}
