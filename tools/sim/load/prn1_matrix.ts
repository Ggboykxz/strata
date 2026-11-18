/**
 * prn1_matrix.ts — the four-client latency/loss/jitter matrix and real-time soak harness (PR-N1).
 *
 * What this is: the real `Room`, `MessageGate`, binary codec and client `Predictor` driven over an
 * in-process link that emulates RTT, jitter and packet loss. A lost frame is **delayed by one RTT**, not
 * deleted, because the product transport is WebSocket (reliable, ordered) and real packet loss reaches the
 * application as retransmission delay (A0004). Frames are delivered in order, so a loss also delays the
 * frames behind it (head-of-line blocking), exactly as a reliable ordered stream behaves. What this is NOT:
 * kernel sockets, `tc netem`, a real browser, or a claim about a production network. The 30-minute run is
 * real wall time; the matrix is accelerated logical time with the same per-tick code path.
 *
 * The client runs `lead = uplinkTicks` ticks ahead of the server: an intent generated for local tick T is
 * sent when the server is at T - lead and reaches the server at T, which is what makes the client's
 * prediction at T comparable with the snapshot for T. This is the one clock relation the predictor
 * contract needs; it is measured, not assumed.
 *
 * Prediction scope: each client predicts only its own entity. Other clients' intents never reach it, so a
 * predicted whole-world hash cannot match the server's; the harness therefore measures snapshot-hash
 * integrity and own-entity prediction separately. See GDD-NETCODE §4.2.
 */
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { hashWorld, type Axis, type EntityState } from '../../../packages/core/src/index';
import { MAX_FRAME_BYTES, decodeFrame, encodeFrame, type SnapshotFrame } from '../../../packages/protocol/src/index';
import { Room, type RoomSocket } from '../../../apps/server/src/rooms/room';
import { MessageGate } from '../../../apps/server/src/validation/message-gate';
import { Predictor } from '../../../apps/game/src/net/predictor';

export const TICK_HZ = 30;
export const TICK_MS = 1000 / TICK_HZ;
export const WIRE_BUDGET_BYTES_PER_SECOND = 12 * 1024;
export const UPLINK_BUDGET_BYTES_PER_SECOND = 3 * 1024;
export const BYTES_PER_ENTITY = 24;
export const SNAPSHOT_HEADER_BYTES = 15;

export interface MatrixCell {
  readonly rtt_ms: number;
  readonly loss_pct: number;
  readonly jitter_ms: number;
}

export const RTT_VALUES = [0, 50, 150, 300] as const;
export const LOSS_VALUES = [0, 2, 5] as const;
export const JITTER_VALUES = [0, 30] as const;

export const MATRIX_CELLS: readonly MatrixCell[] = RTT_VALUES.flatMap((rtt_ms) =>
  LOSS_VALUES.flatMap((loss_pct) => JITTER_VALUES.map((jitter_ms) => ({ rtt_ms, loss_pct, jitter_ms }))));

export interface CellReport {
  readonly requested: MatrixCell;
  readonly emulated: {
    readonly up_ticks: number;
    readonly down_ticks: number;
    readonly jitter_ticks: number;
    readonly lead_ticks: number;
    readonly rtt_ms: number;
  };
  readonly ticks: number;
  readonly clients: number;
  readonly entities: number;
  readonly desyncs: number;
  readonly verified_snapshots: number;
  readonly speculative_snapshots: number;
  readonly server_ahead_snapshots: number;
  readonly no_prediction_snapshots: number;
  readonly hashacks_sent: number;
  readonly ack_missing_ticks: number;
  readonly server_desyncs: number;
  readonly gate_rejections: number;
  readonly hash_integrity_failures: number;
  readonly ahead_ticks: number;
  readonly input_refusals: number;
  readonly snapshot_bytes: { readonly min: number; readonly max: number };
  readonly corrections: {
    readonly samples: number;
    readonly p50_mm: number;
    readonly p95_mm: number;
    readonly max_mm: number;
    readonly over_2m: number;
  };
  readonly server_tick_ms: { readonly p50: number; readonly p95: number; readonly max: number };
  readonly wire: {
    readonly down_bytes_per_client_per_s: number;
    readonly up_bytes_per_client_per_s: number;
    readonly down_total_bytes_per_s: number;
    readonly down_budget_bytes_per_s: number;
    readonly up_budget_bytes_per_s: number;
    readonly over_budget_factor: number;
  };
  readonly checks: {
    readonly desyncs: boolean;
    readonly corrections: boolean;
    readonly verified: boolean;
    readonly server_tick: boolean;
    readonly wire_budget: boolean;
  };
}

