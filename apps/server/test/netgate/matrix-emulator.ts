/**
 * Application-level network emulation for the NET-GATE 4-client matrix harness (harness-only code).
 *
 * This is NOT tc/netem and NOT a transport patch: every frame in both directions (client→server and
 * server→client) passes through a `MatrixChannel`, which draws loss and jitter from a seeded LCG and
 * delivers surviving frames with `setTimeout`. Delay math:
 *
 *   oneWayDelayMs(rttMs) = rttMs / 2
 *   jitterDelayMs(jitterMs) = uniform random in [0, jitterMs]
 *   delivery delay = oneWayDelayMs + jitterDelayMs
 *
 * Loss is drawn BEFORE jitter; a dropped frame consumes only the loss draw. Draws happen at
 * `push()` time, in program order, so a given (seed, push sequence) always yields the same drop and
 * jitter sequence. Note that wall-clock `setTimeout` ordering is not guaranteed by the OS, so runs
 * are reproducible in their loss/jitter *decisions*, not in sub-millisecond delivery interleavings.
 *
 * Default emulation seed: 20261118 (matrix runs). World seed: 1337.
 */

export const MATRIX_DEFAULT_SEED = 20261118;
export const MATRIX_WORLD_SEED = 1337;
export const MATRIX_DEFAULT_DURATION_S = 2;

/** Deterministic 32-bit LCG (Numerical Recipes constants). Harness-only; never used by packages/core. */
export class SeededLcg {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  /** Next integer in [0, bound). */
  nextInt(bound: number): number {
    if (!Number.isInteger(bound) || bound < 1) throw new RangeError('bound must be a positive integer');
    return Math.floor(this.next() * bound);
  }

  /** Sub-seed for a direction/index pair, stable across runs. */
  static subSeed(seed: number, stream: number): number {
    return (seed ^ Math.imul(stream + 1, 0x9e3779b9)) >>> 0;
  }
}

export interface MatrixNetConfig {
  /** Round-trip time in ms. One-way delay is RTT/2. */
  readonly rttMs: number;
  /** Packet loss in percent, [0, 100). */
  readonly lossPct: number;
  /** Extra uniform jitter in ms, added in [0, jitterMs]. 0 disables jitter. */
  readonly jitterMs: number;
}

export function oneWayDelayMs(rttMs: number): number {
  if (!Number.isFinite(rttMs) || rttMs < 0) throw new RangeError('rttMs must be a non-negative finite number');
  return rttMs / 2;
}

export function jitterDelayMs(jitterMs: number, random: () => number): number {
  if (!Number.isFinite(jitterMs) || jitterMs < 0) throw new RangeError('jitterMs must be a non-negative finite number');
  return random() * jitterMs;
}

export function isLost(lossPct: number, random: () => number): boolean {
  if (!Number.isFinite(lossPct) || lossPct < 0 || lossPct >= 100) {
    throw new RangeError('lossPct must be in [0, 100)');
  }
  return random() < lossPct / 100;
}

/** Delivery delay for one frame. Loss must be drawn separately via `isLost` first. */
export function packetDelayMs(config: MatrixNetConfig, random: () => number): number {
  return oneWayDelayMs(config.rttMs) + jitterDelayMs(config.jitterMs, random);
}

export interface MatrixChannelStats {
  pushed: number;
  delivered: number;
  dropped: number;
  bytesPushed: number;
  bytesDelivered: number;
}

/**
 * One emulated direction of one link. `push` either drops the frame (loss draw) or schedules its
 * delivery with `setTimeout`. `dispose` clears every pending delivery timer; call it at end of run so
 * no frame is delivered into a closed socket.
 */
export class MatrixChannel {
  private readonly rng: SeededLcg;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private disposed = false;
  readonly stats: MatrixChannelStats = {
    pushed: 0, delivered: 0, dropped: 0, bytesPushed: 0, bytesDelivered: 0,
  };

  constructor(private readonly config: MatrixNetConfig, seed: number) {
    this.rng = new SeededLcg(seed);
  }

  /** Returns true if the frame was scheduled for delivery, false if it was lost. */
  push(bytes: Uint8Array, deliver: (bytes: Uint8Array) => void): boolean {
    if (this.disposed) return false;
    this.stats.pushed += 1;
    this.stats.bytesPushed += bytes.byteLength;
    if (isLost(this.config.lossPct, () => this.rng.next())) {
      this.stats.dropped += 1;
      return false;
    }
    const delay = packetDelayMs(this.config, () => this.rng.next());
    const payload = new Uint8Array(bytes); // copy: callers may reuse buffers
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.disposed) return;
      this.stats.delivered += 1;
      this.stats.bytesDelivered += payload.byteLength;
      deliver(payload);
    }, delay);
    this.timers.add(timer);
    return true;
  }

  /** Frames handed to the channel but not yet delivered (or dropped). */
  get pending(): number {
    return this.timers.size;
  }

  /** Clear all pending deliveries. Idempotent. */
  dispose(): void {
    this.disposed = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
}

/** Encoded-frame byte accounting for one direction of one client link. */
export class ByteMeter {
  private total = 0;
  private frames = 0;

  add(bytes: number): void {
    if (!Number.isFinite(bytes) || bytes < 0) throw new RangeError('bytes must be a non-negative finite number');
    this.total += bytes;
    this.frames += 1;
  }

  get bytes(): number { return this.total; }
  get count(): number { return this.frames; }
  ratePerSecond(seconds: number): number {
    return seconds > 0 ? this.total / seconds : 0;
  }
}

/**
 * Percentile with linear interpolation between closest ranks (numpy "linear" method).
 * `sortedAsc` must be sorted ascending. An empty sample set returns 0.
 */
export function percentile(sortedAsc: readonly number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (!Number.isFinite(p) || p < 0 || p > 100) throw new RangeError('p must be in [0, 100]');
  if (sortedAsc.length === 1) return sortedAsc[0]!;
  const rank = (p / 100) * (sortedAsc.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sortedAsc[lower]!;
  const fraction = rank - lower;
  return sortedAsc[lower]! * (1 - fraction) + sortedAsc[upper]! * fraction;
}

export interface DurationStats {
  readonly count: number;
  readonly min: number;
  readonly mean: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly max: number;
}

/** Summarize a millisecond sample set. An empty set yields all-zero stats with count 0. */
export function summarizeDurations(samples: readonly number[]): DurationStats {
  if (samples.length === 0) {
    return { count: 0, min: 0, mean: 0, p50: 0, p95: 0, p99: 0, max: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    count: sorted.length,
    min: sorted[0]!,
    mean: sum / sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1]!,
  };
}

/** Convert a ws `send()` payload to its bytes. Payload bytes only — ws framing overhead is NOT counted. */
export function toBytes(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return new Uint8Array(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data.slice(0));
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  if (typeof data === 'string') return new TextEncoder().encode(data);
  throw new TypeError(`unsupported ws payload type: ${typeof data}`);
}
