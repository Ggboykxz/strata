/**
 * The animation state machine (NET-005), server-authoritative.
 *
 * IDLE → TRANSITIONING → LOCOMOTION → ACTION → RECOVERY → IDLE, as GDD-ANIM-ARCHITECTURE §6 declares.
 * The client may predict, but only this machine decides: a transition is accepted, queued or refused, and
 * a refusal carries a reason code (GDD §11) so the client snaps back instead of drifting.
 *
 * Determinism: every input is a tick or an integer; there is no clock, no random, no float. A request that
 * arrives while RECOVERY is running is queued for the recovery's last tick, and when two requests compete
 * the smallest (sequence, clipId) wins — the same tie-break GDD §8.4 names.
 */
import { clipById, type Clip, type ClipManifest } from './manifest';

export const ANIM_STATES = ['idle', 'transitioning', 'locomotion', 'action', 'recovery'] as const;
export type AnimStateName = (typeof ANIM_STATES)[number];

/** Blend window between two clips. 2 ticks = 66.7 ms at 30 Hz. */
export const BLEND_TICKS = 2;

/** Recovery window after an action. 3 ticks = 100 ms at 30 Hz. */
export const RECOVERY_TICKS = 3;

/** Fields of the wire payload (GDD §7): u8 archetype + u8 state + u16 clip + u32 tick + u32 seq. */
export const ANIM_STATE_WIRE_BYTES = 12;

export interface AnimState {
  /** 1..255, or 0 before the first clip is accepted. */
  readonly archetypeId: number;
  readonly state: AnimStateName;
  /** 0 when no clip is active. */
  readonly clipId: number;
  /** Tick at which the current clip started. */
  readonly transitionTick: number;
  /** Highest accepted request sequence; the only anti-replay counter the machine needs. */
  readonly sequence: number;
}

export interface AnimRequest {
  readonly clipId: number;
  readonly sequence: number;
}

export interface AnimRuntime {
  readonly anim: AnimState;
  /** At most one queued request, held during recovery. */
  readonly pending: AnimRequest | null;
  /** Tick at which the current phase ends: blend, action or recovery. 0 when stable. */
  readonly untilTick: number;
}

export type RefusalReason =
  | 'malformed'
  | 'unknown-clip'
  | 'wrong-archetype'
  | 'stale-sequence'
  | 'busy';

export type Verdict = 'accepted' | 'queued' | 'refused' | 'changed' | 'unchanged';

export interface StepResult {
  readonly runtime: AnimRuntime;
  readonly verdict: Verdict;
  readonly reason?: RefusalReason;
  /** Tick at which a queued request will be applied. */
  readonly applyAtTick?: number;
}

const refused = (runtime: AnimRuntime, reason: RefusalReason): StepResult => ({ runtime, verdict: 'refused', reason });

const isIntegerIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/** A world with no clip yet. `archetypeId` 0 means "chosen by the first accepted clip". */
export function createAnim(archetypeId = 0): AnimRuntime {
  if (!isIntegerIn(archetypeId, 0, 255)) throw new RangeError('archetypeId must be an integer in 0..255');
  return {
    anim: { archetypeId, state: 'idle', clipId: 0, transitionTick: 0, sequence: 0 },
    pending: null,
    untilTick: 0,
  };
}

function start(clip: Clip, sequence: number, tick: number): AnimRuntime {
  return {
    anim: {
      archetypeId: clip.archetype,
      state: 'transitioning',
      clipId: clip.id,
      transitionTick: tick,
      sequence,
    },
    pending: null,
    untilTick: tick + BLEND_TICKS,
  };
}

/** True when `candidate` should replace `current`: smallest (sequence, clipId) wins. */
function outranks(candidate: AnimRequest, current: AnimRequest): boolean {
  if (candidate.sequence !== current.sequence) return candidate.sequence < current.sequence;
  return candidate.clipId < current.clipId;
}

/**
 * Submit an intent. `tick` is the server tick at which the request is evaluated.
 *
 * Refused: malformed, unknown clip, wrong archetype, stale sequence, or any request during ACTION (the
 * action must finish; there is no cancel). Queued: during RECOVERY, applied at its last tick. Accepted:
 * everything else, and a new clip may replace the blend it is already in.
 */