export interface ReconnectReport {
  readonly attempted: boolean;
  readonly same_entity: boolean;
  readonly seq_preserved: boolean;
  readonly hash_valid: boolean;
  readonly exact_state: boolean;
  readonly resumed_within_window: boolean;
  readonly late_resume_refused: boolean;
  readonly disconnected_tick: number;
  readonly resumed_tick: number;
  readonly seq_at_disconnect: number;
  readonly seq_after_resume: number;
}

export interface MatrixReport {
  readonly label: string;
  readonly ticks_per_cell: number;
  readonly clients: number;
  readonly entities: number;
  readonly cells: readonly CellReport[];
  readonly reconnect: ReconnectReport;
  readonly verdict: {
    readonly cells: number;
    readonly transport_pass: boolean;
    readonly wire_budget_pass: boolean;
    readonly desyncs: number;
    readonly server_desyncs: number;
    readonly hash_integrity_failures: number;
    readonly verified_snapshots: number;
    readonly correction_p95_max_mm: number;
    readonly correction_max_mm: number;
    readonly rubber_band_over_2m: number;
    readonly server_tick_p95_max_ms: number;
    readonly down_bytes_per_client_per_s: number;
  };
}

export interface SoakReport {
  readonly label: string;
  readonly requested_minutes: number;
  readonly wall_seconds: number;
  readonly ticks: number;
  readonly effective_hz: number;
  readonly clients: number;
  readonly entities: number;
  readonly emulated: CellReport['emulated'];
  readonly desyncs: number;
  readonly verified_snapshots: number;
  readonly speculative_snapshots: number;
  readonly server_ahead_snapshots: number;
  readonly no_prediction_snapshots: number;
  readonly hashacks_sent: number;
  readonly ack_missing_ticks: number;
  readonly server_desyncs: number;
  readonly gate_rejections: number;
  readonly hash_integrity_failures: number;
  readonly ahead_ticks: number;
  readonly input_refusals: number;
  readonly corrections: CellReport['corrections'];
  readonly server_tick_ms: CellReport['server_tick_ms'];
  readonly wire: CellReport['wire'];
  readonly memory: {
    readonly rss_start_mb: number;
    readonly rss_end_mb: number;
    readonly rss_peak_mb: number;
    readonly heap_used_end_mb: number;
  };
  readonly checks: {
    readonly duration: boolean;
    readonly desyncs: boolean;
    readonly corrections: boolean;
    readonly verified: boolean;
    readonly server_tick: boolean;
  };
}

export interface HarnessOptions {
  readonly clients: number;
  readonly entities: number;
  readonly seed: number;
}

export interface MatrixOptions extends HarnessOptions {
  readonly ticks: number;
  readonly cells?: readonly MatrixCell[];
}

export interface SoakOptions extends HarnessOptions {
  readonly minutes: number;
  readonly cell: MatrixCell;
  readonly progressEverySeconds?: number;
}

interface LinkModel {
  readonly delayTicks: number;
  readonly jitterTicks: number;
  readonly lossPct: number;
  readonly retransmitTicks: number;
}

interface DueFrame {
  readonly due: number;
  readonly bytes: Uint8Array;
}

class Link {
  private frames: DueFrame[] = [];
  private lastDue = 0;

  constructor(private readonly model: LinkModel, private readonly rand: () => number) {}

