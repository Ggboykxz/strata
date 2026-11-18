/**
 * netgate_wire.ts — deterministic 64-entity AoI + delta measurement (prototype only).
 *
 * This harness answers one question: if a client's downlink were filtered by the D90 32 m AoI and
 * delta-compressed against an acknowledged keyframe, how many bytes per second would cross the wire at
 * 30 Hz, and does that clear the master §6 budgets? It measures framed bytes exactly; it is not RTT, not
 * a socket test, and not a 30-minute soak. NET-101 owns the production wire change.
 *
 * The world is `createWorld(1337, 64)`, the same world PR-N1 measured at 1 551 B per full snapshot, so
 * the control is directly comparable. Two activity scripts bracket the answer:
 *   - `dense`: every one of the 64 entities receives the PR-N1 intent every tick (upper bound);
 *   - `four-client`: only the four client-owned entities move, the other 60 are idle (lower bound).
 */
import {
  TICK_HZ,
  createWorld,
  hashWorld,
  stepWorld,
  type Axis,
  type EntityState,
  type MoveCommand,
  type WorldState,
} from '../../../packages/core/src/index';
import {
  HASH_ACK_BYTES,
  INTENT_BYTES,
  encodeFrame,
  snapshotFromWorld,
} from '../../../packages/protocol/src/index';
import {
  AOI_RADIUS_MM,
  applyDeltaFrame,
  aoiSnapshotFor,
  baselineFromSnapshot,
  buildDelta,
  buildKeyframe,
  encodeDeltaFrame,
  type AoiSnapshot,
  type DeltaBaseline,
  type DeltaFrame,
} from '../../../packages/protocol/src/index';

export const WORLD_SEED = 1337;
export const ENTITY_COUNT = 64;
export const CLIENT_ENTITY_IDS = [1, 2, 3, 4] as const;
export const MEASURE_TICKS = 600;
export const KEYFRAME_INTERVAL_TICKS = 60;
export const ACK_DELAY_TICKS = 1;
export const DOWN_BUDGET_BYTES_PER_SECOND = 12 * 1024;
export const UP_BUDGET_BYTES_PER_SECOND = 3 * 1024;

export type MovementScenario = 'dense' | 'four-client';
export type FrameKind = 'keyframe' | 'delta';
export type DropSchedule = (tick: number, clientId: number, kind: FrameKind) => boolean;

export interface RateStats {
  readonly bestBytesPerSecond: number;
  readonly averageBytesPerSecond: number;
  readonly worstBytesPerSecond: number;
}

export interface ClientControlStats {
  readonly clientId: number;
  readonly downBytes: number;
  readonly downBytesPerSecond: number;
  readonly upBytes: number;
  readonly upBytesPerSecond: number;
  readonly frames: number;
  readonly intents: number;
  readonly acks: number;
}

export interface ControlReport {
  readonly perClient: readonly ClientControlStats[];
  readonly down: RateStats;
  readonly up: RateStats;
  readonly fullSnapshotBytes: number;
  readonly maxFrameBytes: number;
}

export interface ClientTreatmentStats {
  readonly clientId: number;
  readonly downBytes: number;
  readonly downBytesPerSecond: number;
  readonly upBytes: number;
  readonly upBytesPerSecond: number;
  readonly keyframes: number;
  readonly deltaFrames: number;
  readonly emptyDeltas: number;
  readonly keyframeRetries: number;
  readonly framesSent: number;
  readonly framesDropped: number;
  readonly framesReceived: number;
  readonly maxFrameBytes: number;
  readonly intents: number;
  readonly acks: number;
  readonly desyncs: number;
  readonly finalViewHash: string;
  readonly finalServerHash: string;
}

export interface TreatmentReport {
  readonly perClient: readonly ClientTreatmentStats[];
  readonly down: RateStats;
  readonly up: RateStats;
  readonly desyncs: number;
  readonly allFinalHashesMatch: boolean;
}

export interface ImprovementReport {
  readonly downBestPercent: number;
  readonly downAveragePercent: number;
  readonly downWorstPercent: number;
  readonly upAveragePercent: number;
}

export interface BudgetReport {
  readonly downBytesPerSecond: number;
  readonly upBytesPerSecond: number;
  readonly downMetBest: boolean;
  readonly downMetAverage: boolean;
  readonly downMetWorst: boolean;
  readonly upMetBest: boolean;
  readonly upMetAverage: boolean;
  readonly upMetWorst: boolean;
}

