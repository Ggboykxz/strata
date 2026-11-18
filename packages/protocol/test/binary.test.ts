import { describe, expect, it } from 'vitest';
import { createWorld, hashWorld, stepWorld } from '@strata/core';
import {
  ENTITY_BYTES, FrameType, HASH_ACK_BYTES, HELLO_BYTES, INTENT_BYTES, MAX_ENTITIES, MAX_FRAME_BYTES,
  PROTOCOL_VERSION, ProtocolError, REJECT_BYTES, SNAPSHOT_HEADER_BYTES, SUPPORTED_MAX_VERSION,
  SUPPORTED_MIN_VERSION, WELCOME_BYTES,
  decodeFrame, encodeFrame, hashToU32, negotiate, snapshotFromWorld, u32ToHash,
  type SnapshotFrame, type WireMessage,
} from '../src/index';

const intent: WireMessage = { kind: 'intent', entity: 7, seq: 42, dx: 1, dz: -1 };
const hashack: WireMessage = { kind: 'hashack', client: 3, tick: 900, hash: 'deadbeef' };
const hello: WireMessage = { kind: 'hello', version: 4, capabilities: 0b1010_0101 };
const welcome: WireMessage = { kind: 'welcome', version: 4 };
const reject: WireMessage = { kind: 'reject', version: 4, reason: 'version' };

function roundTrip(msg: WireMessage): WireMessage {
  return decodeFrame(encodeFrame(msg));
}

function snapshot(entities: SnapshotFrame['entities']): SnapshotFrame {
  return { kind: 'snapshot', tick: 12, appliedSeq: 9, hash: '0a0b0c0d', viewHash: '01020304', entities };
}

describe('binary framing', () => {
  it('declares v4 and supports exactly that version today', () => {
    expect(PROTOCOL_VERSION).toBe(4);
    expect(SUPPORTED_MIN_VERSION).toBe(4);
    expect(SUPPORTED_MAX_VERSION).toBe(4);
  });

  it('packs every frame to its exact declared length', () => {
    expect(encodeFrame(intent).byteLength).toBe(INTENT_BYTES);
    expect(encodeFrame(hashack).byteLength).toBe(HASH_ACK_BYTES);
    expect(encodeFrame(hello).byteLength).toBe(HELLO_BYTES);
    expect(encodeFrame(welcome).byteLength).toBe(WELCOME_BYTES);
    expect(encodeFrame(reject).byteLength).toBe(REJECT_BYTES);
    expect(encodeFrame(snapshot([])).byteLength).toBe(SNAPSHOT_HEADER_BYTES);
    expect(encodeFrame(snapshot([])).byteLength + 2 * ENTITY_BYTES)
      .toBe(encodeFrame(snapshot([
        { id: 1, x: 0, z: 0, vx: 0, vz: 0, seq: 1 },
        { id: 2, x: 1, z: 2, vx: 3, vz: 4, seq: 2 },
      ])).byteLength);
  });

  it('round-trips each message class without loss', () => {
    expect(roundTrip(intent)).toEqual(intent);
    expect(roundTrip(hashack)).toEqual(hashack);
    expect(roundTrip(hello)).toEqual(hello);
    expect(roundTrip(welcome)).toEqual(welcome);
    expect(roundTrip(reject)).toEqual(reject);
  });

  it('round-trips a snapshot, negative millimetres and all', () => {
    const msg = snapshot([
      { id: 1, x: -26_000, z: 26_000, vx: -50, vz: 50, seq: 0xffff_ffff },
      { id: 2, x: 2_147_483_647, z: -2_147_483_647, vx: 0, vz: 0, seq: 1 },
    ]);
    expect(roundTrip(msg)).toEqual(msg);
  });

  it('writes the frame type as the first byte', () => {
    expect(encodeFrame(intent)[0]).toBe(FrameType.Intent);
    expect(encodeFrame(hashack)[0]).toBe(FrameType.HashAck);
    expect(encodeFrame(hello)[0]).toBe(FrameType.Hello);
    expect(encodeFrame(reject)[0]).toBe(FrameType.Reject);
  });
});