  schedule(bytes: Uint8Array, nowTick: number): void {
    let due = nowTick + this.model.delayTicks;
    if (this.model.jitterTicks > 0) due += Math.floor(this.rand() * (this.model.jitterTicks + 1));
    // WebSocket is reliable and ordered: loss is observed as a retransmission delay, never as a hole.
    // A delayed frame also delays every frame behind it (head-of-line blocking on the same stream).
    if (this.model.lossPct > 0 && this.rand() * 100 < this.model.lossPct) due += this.model.retransmitTicks;
    if (due < this.lastDue) due = this.lastDue;
    this.lastDue = due;
    this.frames.push({ due, bytes });
  }

  due(tick: number): Uint8Array[] {
    const ready: Uint8Array[] = [];
    const waiting: DueFrame[] = [];
    for (const frame of this.frames) {
      if (frame.due <= tick) ready.push(frame.bytes);
      else waiting.push(frame);
    }
    this.frames = waiting;
    return ready;
  }

  clear(): void { this.frames = []; this.lastDue = 0; }

  get size(): number { return this.frames.length; }
}

class HarnessClient {
  readonly uplink: Link;
  readonly downlink: Link;
  readonly socket: RoomSocket;
  clientId = 0;
  entityId = 0;
  token = '';
  predictor: Predictor | null = null;
  seq = 0;
  connected = true;
  lastSnapshotTick = -1;
  sentIntents = 0;
  upBytes = 0;
  downBytes = 0;
  snapshots = 0;
  snapshotBytesMin = Number.POSITIVE_INFINITY;
  snapshotBytesMax = 0;
  desyncs = 0;
  verified = 0;
  speculative = 0;
  serverAhead = 0;
  noPrediction = 0;
  hashacks = 0;
  ackMissingTicks = 0;
  gateRejections = 0;
  hashIntegrityFailures = 0;
  aheadTicks = 0;
  inputRefusals = 0;
  readonly corrections: number[] = [];
  expectResumeSnapshot = false;
  resumeSnapshot: {
    tick: number;
    entityId: number;
    seq: number;
    hash: string;
    hashValid: boolean;
    predictorHash: string | undefined;
  } | null = null;

  constructor(
    readonly index: number,
    upModel: LinkModel,
    downModel: LinkModel,
    rand: () => number,
    now: () => number,
  ) {
    this.uplink = new Link(upModel, rand);
    this.downlink = new Link(downModel, rand);
    this.socket = { send: (bytes: Uint8Array): void => { this.downlink.schedule(bytes, now()); } };
  }
}

class Harness {
  readonly room: Room;
  readonly gate = new MessageGate();
  readonly clients: HarnessClient[] = [];
  readonly serverTicks: number[] = [];
  serverDesyncCount = 0;
  lastResumeEntityId: number | null = null;
  nowTick = 0;

  constructor(
    readonly options: HarnessOptions,
    private readonly upModel: LinkModel,
    private readonly downModel: LinkModel,
    private readonly rand: () => number,
  ) {
    this.room = new Room(`prn1-${options.seed}`, {
      seed: options.seed,
      capacity: options.entities,
      reconnectTicks: 30,
    });
    for (let index = 0; index < options.clients; index++) {
      const client = new HarnessClient(index, upModel, downModel, rand, () => this.nowTick);
      const roomClient = this.room.join(client.socket);
      if (!roomClient) throw new Error(`room refused client ${index + 1}`);
      client.clientId = roomClient.clientId;
      client.entityId = roomClient.entityId;
      client.token = roomClient.token;
      this.clients.push(client);
    }
  }

  get leadTicks(): number { return this.upModel.delayTicks; }

  tickOnce(tick: number): void {
    this.nowTick = tick;
    for (const client of this.clients) {
      for (const bytes of client.downlink.due(tick)) this.receive(client, bytes);
    }
    for (const client of this.clients) this.stepClient(client, tick);
    for (const client of this.clients) {
      for (const bytes of client.uplink.due(tick)) {
        const verdict = this.gate.accept(client.clientId, this.room.currentTick, bytes);
        if (!verdict.allowed) { client.gateRejections++; continue; }
        this.room.handleBytes(client.clientId, bytes);
      }
    }
    const started = performance.now();
    const result = this.room.tick();
    this.serverTicks.push(performance.now() - started);
    for (const event of result.events) if (event.kind === 'desync') this.serverDesyncCount++;
  }