export interface ScenarioReport {
  readonly scenario: MovementScenario;
  readonly ticks: number;
  readonly seconds: number;
  readonly tickHz: number;
  readonly entities: number;
  readonly clients: readonly number[];
  readonly keyframeIntervalTicks: number;
  readonly aoiRadiusMm: number;
  readonly control: ControlReport;
  readonly treatment: TreatmentReport;
  readonly improvement: ImprovementReport;
  readonly budget: BudgetReport;
}

export interface WireMeasurementReport {
  readonly tool: string;
  readonly label: string;
  readonly generatedFromSeed: number;
  readonly ticks: number;
  readonly tickHz: number;
  readonly entities: number;
  readonly clients: readonly number[];
  readonly keyframeIntervalTicks: number;
  readonly budgets: {
    readonly downBytesPerSecond: number;
    readonly upBytesPerSecond: number;
  };
  readonly scenarios: readonly ScenarioReport[];
}

function rate(bytes: number, seconds: number): number {
  return Number((bytes / seconds).toFixed(4));
}

function rateStats(values: readonly number[]): RateStats {
  if (values.length === 0) throw new RangeError('rate stats need at least one client');
  let best = values[0]!;
  let worst = values[0]!;
  let total = 0;
  for (const value of values) {
    if (value < best) best = value;
    if (value > worst) worst = value;
    total += value;
  }
  return {
    bestBytesPerSecond: best,
    averageBytesPerSecond: Number((total / values.length).toFixed(4)),
    worstBytesPerSecond: worst,
  };
}

function percent(before: number, after: number): number {
  if (before === 0) return 0;
  return Number((((before - after) / before) * 100).toFixed(4));
}

function movementCommands(scenario: MovementScenario, tick: number): MoveCommand[] {
  const ids: readonly number[] = scenario === 'dense'
    ? Array.from({ length: ENTITY_COUNT }, (_unused, index) => index + 1)
    : CLIENT_ENTITY_IDS;
  return ids.map((entity) => ({
    entity,
    seq: tick,
    dx: ((tick + entity) % 3 === 0 ? 1 : 0) as Axis,
    dz: ((tick + entity) % 5 === 0 ? -1 : 0) as Axis,
  }));
}

/** Build the deterministic world chain. Same seed + same script + same tick count = same states. */
export function buildWorlds(scenario: MovementScenario, ticks = MEASURE_TICKS): readonly WorldState[] {
  if (!Number.isInteger(ticks) || ticks < 1) throw new RangeError('ticks must be a positive integer');
  let world = createWorld(WORLD_SEED, ENTITY_COUNT);
  const worlds: WorldState[] = [];
  for (let tick = 1; tick <= ticks; tick += 1) {
    world = stepWorld(world, movementCommands(scenario, tick));
    worlds.push(world);
  }
  return worlds;
}

/**
 * Control: the current binary codec, full 64-entity snapshot every tick, for every client. This is the
 * same 1 551 B frame PR-N1 measured, so the control is comparable rather than re-derived.
 */
export function measureControl(worlds: readonly WorldState[]): ControlReport {
  if (worlds.length < 1) throw new RangeError('control needs at least one tick');
  let totalFrameBytes = 0;
  let maxFrameBytes = 0;
  for (const world of worlds) {
    const bytes = encodeFrame(snapshotFromWorld(world, hashWorld(world)));
    totalFrameBytes += bytes.byteLength;
    if (bytes.byteLength > maxFrameBytes) maxFrameBytes = bytes.byteLength;
  }
  const seconds = worlds.length / TICK_HZ;
  const downBytesPerSecond = rate(totalFrameBytes, seconds);
  const upBytes = worlds.length * (INTENT_BYTES + HASH_ACK_BYTES);
  const upBytesPerSecond = rate(upBytes, seconds);
  const perClient = CLIENT_ENTITY_IDS.map((clientId) => ({
    clientId,
    downBytes: totalFrameBytes,
    downBytesPerSecond,
    upBytes,
    upBytesPerSecond,
    frames: worlds.length,
    intents: worlds.length,
    acks: worlds.length,
  }));
  const downValues = perClient.map((client) => client.downBytesPerSecond);
  const upValues = perClient.map((client) => client.upBytesPerSecond);
  return {
    perClient,
    down: rateStats(downValues),
    up: rateStats(upValues),
    fullSnapshotBytes: totalFrameBytes / worlds.length,
    maxFrameBytes,
  };
}