describe('strict decoding', () => {
  it('refuses an unknown frame type instead of guessing', () => {
    expect(() => decodeFrame(new Uint8Array([0xff]))).toThrow(ProtocolError);
    try { decodeFrame(new Uint8Array([0xff])); } catch (e) { expect((e as ProtocolError).code).toBe('unknown-type'); }
  });

  it('refuses an empty frame and a truncated one', () => {
    expect(() => decodeFrame(new Uint8Array(0))).toThrow(ProtocolError);
    expect(() => decodeFrame(encodeFrame(intent).slice(0, INTENT_BYTES - 1))).toThrow(ProtocolError);
  });

  it('refuses a trailing byte: a frame is exact, not a prefix', () => {
    const frame = encodeFrame(intent);
    const longer = new Uint8Array(frame.byteLength + 1);
    longer.set(frame);
    try { decodeFrame(longer); } catch (e) { expect((e as ProtocolError).code).toBe('trailing-bytes'); }
    expect(() => decodeFrame(longer)).toThrow(ProtocolError);
  });

  it('refuses a snapshot whose declared count disagrees with its length', () => {
    const frame = encodeFrame(snapshot([]));
    frame[17] = 1; // count = 1, but no entity bytes follow
    expect(() => decodeFrame(frame)).toThrow(ProtocolError);
  });

  it('refuses more than 64 entities, as the AoI cap requires', () => {
    const many = Array.from({ length: MAX_ENTITIES + 1 }, (_, i) => ({
      id: i + 1, x: 0, z: 0, vx: 0, vz: 0, seq: 0,
    }));
    expect(() => encodeFrame(snapshot(many))).toThrow(ProtocolError);
    expect(MAX_FRAME_BYTES).toBe(SNAPSHOT_HEADER_BYTES + MAX_ENTITIES * ENTITY_BYTES);
  });

  it('refuses an axis outside {-1,0,1} on the wire', () => {
    const frame = encodeFrame(intent);
    frame[9] = 5;
    expect(() => decodeFrame(frame)).toThrow(ProtocolError);
  });

  it('refuses a non-integer millimetre at encode time', () => {
    expect(() => encodeFrame(snapshot([{ id: 1, x: 1.5, z: 0, vx: 0, vz: 0, seq: 0 }])))
      .toThrow(ProtocolError);
  });

  it('refuses a coordinate that would overflow int32', () => {
    expect(() => encodeFrame(snapshot([{ id: 1, x: 2_147_483_648, z: 0, vx: 0, vz: 0, seq: 0 }])))
      .toThrow(ProtocolError);
  });

  it('refuses a malformed hash instead of writing a zero', () => {
    expect(() => hashToU32('DEADBEEF')).toThrow(ProtocolError);
    expect(() => hashToU32('deadbee')).toThrow(ProtocolError);
    expect(() => encodeFrame({ ...hashack, hash: 'nope' })).toThrow(ProtocolError);
  });

  it('round-trips a u32 hash in lowercase hex', () => {
    for (const h of ['00000000', '00000001', 'deadbeef', 'ffffffff']) {
      expect(u32ToHash(hashToU32(h))).toBe(h);
    }
  });
});

describe('version handshake', () => {
  it('welcomes the supported version', () => {
    expect(negotiate(4)).toEqual({ kind: 'welcome', version: 4 });
  });

  it('rejects an older and a newer version — never coerces', () => {
    expect(negotiate(3)).toEqual({ kind: 'reject', version: 4, reason: 'version' });
    expect(negotiate(5)).toEqual({ kind: 'reject', version: 4, reason: 'version' });
    expect(negotiate(0)).toEqual({ kind: 'reject', version: 4, reason: 'version' });
  });

  it('round-trips the reject frame it produces', () => {
    expect(roundTrip(negotiate(99))).toEqual({ kind: 'reject', version: 4, reason: 'version' });
  });
});

describe('snapshot from the core world', () => {
  it('carries the hash of the state it describes, so it can be acked', () => {
    const w = stepWorld(createWorld(4, 2), [{ entity: 1, seq: 1, dx: 1, dz: 0 }]);
    const frame = snapshotFromWorld(w, hashWorld(w));
    expect(frame.tick).toBe(w.tick);
    expect(frame.entities).toEqual(w.entities);
    expect(frame.appliedSeq).toBe(1);
    expect(roundTrip(frame)).toEqual(frame);
  });

  it('uses the highest per-entity seq as the header boundary', () => {
    const world = {
      tick: 3,
      entities: [
        { id: 1, x: 0, z: 0, vx: 0, vz: 0, seq: 4 },
        { id: 2, x: 0, z: 0, vx: 0, vz: 0, seq: 9 },
        { id: 3, x: 0, z: 0, vx: 0, vz: 0, seq: 0 },
      ],
    };
    expect(snapshotFromWorld(world, '00000000').appliedSeq).toBe(9);
  });

  it('measures the worst-case frame: 64 entities is 1 555 bytes, over the 12 KB/s budget', () => {
    const entities = Array.from({ length: MAX_ENTITIES }, (_, i) => ({
      id: i + 1, x: i, z: -i, vx: 50, vz: -50, seq: i,
    }));
    const bytes = encodeFrame(snapshot(entities)).byteLength;
    expect(bytes).toBe(1555);
    // 30 Hz full snapshots would be 46 650 B/s. The budget is NET-101's (AoI + delta), not this codec's.
    expect(bytes * 30).toBeGreaterThan(12 * 1024);
  });
});