  disconnect(client: HarnessClient): void {
    client.connected = false;
    this.room.disconnect(client.clientId);
  }

  resume(client: HarnessClient): boolean {
    const resumed = this.room.resume(client.token, client.socket);
    if (!resumed) return false;
    this.lastResumeEntityId = resumed.entityId;
    client.connected = true;
    client.predictor = null;
    client.lastSnapshotTick = -1;
    client.expectResumeSnapshot = true;
    client.resumeSnapshot = null;
    client.downlink.clear();
    client.uplink.clear();
    return true;
  }

  private receive(client: HarnessClient, bytes: Uint8Array): void {
    if (!client.connected) return;
    let message: ReturnType<typeof decodeFrame>;
    try { message = decodeFrame(bytes); } catch { return; }
    if (message.kind === 'snapshot') this.onSnapshot(client, message, bytes.byteLength);
  }

  private onSnapshot(client: HarnessClient, snapshot: SnapshotFrame, bytes: number): void {
    if (snapshot.tick <= client.lastSnapshotTick) return;
    client.lastSnapshotTick = snapshot.tick;
    client.downBytes += bytes;
    client.snapshots++;
    client.snapshotBytesMin = Math.min(client.snapshotBytesMin, bytes);
    client.snapshotBytesMax = Math.max(client.snapshotBytesMax, bytes);

    const world = { tick: snapshot.tick, entities: [...snapshot.entities] };
    const integrity = hashWorld(world) === snapshot.hash;
    if (!integrity) client.hashIntegrityFailures++;
    const serverOwn = ownEntity(snapshot.entities, client.entityId);
    if (!serverOwn) return;

    if (!client.predictor) {
      client.predictor = new Predictor(world, client.entityId);
      if (client.expectResumeSnapshot) {
        client.expectResumeSnapshot = false;
        client.resumeSnapshot = {
          tick: snapshot.tick,
          entityId: serverOwn.id,
          seq: serverOwn.seq,
          hash: snapshot.hash,
          hashValid: integrity,
          predictorHash: client.predictor.hashAt(snapshot.tick),
        };
      }
    } else {
      const predicted = client.predictor.predictionAt(snapshot.tick);
      const verdict = client.predictor.reconcile(snapshot);
      if (predicted) client.corrections.push(distanceMm(predicted, serverOwn));
      if (verdict === 'desync') client.desyncs++;
      else if (verdict === 'ok') client.verified++;
      else if (!predicted) client.noPrediction++;
      else if (predicted.seq > serverOwn.seq) client.speculative++;
      else if (predicted.seq < serverOwn.seq) client.serverAhead++;
      else client.noPrediction++;
    }

    // Ack the adopted authoritative hash. The server's ring must still hold this tick; the ack is a
    // transport-integrity check, not a claim that the client predicted another entity's movement.
    if (this.room.sim.hashAt(snapshot.tick) === undefined) client.ackMissingTicks++;
    const ack = encodeFrame({
      kind: 'hashack', client: client.entityId, tick: snapshot.tick, hash: snapshot.hash,
    });
    client.uplink.schedule(ack, this.nowTick);
    client.hashacks++;
    client.upBytes += ack.byteLength;
  }

  private stepClient(client: HarnessClient, tick: number): void {
    if (!client.connected) return;
    const predictor = client.predictor;
    if (!predictor) return;
    const target = tick + this.leadTicks;
    while (predictor.state.tick < target - 1) predictor.advance();
    if (predictor.state.tick !== target - 1) {
      client.aheadTicks++;
      return;
    }
    const direction = inputFor(client.index, target);
    if (direction) {
      client.seq++;
      if (!predictor.input(client.seq, direction[0], direction[1])) {
        client.inputRefusals++;
        return;
      }
      const frame = encodeFrame({
        kind: 'intent', entity: client.entityId, seq: client.seq, dx: direction[0], dz: direction[1],
      });
      client.uplink.schedule(frame, tick);
      client.sentIntents++;
      client.upBytes += frame.byteLength;
    } else {
      predictor.advance();
    }
  }
}

