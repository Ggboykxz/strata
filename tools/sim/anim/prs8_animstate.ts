/**
 * PR-S8 greybox anim fuzz: 10 000 deterministic requests against the authoritative core machine. Illegal requests
 * are refused with a reason and must leave the runtime byte-identical. Hit frames are derived on the server only.
 */
import {
  applyRequest, advanceAnim, createAnim, eventsAt, loadManifest,
  type AnimRuntime,
} from '../../../packages/core/src/index';

export const FUZZ_REQUESTS = 10_000;

export interface AnimFuzzReport {
  readonly requests: number;
  readonly accepted: number;
  readonly queued: number;
  readonly refused: number;
  readonly illegal_refusals: number;
  readonly mutations_on_refusal: number;
  readonly hits: number;
  readonly deterministic: boolean;
  readonly label: string;
}

const manifest = loadManifest({
  version: 1,
  clips: [
    { id: 1, archetype: 1, kind: 'locomotion', durationTicks: 24, loop: true, events: [{ tick: 0, kind: 'footstep' }] },
    { id: 3, archetype: 1, kind: 'action', durationTicks: 15, loop: false, events: [{ tick: 6, kind: 'hit' }] },
    { id: 8, archetype: 2, kind: 'action', durationTicks: 12, loop: false, events: [{ tick: 4, kind: 'hit' }] },
  ],
});

function run() {
  let runtime: AnimRuntime = createAnim();
  let sequence = 0;
  let accepted = 0;
  let queued = 0;
  let refused = 0;
  let illegal = 0;
  let mutationsOnRefusal = 0;
  let hits = 0;
  let actionStartTick = -1;

  for (let index = 0; index < FUZZ_REQUESTS; index++) {
    const mode = index % 4;
    const request: unknown = mode === 0
      ? { clipId: index % 3 === 0 ? 3 : 1, sequence: ++sequence }
      : mode === 1
        ? { clipId: 1, sequence: Math.max(1, sequence - 1) }
        : mode === 2
          ? { clipId: 99, sequence: ++sequence }
          : { clipId: 8, sequence: ++sequence };
    const before = JSON.stringify(runtime.anim);
    const verdict = applyRequest(runtime, request, index, manifest);
    if (verdict.verdict === 'accepted' || verdict.verdict === 'queued') {
      runtime = verdict.runtime;
      if (verdict.verdict === 'accepted') {
        accepted++;
        if (request && typeof request === 'object' && (request as { clipId?: number }).clipId === 3) {
          actionStartTick = index;
        }
      } else queued++;
    } else {
      refused++;
      if (mode === 1 || mode === 2 || mode === 3) illegal++;
      if (JSON.stringify(runtime.anim) !== before) mutationsOnRefusal++;
    }

    if (index % 30 === 0) {
      const advanced = advanceAnim(runtime, index, manifest);
      if (advanced.verdict === 'changed') runtime = advanced.runtime;
    }
    // Server-side hit frames are observed at every tick, not only on a sparse sample.
    if (actionStartTick >= 0) {
      hits += eventsAt(manifest, 3, actionStartTick, index)
        .filter((event) => event.tick === index && event.kind === 'hit').length;
    }
  }
  return { accepted, queued, refused, illegal, mutationsOnRefusal, hits };
}

export function runAnimFuzz(): AnimFuzzReport {
  const a = run();
  const b = run();
  return {
    requests: FUZZ_REQUESTS,
    accepted: a.accepted,
    queued: a.queued,
    refused: a.refused,
    illegal_refusals: a.illegal,
    mutations_on_refusal: a.mutationsOnRefusal,
    hits: a.hits,
    deterministic: JSON.stringify(a) === JSON.stringify(b),
    label: 'local greybox anim fuzz — not a playtest',
  };
}
