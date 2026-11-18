/**
 * PR-N1 local load harness (A0005). Measures the code path the server actually uses: stepWorld -> hashWorld ->
 * snapshot encode. It is a LOCAL simulation CPU and framed-byte measurement — not network RTT, not a 30-minute
 * soak, not a claim about real clients. Numbers are labelled as such in the report.
 */
import { performance } from 'node:perf_hooks';
import {
  createWorld, stepWorld, hashWorld, type MoveCommand, type WorldState,
} from '../../../packages/core/src/index';
import {
  MAX_FRAME_BYTES, decodeFrame, encodeFrame, snapshotFromWorld,
} from '../../../packages/protocol/src/index';

export const TICK_HZ = 30;
export const WIRE_BUDGET_BYTES_PER_SECOND = 12 * 1024;

export interface LoadReport {
  readonly ticks: number;
  readonly warmup_ticks: number;
  readonly entities: number;
  readonly tick_cpu_p50_ms: number;
  readonly tick_cpu_p95_ms: number;
  readonly snapshot_bytes: number;
  readonly snapshot_bytes_per_second: number;
  readonly budget_bytes_per_second: number;
  readonly over_budget_factor: number;
  readonly deterministic: boolean;
  readonly label: string;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Number(sorted[Math.max(0, index)]!.toFixed(4));
}

/** Run a deterministic script. Same seed + same script always gives the same report hash chain. */
export function runLoad(ticks = 600, entities = 64, warmupTicks = 30): LoadReport {
  if (!Number.isInteger(ticks) || ticks < 2 || !Number.isInteger(entities) || entities < 1
    || !Number.isInteger(warmupTicks) || warmupTicks < 0 || warmupTicks >= ticks) {
    throw new RangeError('invalid load parameters');
  }
  let world: WorldState = createWorld(1337, entities);
  const durations: number[] = [];
  let previousHash = hashWorld(world);
  let deterministic = true;
  let snapshotBytes = 0;

  for (let tick = 1; tick <= ticks; tick++) {
    const commands: MoveCommand[] = [];
    for (let entity = 1; entity <= entities; entity++) {
      commands.push({
        entity,
        seq: tick,
        dx: ((tick + entity) % 3 === 0 ? 1 : 0) as -1 | 0 | 1,
        dz: ((tick + entity) % 5 === 0 ? -1 : 0) as -1 | 0 | 1,
      });
    }
    const started = performance.now();
    world = stepWorld(world, commands);
    const hash = hashWorld(world);
    const frame = encodeFrame(snapshotFromWorld(world, hash));
    const elapsed = performance.now() - started;
    if (tick > warmupTicks) durations.push(elapsed);
    snapshotBytes = frame.byteLength;
    if (frame.byteLength > MAX_FRAME_BYTES) deterministic = false;
    const decoded = decodeFrame(frame);
    if (decoded.kind !== 'snapshot' || decoded.hash !== hash || hash === previousHash) deterministic = false;
    previousHash = hash;
  }

  const sorted = durations.sort((a, b) => a - b);
  const bytesPerSecond = snapshotBytes * TICK_HZ;
  return {
    ticks,
    warmup_ticks: warmupTicks,
    entities,
    tick_cpu_p50_ms: percentile(sorted, 50),
    tick_cpu_p95_ms: percentile(sorted, 95),
    snapshot_bytes: snapshotBytes,
    snapshot_bytes_per_second: bytesPerSecond,
    budget_bytes_per_second: WIRE_BUDGET_BYTES_PER_SECOND,
    over_budget_factor: Number((bytesPerSecond / WIRE_BUDGET_BYTES_PER_SECOND).toFixed(2)),
    deterministic,
    label: 'local simulation CPU and framed byte rates — NOT network RTT, NOT a 30-minute soak',
  };
}