function ownEntity(entities: readonly EntityState[], id: number): EntityState | undefined {
  return entities.find((entity) => entity.id === id);
}

function distanceMm(a: { x: number; z: number }, b: { x: number; z: number }): number {
  // Harness-only metric. packages/core stays integer-only; this never feeds the simulation.
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** 15 ticks moving, 45 ticks idle: the idle window drains in-flight input for a real verified snapshot. */
export function inputFor(clientIndex: number, localTick: number): readonly [Axis, Axis] | null {
  const phase = (localTick + clientIndex * 11) % 90;
  if (phase >= 45) return null;
  const directions: readonly (readonly [Axis, Axis])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const segment = Math.floor(phase / 10) % 4;
  const fallback: readonly [Axis, Axis] = [0, 0];
  return directions[(segment + clientIndex) % 4] ?? fallback;
}

function emulated(cell: MatrixCell): CellReport['emulated'] & { readonly model: LinkModel } {
  const rttTicks = cell.rtt_ms === 0 ? 1 : Math.round(cell.rtt_ms / TICK_MS);
  const up = Math.floor(rttTicks / 2);
  const down = Math.ceil(rttTicks / 2);
  const jitterTicks = Math.round(cell.jitter_ms / TICK_MS);
  return {
    up_ticks: up,
    down_ticks: down,
    jitter_ticks: jitterTicks,
    lead_ticks: up,
    rtt_ms: Number(((up + down) * TICK_MS).toFixed(2)),
    model: { delayTicks: up, jitterTicks, lossPct: cell.loss_pct, retransmitTicks: rttTicks },
  };
}

function downModel(emulatedCell: ReturnType<typeof emulated>): LinkModel {
  return {
    delayTicks: emulatedCell.down_ticks,
    jitterTicks: emulatedCell.jitter_ticks,
    lossPct: 0,
    retransmitTicks: 0,
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)] ?? 0;
}

/**
 * `Math.max(0, ...values)` throws RangeError above roughly 150k arguments. A 30-minute soak accumulates one
 * correction per predicted snapshot per client, so the report must reduce instead of spreading (PR-N1 defect).
 */
export function maxSample(values: readonly number[]): number {
  return values.reduce((max, value) => (value > max ? value : max), 0);
}

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export const SNAPSHOT_64_ENTITIES_BYTES = SNAPSHOT_HEADER_BYTES + 64 * BYTES_PER_ENTITY;
export const MAX_FRAME_BYTES_OK = SNAPSHOT_64_ENTITIES_BYTES <= MAX_FRAME_BYTES;

function cellChecks(report: Omit<CellReport, 'checks'>): CellReport['checks'] {
  return {
    desyncs: report.desyncs === 0 && report.server_desyncs === 0 && report.hash_integrity_failures === 0,
    corrections: report.corrections.samples > 0
      && report.corrections.p95_mm < 300
      && report.corrections.max_mm <= 2000,
    verified: report.verified_snapshots > 0,
    server_tick: report.server_tick_ms.p95 <= 25,
    wire_budget: report.wire.down_bytes_per_client_per_s <= WIRE_BUDGET_BYTES_PER_SECOND
      && report.wire.up_bytes_per_client_per_s <= UPLINK_BUDGET_BYTES_PER_SECOND,
  };
}

