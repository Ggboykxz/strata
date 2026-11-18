/**
 * Animation state on the wire (NET-006). The 12-byte anim_state from NET-005 plus an entity id and a frame
 * discriminator. No bone transform, joint position or mesh hash crosses the wire (I3 / A0001) — a desync is
 * resolved by resetting to authoritative state, not by sending poses.
 */
import { ANIM_STATE_WIRE_BYTES, type AnimState } from '@strata/core';
import { ANIM_BYTES, decodeFrame, encodeFrame, type ResyncReason } from './binary';

/** Guard: the frame must be exactly the state contract plus entity id and type byte. */
export const ANIM_WIRE_OVERHEAD_BYTES = ANIM_BYTES - ANIM_STATE_WIRE_BYTES;

export interface DecodedAnim {
  readonly entity: number;
  readonly state: AnimState;
}

export function encodeAnimFrame(entity: number, state: AnimState): Uint8Array {
  return encodeFrame({
    kind: 'anim',
    entity,
    archetype: state.archetypeId,
    state: state.state,
    clipId: state.clipId,
    transitionTick: state.transitionTick,
    sequence: state.sequence,
  });
}

/** Returns null when the frame is not an anim frame: a caller never guesses a message kind. */
export function decodeAnimFrame(bytes: Uint8Array): DecodedAnim | null {
  const frame = decodeFrame(bytes);
  if (frame.kind !== 'anim') return null;
  return {
    entity: frame.entity,
    state: {
      archetypeId: frame.archetype,
      state: frame.state,
      clipId: frame.clipId,
      transitionTick: frame.transitionTick,
      sequence: frame.sequence,
    },
  };
}

/** A resync request from the client; the server still owns the snapshot that answers it. */
export function encodeResyncFrame(client: number, tick: number, reason: ResyncReason): Uint8Array {
  return encodeFrame({ kind: 'resync', client, tick, reason });
}