export interface StreamOptions {
  readonly keyframeIntervalTicks?: number;
  readonly radiusMm?: number;
  readonly ackDelayTicks?: number;
  readonly drop?: DropSchedule;
}

/**
 * One client's treatment downlink against the deterministic world chain.
 *
 * Ack semantics: a keyframe is acknowledged one tick after it is applied; until its ack arrives (or if
 * the ack is lost) the server retries the keyframe. Deltas are only sent once a keyframe is acknowledged
 * and are always computed against that keyframe, so a lost delta is recovered by the next delta.
 */
export function runClientStream(
  worlds: readonly WorldState[],
  clientId: number,
  options: StreamOptions = {},
): ClientTreatmentStats {
  if (worlds.length < 1) throw new RangeError('stream needs at least one tick');
  const interval = options.keyframeIntervalTicks ?? KEYFRAME_INTERVAL_TICKS;
  const radiusMm = options.radiusMm ?? AOI_RADIUS_MM;
  const ackDelay = options.ackDelayTicks ?? ACK_DELAY_TICKS;
  if (!Number.isInteger(interval) || interval < 1) throw new RangeError('keyframe interval must be positive');
  if (!Number.isInteger(ackDelay) || ackDelay < 0) throw new RangeError('ack delay must be a non-negative integer');

  let baseline: DeltaBaseline | null = null;
  let clientBaseline: DeltaBaseline | null = null;
  let lastKeyframeTick: number | null = null;
  let pendingKeyframeTick: number | null = null;
  let pendingAcks: Array<{ readonly arriveTick: number; readonly keyframeTick: number }> = [];
  let downBytes = 0;
  let upBytes = 0;
  let keyframes = 0;
  let deltaFrames = 0;
  let emptyDeltas = 0;
  let keyframeRetries = 0;
  let framesSent = 0;
  let framesDropped = 0;
  let framesReceived = 0;
  let maxFrameBytes = 0;
  let intents = 0;
  let acks = 0;
  let desyncs = 0;
  let finalViewHash = '00000000';
  let finalServerHash = '00000000';

  for (const world of worlds) {
    const tick = world.tick;
    const dueAcks = pendingAcks.filter((ack) => ack.arriveTick <= tick);
    pendingAcks = pendingAcks.filter((ack) => ack.arriveTick > tick);
    for (const ack of dueAcks) {
      if (ack.keyframeTick === pendingKeyframeTick) pendingKeyframeTick = null;
    }

    // The client sends one intent per tick regardless of the synthetic server-side movement script.
    intents += 1;
    upBytes += INTENT_BYTES;

    const snapshot: AoiSnapshot = aoiSnapshotFor(world, clientId, radiusMm);
    finalServerHash = snapshot.hash;
    const mustKeyframe = baseline === null
      || lastKeyframeTick === null
      || tick - lastKeyframeTick >= interval
      || pendingKeyframeTick !== null;

    let frame: DeltaFrame;
    let kind: FrameKind;
    if (mustKeyframe) {
      if (pendingKeyframeTick !== null) keyframeRetries += 1;
      frame = buildKeyframe(snapshot);
      baseline = baselineFromSnapshot(snapshot);
      lastKeyframeTick = tick;
      pendingKeyframeTick = tick;
      kind = 'keyframe';
      keyframes += 1;
    } else {
      frame = buildDelta(baseline!, snapshot);
      if (frame.changed.length === 0 && frame.removed.length === 0) {
        emptyDeltas += 1;
        continue;
      }
      kind = 'delta';
      deltaFrames += 1;
    }

    const bytes = encodeDeltaFrame(frame);
    downBytes += bytes.byteLength;
    if (bytes.byteLength > maxFrameBytes) maxFrameBytes = bytes.byteLength;
    framesSent += 1;

    if (options.drop?.(tick, clientId, kind) === true) {
      framesDropped += 1;
      continue;
    }

    const applied = applyDeltaFrame(kind === 'keyframe' ? null : clientBaseline, frame);
    framesReceived += 1;
    if (kind === 'keyframe') {
      clientBaseline = baselineFromSnapshot(applied);
      pendingAcks.push({ arriveTick: tick + ackDelay, keyframeTick: tick });
    }
    // The client acknowledges every received frame, keyframe or delta, at the 13 B HashAck size.
    acks += 1;
    upBytes += HASH_ACK_BYTES;
    if (applied.hash !== snapshot.hash) desyncs += 1;
    finalViewHash = applied.hash;
  }

  const seconds = worlds.length / TICK_HZ;
  return {
    clientId,
    downBytes,
    downBytesPerSecond: rate(downBytes, seconds),
    upBytes,
    upBytesPerSecond: rate(upBytes, seconds),
    keyframes,
    deltaFrames,
    emptyDeltas,
    keyframeRetries,
    framesSent,
    framesDropped,
    framesReceived,
    maxFrameBytes,
    intents,
    acks,
    desyncs,
    finalViewHash,
    finalServerHash,
  };
}