function reportFor(
  cell: MatrixCell,
  emulatedCell: ReturnType<typeof emulated>,
  harness: Harness,
  ticks: number,
): CellReport {
  const corrections = harness.clients.flatMap((client) => client.corrections);
  const durations = harness.serverTicks;
  const seconds = (ticks * TICK_MS) / 1000;
  const downBytes = harness.clients.reduce((sum, client) => sum + client.downBytes, 0);
  const upBytes = harness.clients.reduce((sum, client) => sum + client.upBytes, 0);
  const downPerClient = downBytes / harness.clients.length / seconds;
  const upPerClient = upBytes / harness.clients.length / seconds;
  const snapshotBytes = harness.clients.flatMap((client) => [client.snapshotBytesMin, client.snapshotBytesMax])
    .filter((value) => Number.isFinite(value));
  const minSnapshot = snapshotBytes.length
    ? snapshotBytes.reduce((min, value) => (value < min ? value : min), Number.POSITIVE_INFINITY) : 0;
  const maxSnapshot = maxSample(snapshotBytes);
  const report: Omit<CellReport, 'checks'> = {
    requested: cell,
    emulated: {
      up_ticks: emulatedCell.up_ticks,
      down_ticks: emulatedCell.down_ticks,
      jitter_ticks: emulatedCell.jitter_ticks,
      lead_ticks: emulatedCell.lead_ticks,
      rtt_ms: emulatedCell.rtt_ms,
    },
    ticks,
    clients: harness.clients.length,
    entities: harness.options.entities,
    desyncs: harness.clients.reduce((sum, client) => sum + client.desyncs, 0),
    verified_snapshots: harness.clients.reduce((sum, client) => sum + client.verified, 0),
    speculative_snapshots: harness.clients.reduce((sum, client) => sum + client.speculative, 0),
    server_ahead_snapshots: harness.clients.reduce((sum, client) => sum + client.serverAhead, 0),
    no_prediction_snapshots: harness.clients.reduce((sum, client) => sum + client.noPrediction, 0),
    hashacks_sent: harness.clients.reduce((sum, client) => sum + client.hashacks, 0),
    ack_missing_ticks: harness.clients.reduce((sum, client) => sum + client.ackMissingTicks, 0),
    server_desyncs: harness.serverDesyncCount,
    gate_rejections: harness.clients.reduce((sum, client) => sum + client.gateRejections, 0),
    hash_integrity_failures: harness.clients.reduce((sum, client) => sum + client.hashIntegrityFailures, 0),
    ahead_ticks: harness.clients.reduce((sum, client) => sum + client.aheadTicks, 0),
    input_refusals: harness.clients.reduce((sum, client) => sum + client.inputRefusals, 0),
    snapshot_bytes: { min: minSnapshot, max: maxSnapshot },
    corrections: {
      samples: corrections.length,
      p50_mm: round(percentile(corrections, 50), 3),
      p95_mm: round(percentile(corrections, 95), 3),
      max_mm: round(maxSample(corrections), 3),
      over_2m: corrections.filter((value) => value > 2000).length,
    },
    server_tick_ms: {
      p50: round(percentile(durations, 50), 4),
      p95: round(percentile(durations, 95), 4),
      max: round(maxSample(durations), 4),
    },
    wire: {
      down_bytes_per_client_per_s: round(downPerClient, 2),
      up_bytes_per_client_per_s: round(upPerClient, 2),
      down_total_bytes_per_s: round(downPerClient * harness.clients.length, 2),
      down_budget_bytes_per_s: WIRE_BUDGET_BYTES_PER_SECOND,
      up_budget_bytes_per_s: UPLINK_BUDGET_BYTES_PER_SECOND,
      over_budget_factor: round(downPerClient / WIRE_BUDGET_BYTES_PER_SECOND, 3),
    },
  };
  return { ...report, checks: cellChecks(report) };
}

function assertOptions(options: HarnessOptions, ticks?: number): void {
  if (!Number.isInteger(options.clients) || options.clients < 1 || options.clients > 8) {
    throw new RangeError('clients must be an integer in 1..8');
  }
  if (!Number.isInteger(options.entities) || options.entities < options.clients || options.entities > 64) {
    throw new RangeError('entities must be an integer in clients..64');
  }
  if (!Number.isInteger(options.seed) || options.seed < 1) throw new RangeError('seed must be a positive integer');
  if (ticks !== undefined && (!Number.isInteger(ticks) || ticks < 2)) throw new RangeError('ticks must be >= 2');
}

