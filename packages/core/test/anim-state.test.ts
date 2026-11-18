import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ANIM_STATES, BLEND_TICKS, CLIP_EVENT_KINDS, CLIP_KINDS, ManifestError, RECOVERY_TICKS,
  advanceAnim, applyRequest, clipById, createAnim, eventsAt, loadManifest,
  type AnimRuntime, type ClipManifest,
} from '../src/index';

const EXAMPLE_URL = new URL('../../content/animations/examples/humanoid.greybox.v1.json', import.meta.url);
const SCHEMA_URL = new URL('../../content/animations/schema/anim_manifest.v1.schema.json', import.meta.url);

const example = loadManifest(JSON.parse(readFileSync(EXAMPLE_URL, 'utf8')) as unknown);

function manifestOf(clips: readonly Record<string, unknown>[]): ClipManifest {
  return loadManifest({ version: 1, clips });
}

const clip = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 1, archetype: 1, kind: 'locomotion', durationTicks: 24, loop: true, events: [], ...over,
});

function freeze(rt: AnimRuntime): string {
  return JSON.stringify(rt);
}

describe('clip manifest', () => {
  it('loads the checked-in greybox manifest', () => {
    expect(example.version).toBe(1);
    expect(example.clips.map((c) => c.id)).toEqual([1, 2, 3]);
    expect(clipById(example, 3)?.kind).toBe('action');
    expect(clipById(example, 99)).toBeUndefined();
  });

  it('refuses a wrong version or an empty clip list', () => {
    expect(() => loadManifest({ version: 2, clips: [clip()] })).toThrow(ManifestError);
    expect(() => loadManifest({ version: 1, clips: [] })).toThrow(ManifestError);
    expect(() => loadManifest(null)).toThrow(ManifestError);
  });

  it('refuses a duplicate clip id instead of picking one', () => {
    try {
      manifestOf([clip(), clip()]);
      expect.unreachable('duplicate id accepted');
    } catch (e) {
      expect((e as ManifestError).code).toBe('duplicate-id');
    }
  });

  it('refuses an incoherent loop flag: locomotion loops, action does not', () => {
    expect(() => manifestOf([clip({ loop: false })])).toThrow(ManifestError);
    expect(() => manifestOf([clip({ kind: 'action', loop: true })])).toThrow(ManifestError);
  });

  it('refuses an event beyond the clip, or an unordered event pair', () => {
    expect(() => manifestOf([clip({ durationTicks: 10, events: [{ tick: 10, kind: 'hit' }] })])).toThrow(ManifestError);
    expect(() => manifestOf([clip({ events: [{ tick: 5, kind: 'hit' }, { tick: 5, kind: 'hit' }] })])).toThrow(ManifestError);
    expect(() => manifestOf([clip({ events: [{ tick: 6, kind: 'hit' }, { tick: 5, kind: 'hit' }] })])).toThrow(ManifestError);
  });

  it('refuses an id, archetype or duration outside the declared integers', () => {
    expect(() => manifestOf([clip({ id: 0 })])).toThrow(ManifestError);
    expect(() => manifestOf([clip({ id: 65_536 })])).toThrow(ManifestError);
    expect(() => manifestOf([clip({ archetype: 256 })])).toThrow(ManifestError);
    expect(() => manifestOf([clip({ durationTicks: 601 })])).toThrow(ManifestError);
    expect(() => manifestOf([clip({ durationTicks: 1.5 })])).toThrow(ManifestError);
  });

  it('publishes a JSON Schema whose enums match the code', () => {
    const schema = JSON.parse(readFileSync(SCHEMA_URL, 'utf8')) as {
      $defs: Record<string, { enum?: string[]; required?: string[] }>;
    };
    expect(schema.$defs.state?.enum).toEqual([...ANIM_STATES]);
    expect(schema.$defs.clipKind?.enum).toEqual([...CLIP_KINDS]);
    expect(schema.$defs.eventKind?.enum).toEqual([...CLIP_EVENT_KINDS]);
    expect([...(schema.$defs.clip?.required ?? [])].sort())
      .toEqual(['archetype', 'durationTicks', 'events', 'id', 'kind', 'loop']);
  });
});

