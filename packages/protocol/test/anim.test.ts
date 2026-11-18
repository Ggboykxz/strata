import { describe, expect, it } from 'vitest';
import { ANIM_STATE_WIRE_BYTES, ANIM_STATES, applyRequest, createAnim } from '@strata/core';
import { loadManifest } from '@strata/core';
import {
  ANIM_BYTES, ANIM_WIRE_OVERHEAD_BYTES, RESYNC_BYTES, decodeFrame, encodeAnimFrame,
  encodeResyncFrame, decodeAnimFrame, negotiate,
} from '../src/index';

const manifest = loadManifest({
  version: 1,
  clips: [{ id: 3, archetype: 1, kind: 'action', durationTicks: 15, loop: false, events: [{ tick: 6, kind: 'hit' }] }],
});

describe('anim wire v3', () => {
  it('carries the 12-byte state plus a type byte and entity id — no bones', () => {
    expect(ANIM_BYTES).toBe(ANIM_STATE_WIRE_BYTES + 5);
    expect(ANIM_WIRE_OVERHEAD_BYTES).toBe(5);
  });

  it('round-trips a real authoritative anim state', () => {
    const runtime = applyRequest(createAnim(1), { clipId: 3, sequence: 7 }, 12, manifest).runtime;
    const bytes = encodeAnimFrame(4, runtime.anim);
    expect(bytes.byteLength).toBe(ANIM_BYTES);
    expect(decodeAnimFrame(bytes)).toEqual({ entity: 4, state: runtime.anim });
    expect(decodeFrame(bytes)).toMatchObject({ kind: 'anim', entity: 4, state: 'transitioning', sequence: 7 });
  });

  it('returns null when a frame is not an anim frame', () => {
    expect(decodeAnimFrame(encodeResyncFrame(1, 2, 'hash-mismatch'))).toBeNull();
  });

  it('round-trips a resync request and refuses an unknown reason on decode', () => {
    const frame = encodeResyncFrame(9, 41, 'missing-entity');
    expect(frame.byteLength).toBe(RESYNC_BYTES);
    expect(decodeFrame(frame)).toEqual({ kind: 'resync', client: 9, tick: 41, reason: 'missing-entity' });
    const bad = new Uint8Array(frame);
    bad[9] = 99;
    expect(() => decodeFrame(bad)).toThrow();
  });

  it('refuses a v2 peer instead of silently interoperating', () => {
    expect(negotiate(2)).toMatchObject({ kind: 'reject', reason: 'version' });
    expect(negotiate(3)).toMatchObject({ kind: 'welcome', version: 3 });
    expect(ANIM_STATES).toHaveLength(5);
  });
});