function createHarness(
  options: HarnessOptions,
  cell: MatrixCell,
): { harness: Harness; emulatedCell: ReturnType<typeof emulated> } {
  const emulatedCell = emulated(cell);
  const rand = mulberry32(options.seed + cell.rtt_ms * 31 + cell.loss_pct * 131 + cell.jitter_ms * 977);
  const harness = new Harness(options, emulatedCell.model, downModel(emulatedCell), rand);
  return { harness, emulatedCell };
}

export function runMatrix(options: MatrixOptions): MatrixReport {
  assertOptions(options, options.ticks);
  const cells = options.cells ?? MATRIX_CELLS;
  const reports: CellReport[] = [];
  for (const cell of cells) {
    const { harness, emulatedCell } = createHarness(options, cell);
    for (let tick = 1; tick <= options.ticks; tick++) harness.tickOnce(tick);
    reports.push(reportFor(cell, emulatedCell, harness, options.ticks));
  }
  const reconnect = runReconnect(options);
  const transportPass = reports.every((report) => report.checks.desyncs
    && report.checks.corrections && report.checks.verified && report.checks.server_tick);
  return {
    label: 'in-process emulated RTT/loss/jitter matrix; loss is a reliable-stream retransmit delay, not kernel networking',
    ticks_per_cell: options.ticks,
    clients: options.clients,
    entities: options.entities,
    cells: reports,
    reconnect,
    verdict: {
      cells: reports.length,
      transport_pass: transportPass,
      wire_budget_pass: reports.every((report) => report.checks.wire_budget),
      desyncs: reports.reduce((sum, report) => sum + report.desyncs, 0),
      server_desyncs: reports.reduce((sum, report) => sum + report.server_desyncs, 0),
      hash_integrity_failures: reports.reduce((sum, report) => sum + report.hash_integrity_failures, 0),
      verified_snapshots: reports.reduce((sum, report) => sum + report.verified_snapshots, 0),
      correction_p95_max_mm: maxSample(reports.map((report) => report.corrections.p95_mm)),
      correction_max_mm: maxSample(reports.map((report) => report.corrections.max_mm)),
      rubber_band_over_2m: reports.reduce((sum, report) => sum + report.corrections.over_2m, 0),
      server_tick_p95_max_ms: maxSample(reports.map((report) => report.server_tick_ms.p95)),
      down_bytes_per_client_per_s: maxSample(reports.map((report) => report.wire.down_bytes_per_client_per_s)),
    },
  };
}

export function runReconnect(options: HarnessOptions): ReconnectReport {
  assertOptions(options, 2);
  const cell: MatrixCell = { rtt_ms: 150, loss_pct: 2, jitter_ms: 30 };
  const { harness } = createHarness(options, cell);
  const target = harness.clients[harness.clients.length - 1];
  if (!target) throw new Error('reconnect scenario needs a client');
  const disconnectTick = 300;
  const resumeTick = disconnectTick + 6;
  const lateDisconnectTick = 380;
  const lateResumeTick = lateDisconnectTick + 32;

  let seqAtDisconnect = 0;
  let resumedWithinWindow = false;
  let resumeEntityId: number | null = null;
  let resumedAt = 0;
  let lateRefused = false;

  for (let tick = 1; tick <= 440; tick++) {
    if (tick === disconnectTick) {
      seqAtDisconnect = ownEntity(harness.room.sim.state.entities, target.entityId)?.seq ?? 0;
      harness.disconnect(target);
    }
    if (tick === resumeTick) {
      resumedWithinWindow = harness.resume(target);
      resumeEntityId = harness.lastResumeEntityId;
      resumedAt = tick;
    }
    if (tick === lateDisconnectTick) harness.disconnect(target);
    if (tick === lateResumeTick) lateRefused = !harness.resume(target);
    harness.tickOnce(tick);
  }

  const proof = target.resumeSnapshot;
  return {
    attempted: true,
    same_entity: resumedWithinWindow && resumeEntityId === target.entityId
      && proof !== null && proof.entityId === target.entityId,
    seq_preserved: resumedWithinWindow && proof !== null && proof.seq >= seqAtDisconnect,
    hash_valid: proof?.hashValid ?? false,
    exact_state: proof !== null && proof.hashValid && proof.predictorHash === proof.hash,
    resumed_within_window: resumedWithinWindow,
    late_resume_refused: lateRefused,
    disconnected_tick: disconnectTick,
    resumed_tick: resumedAt,
    seq_at_disconnect: seqAtDisconnect,
    seq_after_resume: proof?.seq ?? 0,
  };
}

