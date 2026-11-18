/**
 * Ingress message gate (SEC-001). Untrusted bytes pass through the protocol decoder, then a fixed sequence of
 * refusals: kind, version, rate, sequence. A rejection always carries a reason and increments a counter, so an
 * attack is observable instead of silently discarded.
 *
 * This gate is NOT yet wired into `apps/server/src/rooms/ws-adapter.ts`: that remains an open P2NET item and the
 * threat model says so rather than claiming zero unvalidated paths.
 */
import { SUPPORTED_MAX_VERSION, SUPPORTED_MIN_VERSION, decodeFrame, type WireMessage } from '@strata/protocol';
import { RateLimiter } from './rate-limit';

export type RejectionReason =
  | 'malformed'
  | 'unknown-kind'
  | 'wrong-version'
  | 'client-snapshot'
  | 'rate-limited'
  | 'non-monotonic-seq';

export interface GateVerdict {
  readonly allowed: boolean;
  readonly reason?: RejectionReason | undefined;
  readonly message?: WireMessage | undefined;
}

const CLIENT_KINDS = new Set<WireMessage['kind']>(['intent', 'hashack', 'hello', 'resync', 'anim']);

export class MessageGate {
  private readonly lastSeq = new Map<number, number>();
  private readonly rejections = new Map<RejectionReason, number>();
  readonly limiter: RateLimiter;

  constructor(limiter?: RateLimiter) {
    this.limiter = limiter ?? new RateLimiter();
  }

  private reject(reason: RejectionReason): GateVerdict {
    this.rejections.set(reason, (this.rejections.get(reason) ?? 0) + 1);
    return { allowed: false, reason };
  }

  get counts(): ReadonlyMap<RejectionReason, number> { return this.rejections; }
  get rejected(): number { return [...this.rejections.values()].reduce((a, b) => a + b, 0); }

  /** Validate one raw frame from one client at one authoritative tick. */
  accept(client: number, tick: number, bytes: Uint8Array): GateVerdict {
    let message: WireMessage;
    try {
      message = decodeFrame(bytes);
    } catch {
      return this.reject('malformed');
    }

    if (message.kind === 'snapshot') return this.reject('client-snapshot');
    if (!CLIENT_KINDS.has(message.kind)) return this.reject('unknown-kind');
    if (message.kind === 'hello'
      && (message.version < SUPPORTED_MIN_VERSION || message.version > SUPPORTED_MAX_VERSION)) {
      return this.reject('wrong-version');
    }
    if (message.kind === 'intent') {
      if (this.limiter.check(client, tick) === 'rate-limited') return this.reject('rate-limited');
      const previous = this.lastSeq.get(client) ?? 0;
      if (message.seq <= previous) return this.reject('non-monotonic-seq');
      this.lastSeq.set(client, message.seq);
    }
    return { allowed: true, message };
  }

  /** A logout drops sequence and rate state so a stale handle cannot be replayed against old counters. */
  forget(client: number): void {
    this.lastSeq.delete(client);
    this.limiter.reset(client);
  }
}