export function applyRequest(
  runtime: AnimRuntime,
  request: unknown,
  tick: number,
  manifest: ClipManifest,
): StepResult {
  if (!Number.isInteger(tick) || tick < 0) throw new RangeError('tick must be a non-negative integer');

  if (typeof request !== 'object' || request === null) return refused(runtime, 'malformed');
  const raw = request as Record<string, unknown>;
  if (!isIntegerIn(raw.clipId, 1, 65_535) || !isIntegerIn(raw.sequence, 1, 0xffff_ffff)) {
    return refused(runtime, 'malformed');
  }
  const clip = clipById(manifest, raw.clipId);
  if (!clip) return refused(runtime, 'unknown-clip');

  const current = runtime.anim;
  if (current.archetypeId !== 0 && clip.archetype !== current.archetypeId) {
    return refused(runtime, 'wrong-archetype');
  }
  if (raw.sequence <= current.sequence) return refused(runtime, 'stale-sequence');
  if (current.state === 'action') return refused(runtime, 'busy');

  if (current.state === 'recovery') {
    const candidate: AnimRequest = { clipId: raw.clipId, sequence: raw.sequence };
    const pending = runtime.pending === null || outranks(candidate, runtime.pending) ? candidate : runtime.pending;
    return {
      runtime: { ...runtime, pending },
      verdict: 'queued',
      applyAtTick: Math.max(runtime.untilTick, tick),
    };
  }

  return { runtime: start(clip, raw.sequence, tick), verdict: 'accepted' };
}

/**
 * Advance the machine to `tick`. Pure: the same runtime and tick always give the same result.
 *
 * TRANSITIONING ends at its blend tick; an ACTION ends at `transitionTick + durationTicks`; RECOVERY ends
 * `RECOVERY_TICKS` later and applies the queued request on that same tick, or returns to IDLE.
 */
export function advanceAnim(runtime: AnimRuntime, tick: number, manifest: ClipManifest): StepResult {
  if (!Number.isInteger(tick) || tick < 0) throw new RangeError('tick must be a non-negative integer');
  const current = runtime.anim;
  if (tick < current.transitionTick) throw new RangeError('tick cannot precede the current transition');

  switch (current.state) {
    case 'idle':
    case 'locomotion':
      return { runtime, verdict: 'unchanged' };

    case 'transitioning': {
      if (tick < runtime.untilTick) return { runtime, verdict: 'unchanged' };
      const clip = clipById(manifest, current.clipId);
      if (!clip) throw new Error(`anim: active clip ${current.clipId} is not in the manifest`);
      const actionEnd = current.transitionTick + clip.durationTicks;
      if (clip.kind === 'locomotion') {
        return {
          runtime: { ...runtime, anim: { ...current, state: 'locomotion' }, untilTick: 0 },
          verdict: 'changed',
        };
      }
      if (tick >= actionEnd) {
        return {
          runtime: { ...runtime, anim: { ...current, state: 'recovery' }, untilTick: actionEnd + RECOVERY_TICKS },
          verdict: 'changed',
        };
      }
      return {
        runtime: { ...runtime, anim: { ...current, state: 'action' }, untilTick: actionEnd },
        verdict: 'changed',
      };
    }

    case 'action': {
      if (tick < runtime.untilTick) return { runtime, verdict: 'unchanged' };
      return {
        runtime: { ...runtime, anim: { ...current, state: 'recovery' }, untilTick: runtime.untilTick + RECOVERY_TICKS },
        verdict: 'changed',
      };
    }

    case 'recovery': {
      if (tick < runtime.untilTick) return { runtime, verdict: 'unchanged' };
      const pending = runtime.pending;
      if (pending !== null) {
        const clip = clipById(manifest, pending.clipId);
        if (!clip) throw new Error(`anim: queued clip ${pending.clipId} is not in the manifest`);
        return { runtime: start(clip, pending.sequence, tick), verdict: 'changed' };
      }
      return {
        runtime: {
          anim: { ...current, state: 'idle', clipId: 0, transitionTick: tick },
          pending: null,
          untilTick: 0,
        },
        verdict: 'changed',
      };
    }
  }
}

/** Tick at which the current action or blend ends, for a caller that schedules events. */
export function phaseEndsAt(runtime: AnimRuntime): number {
  return runtime.untilTick;
}