export async function runSoak(options: SoakOptions): Promise<SoakReport> {
  assertOptions(options, 2);
  if (!Number.isFinite(options.minutes) || options.minutes <= 0) throw new RangeError('minutes must be positive');
  const { harness, emulatedCell } = createHarness(options, options.cell);
  const startedAt = performance.now();
  const deadline = startedAt + options.minutes * 60 * 1000;
  const progressEvery = options.progressEverySeconds ?? 60;
  const rssStart = process.memoryUsage().rss;
  let rssPeak = rssStart;
  let tick = 0;
  let lastProgress = startedAt;

  while (performance.now() < deadline) {
    tick++;
    harness.tickOnce(tick);
    const now = performance.now();
    if (now - lastProgress >= progressEvery * 1000) {
      lastProgress = now;
      const rss = process.memoryUsage().rss;
      rssPeak = Math.max(rssPeak, rss);
      console.log(`PR-N1 soak · ${((now - startedAt) / 1000).toFixed(0)}s · tick ${tick}`
        + ` · desyncs ${harness.clients.reduce((sum, client) => sum + client.desyncs, 0)}`
        + ` · verified ${harness.clients.reduce((sum, client) => sum + client.verified, 0)}`
        + ` · rss ${(rss / 1024 / 1024).toFixed(1)} MB`);
    }
    const next = startedAt + tick * TICK_MS;
    const wait = next - performance.now();
    if (wait > 0) await sleep(wait);
  }
  const wallSeconds = (performance.now() - startedAt) / 1000;
  const rssEnd = process.memoryUsage().rss;
  rssPeak = Math.max(rssPeak, rssEnd);
  const base = reportFor(options.cell, emulatedCell, harness, tick);
  const checks = {
    duration: wallSeconds >= options.minutes * 60 - 1,
    desyncs: base.desyncs === 0 && base.server_desyncs === 0 && base.hash_integrity_failures === 0,
    corrections: base.corrections.samples > 0
      && base.corrections.p95_mm < 300
      && base.corrections.max_mm <= 2000,
    verified: base.verified_snapshots > 0,
    server_tick: base.server_tick_ms.p95 <= 25,
  };
  return {
    label: 'real-time 30 Hz soak over the in-process emulated link; wall time, not simulated time',
    requested_minutes: options.minutes,
    wall_seconds: round(wallSeconds, 2),
    ticks: tick,
    effective_hz: round(tick / wallSeconds, 3),
    clients: options.clients,
    entities: options.entities,
    emulated: base.emulated,
    desyncs: base.desyncs,
    verified_snapshots: base.verified_snapshots,
    speculative_snapshots: base.speculative_snapshots,
    server_ahead_snapshots: base.server_ahead_snapshots,
    no_prediction_snapshots: base.no_prediction_snapshots,
    hashacks_sent: base.hashacks_sent,
    ack_missing_ticks: base.ack_missing_ticks,
    server_desyncs: base.server_desyncs,
    gate_rejections: base.gate_rejections,
    hash_integrity_failures: base.hash_integrity_failures,
    ahead_ticks: base.ahead_ticks,
    input_refusals: base.input_refusals,
    corrections: base.corrections,
    server_tick_ms: base.server_tick_ms,
    wire: base.wire,
    memory: {
      rss_start_mb: round(rssStart / 1024 / 1024, 1),
      rss_end_mb: round(rssEnd / 1024 / 1024, 1),
      rss_peak_mb: round(rssPeak / 1024 / 1024, 1),
      heap_used_end_mb: round(process.memoryUsage().heapUsed / 1024 / 1024, 1),
    },
    checks,
  };
}