describe('animation state machine', () => {
  it('starts idle with no clip', () => {
    const rt = createAnim(1);
    expect(rt.anim).toEqual({ archetypeId: 1, state: 'idle', clipId: 0, transitionTick: 0, sequence: 0 });
    expect(rt.pending).toBeNull();
  });

  it('goes IDLE → TRANSITIONING → LOCOMOTION at the blend tick', () => {
    const accepted = applyRequest(createAnim(1), { clipId: 1, sequence: 1 }, 10, example);
    expect(accepted.verdict).toBe('accepted');
    expect(accepted.runtime.anim.state).toBe('transitioning');
    expect(accepted.runtime.untilTick).toBe(10 + BLEND_TICKS);

    expect(advanceAnim(accepted.runtime, 11, example).runtime.anim.state).toBe('transitioning');
    const moving = advanceAnim(accepted.runtime, 12, example);
    expect(moving.verdict).toBe('changed');
    expect(moving.runtime.anim.state).toBe('locomotion');
    expect(moving.runtime.untilTick).toBe(0);
  });

  it('runs ACTION → RECOVERY → IDLE on the exact ticks', () => {
    const start = applyRequest(createAnim(1), { clipId: 3, sequence: 1 }, 100, example).runtime;
    const action = advanceAnim(start, 102, example).runtime;
    expect(action.anim.state).toBe('action');
    expect(action.untilTick).toBe(115); // 100 + duration 15

    expect(advanceAnim(action, 114, example).runtime.anim.state).toBe('action');
    const recovery = advanceAnim(action, 115, example).runtime;
    expect(recovery.anim.state).toBe('recovery');
    expect(recovery.untilTick).toBe(115 + RECOVERY_TICKS);

    const idle = advanceAnim(recovery, 118, example).runtime;
    expect(idle.anim.state).toBe('idle');
    expect(idle.anim.clipId).toBe(0);
  });

  it('refuses a new request during ACTION: an action is not cancelling', () => {
    const start = applyRequest(createAnim(1), { clipId: 3, sequence: 1 }, 0, example).runtime;
    const action = advanceAnim(start, 2, example).runtime;
    const out = applyRequest(action, { clipId: 1, sequence: 2 }, 3, example);
    expect(out.verdict).toBe('refused');
    expect(out.reason).toBe('busy');
    expect(out.runtime).toEqual(action);
  });

  it('queues a request during RECOVERY and applies it on the last recovery tick', () => {
    const start = applyRequest(createAnim(1), { clipId: 3, sequence: 1 }, 0, example).runtime;
    const recovery = advanceAnim(advanceAnim(start, 2, example).runtime, 15, example).runtime;
    expect(recovery.anim.state).toBe('recovery');

    const queued = applyRequest(recovery, { clipId: 1, sequence: 2 }, 16, example);
    expect(queued.verdict).toBe('queued');
    expect(queued.applyAtTick).toBe(18);
    expect(queued.runtime.anim.state).toBe('recovery');

    const resumed = advanceAnim(queued.runtime, 18, example).runtime;
    expect(resumed.anim.state).toBe('transitioning');
    expect(resumed.anim.clipId).toBe(1);
    expect(resumed.anim.transitionTick).toBe(18);
    expect(resumed.pending).toBeNull();
  });

  it('breaks a queue tie by (sequence, clipId), smallest wins', () => {
    const start = applyRequest(createAnim(1), { clipId: 3, sequence: 1 }, 0, example).runtime;
    const recovery = advanceAnim(advanceAnim(start, 2, example).runtime, 15, example).runtime;

    const first = applyRequest(recovery, { clipId: 2, sequence: 7 }, 16, example);
    const betterSequence = applyRequest(first.runtime, { clipId: 2, sequence: 6 }, 16, example);
    expect(betterSequence.runtime.pending).toEqual({ clipId: 2, sequence: 6 });

    const betterClip = applyRequest(betterSequence.runtime, { clipId: 1, sequence: 6 }, 16, example);
    expect(betterClip.runtime.pending).toEqual({ clipId: 1, sequence: 6 });

    const worseClip = applyRequest(betterClip.runtime, { clipId: 3, sequence: 6 }, 16, example);
    expect(worseClip.runtime.pending).toEqual({ clipId: 1, sequence: 6 });
  });

  it('refuses a stale sequence, an unknown clip and a malformed request', () => {
    const rt = applyRequest(createAnim(1), { clipId: 1, sequence: 5 }, 0, example).runtime;
    expect(applyRequest(rt, { clipId: 2, sequence: 5 }, 1, example).reason).toBe('stale-sequence');
    expect(applyRequest(rt, { clipId: 4, sequence: 6 }, 1, example).reason).toBe('unknown-clip');
    expect(applyRequest(rt, null, 1, example).reason).toBe('malformed');
    expect(applyRequest(rt, { clipId: 1.5, sequence: 6 }, 1, example).reason).toBe('malformed');
    expect(applyRequest(rt, { clipId: 1, sequence: 0 }, 1, example).reason).toBe('malformed');
  });

  it('refuses a clip from another archetype', () => {
    const foreign = manifestOf([clip({ id: 9, archetype: 2 })]);
    const out = applyRequest(createAnim(1), { clipId: 9, sequence: 1 }, 0, foreign);
    expect(out.verdict).toBe('refused');
    expect(out.reason).toBe('wrong-archetype');
  });

  it('accepts the first clip as the archetype when none is set', () => {
    const out = applyRequest(createAnim(0), { clipId: 2, sequence: 1 }, 0, example);
    expect(out.verdict).toBe('accepted');
    expect(out.runtime.anim.archetypeId).toBe(1);
  });

  it('lets a new clip replace the blend it is already in', () => {
    const first = applyRequest(createAnim(1), { clipId: 1, sequence: 1 }, 0, example).runtime;
    const second = applyRequest(first, { clipId: 2, sequence: 2 }, 1, example);
    expect(second.verdict).toBe('accepted');
    expect(second.runtime.anim.clipId).toBe(2);
    expect(second.runtime.untilTick).toBe(1 + BLEND_TICKS);
  });

  it('does not mutate its input: the runtime is a value', () => {
    const rt = applyRequest(createAnim(1), { clipId: 3, sequence: 1 }, 0, example).runtime;
    const before = freeze(rt);
    advanceAnim(rt, 2, example);
    applyRequest(rt, { clipId: 1, sequence: 2 }, 3, example);
    expect(freeze(rt)).toBe(before);
  });

  it('rejects a tick before the current transition', () => {
    const rt = applyRequest(createAnim(1), { clipId: 1, sequence: 1 }, 10, example).runtime;
    expect(() => advanceAnim(rt, 9, example)).toThrow(RangeError);
  });

  it('handles an action shorter than the blend window', () => {
    const short = manifestOf([clip({ id: 4, kind: 'action', loop: false, durationTicks: 1 })]);
    const rt = applyRequest(createAnim(1), { clipId: 4, sequence: 1 }, 0, short).runtime;
    const out = advanceAnim(rt, BLEND_TICKS, short).runtime;
    expect(out.anim.state).toBe('recovery');
    expect(out.untilTick).toBe(1 + RECOVERY_TICKS);
  });
});

describe('clip events', () => {
  it('fires a hit frame at the absolute tick the server schedules', () => {
    expect(eventsAt(example, 3, 100, 105)).toEqual([]);
    expect(eventsAt(example, 3, 100, 106)).toEqual([{ tick: 106, kind: 'hit' }]);
  });

  it('fires a footstep twice per locomotion loop, and nothing for an unknown clip', () => {
    expect(eventsAt(example, 1, 30, 30)).toEqual([{ tick: 30, kind: 'footstep' }]);
    expect(eventsAt(example, 1, 30, 42)).toEqual([{ tick: 42, kind: 'footstep' }]);
    expect(eventsAt(example, 1, 30, 31)).toEqual([]);
    expect(eventsAt(example, 99, 0, 0)).toEqual([]);
  });
});