export function summarizeTreatment(perClient: readonly ClientTreatmentStats[]): TreatmentReport {
  if (perClient.length === 0) throw new RangeError('treatment needs at least one client');
  return {
    perClient,
    down: rateStats(perClient.map((client) => client.downBytesPerSecond)),
    up: rateStats(perClient.map((client) => client.upBytesPerSecond)),
    desyncs: perClient.reduce((sum, client) => sum + client.desyncs, 0),
    allFinalHashesMatch: perClient.every((client) => client.finalViewHash === client.finalServerHash),
  };
}

export function runScenario(scenario: MovementScenario, ticks = MEASURE_TICKS): ScenarioReport {
  const worlds = buildWorlds(scenario, ticks);
  const control = measureControl(worlds);
  const perClient = CLIENT_ENTITY_IDS.map((clientId) => runClientStream(worlds, clientId));
  const treatment = summarizeTreatment(perClient);
  const seconds = ticks / TICK_HZ;
  return {
    scenario,
    ticks,
    seconds,
    tickHz: TICK_HZ,
    entities: ENTITY_COUNT,
    clients: CLIENT_ENTITY_IDS,
    keyframeIntervalTicks: KEYFRAME_INTERVAL_TICKS,
    aoiRadiusMm: AOI_RADIUS_MM,
    control,
    treatment,
    improvement: {
      downBestPercent: percent(control.down.bestBytesPerSecond, treatment.down.bestBytesPerSecond),
      downAveragePercent: percent(control.down.averageBytesPerSecond, treatment.down.averageBytesPerSecond),
      downWorstPercent: percent(control.down.worstBytesPerSecond, treatment.down.worstBytesPerSecond),
      upAveragePercent: percent(control.up.averageBytesPerSecond, treatment.up.averageBytesPerSecond),
    },
    budget: {
      downBytesPerSecond: DOWN_BUDGET_BYTES_PER_SECOND,
      upBytesPerSecond: UP_BUDGET_BYTES_PER_SECOND,
      downMetBest: treatment.down.bestBytesPerSecond <= DOWN_BUDGET_BYTES_PER_SECOND,
      downMetAverage: treatment.down.averageBytesPerSecond <= DOWN_BUDGET_BYTES_PER_SECOND,
      downMetWorst: treatment.down.worstBytesPerSecond <= DOWN_BUDGET_BYTES_PER_SECOND,
      upMetBest: treatment.up.bestBytesPerSecond <= UP_BUDGET_BYTES_PER_SECOND,
      upMetAverage: treatment.up.averageBytesPerSecond <= UP_BUDGET_BYTES_PER_SECOND,
      upMetWorst: treatment.up.worstBytesPerSecond <= UP_BUDGET_BYTES_PER_SECOND,
    },
  };
}

/** Full measurement: control + treatment, dense upper bound + four-client lower bound, 600 ticks. */
export function runWireMeasurement(ticks = MEASURE_TICKS): WireMeasurementReport {
  return {
    tool: 'tools/netgate/wire/netgate_wire.ts',
    label: 'deterministic framed bytes on an in-process link — NOT network RTT, NOT a 30-minute soak, NOT wired into the server',
    generatedFromSeed: WORLD_SEED,
    ticks,
    tickHz: TICK_HZ,
    entities: ENTITY_COUNT,
    clients: CLIENT_ENTITY_IDS,
    keyframeIntervalTicks: KEYFRAME_INTERVAL_TICKS,
    budgets: {
      downBytesPerSecond: DOWN_BUDGET_BYTES_PER_SECOND,
      upBytesPerSecond: UP_BUDGET_BYTES_PER_SECOND,
    },
    scenarios: [runScenario('dense', ticks), runScenario('four-client', ticks)],
  };
}

/** The exact entities of a view, for a test-side equality check without importing maps. */
export function viewEntities(world: WorldState, clientId: number, radiusMm = AOI_RADIUS_MM): readonly EntityState[] {
  return aoiSnapshotFor(world, clientId, radiusMm).entities;
}
