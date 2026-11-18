/**
 * Server anim validation (NET-006). Every transition a client requests is checked against the NET-005 machine
 * held on the server; an illegal request is refused with a reason and never mutates the authoritative runtime.
 */
import {
  applyRequest, advanceAnim, createAnim,
  type AnimState, type RefusalReason, type Verdict, type ClipManifest,
} from '@strata/core';

export interface AnimVerdict {
  readonly verdict: Verdict;
  readonly reason?: RefusalReason | undefined;
  readonly applyAtTick?: number | undefined;
}

export class AnimAuthority {
  private readonly runtimes = new Map<number, ReturnType<typeof createAnim>>();

  constructor(readonly manifest: ClipManifest) {}

  runtime(entity: number): ReturnType<typeof createAnim> {
    let runtime = this.runtimes.get(entity);
    if (!runtime) {
      runtime = createAnim();
      this.runtimes.set(entity, runtime);
    }
    return runtime;
  }

  /** Validate an untrusted request. The server ignores a client's claimed state entirely (I1). */
  request(entity: number, request: unknown, tick: number): AnimVerdict {
    const runtime = this.runtime(entity);
    const result = applyRequest(runtime, request, tick, this.manifest);
    if (result.verdict === 'accepted' || result.verdict === 'queued') {
      this.runtimes.set(entity, result.runtime);
    }
    return { verdict: result.verdict, reason: result.reason, applyAtTick: result.applyAtTick };
  }

  /** Advance every authoritative runtime by one tick. Pure per runtime, no clock here. */
  advance(tick: number): void {
    for (const [entity, runtime] of this.runtimes) {
      const result = advanceAnim(runtime, tick, this.manifest);
      if (result.verdict === 'changed') this.runtimes.set(entity, result.runtime);
    }
  }

  stateOf(entity: number): AnimState | null {
    return this.runtimes.get(entity)?.anim ?? null;
  }
}
