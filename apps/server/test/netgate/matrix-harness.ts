/**
 * NET-GATE 4-client real-socket matrix harness (harness-only; not imported by any runtime).
 *
 * Topology: a real `ws` WebSocketServer on 127.0.0.1:0, a RoomHub created with
 * `{ capacity: 4, reconnectTicks: 90, seed: 1337 }`, bound through the same `attachRooms` path the live
 * endpoint uses (MessageGate included), and 4 real `ws` clients connecting with `?room=matrix&nonce=<n>`.
 * Connections are made sequentially so room entity assignment (join order) is deterministic.
 *
 * Every frame in both directions passes through an application-level `MatrixChannel` (see
 * matrix-emulator.ts): RTT {0, 50, 150, 300} ms (one-way = RTT/2), loss {0, 2, 5} % (seeded LCG),
 * jitter {0, 30} ms uniform in [0, jitter]. This is NOT tc/netem.
 *
 * Each client runs a replicated NET-004 predictor (matrix-predictor.ts, @strata/core only — not the game
 * package, no cross-package dependency). The client predicts only its own entity and reconciles on every
 * snapshot. Per the matrix brief, the Predictor's known predict-ahead-under-latency behaviour is NOT fixed
 * here; desyncs are recorded as measured. Unacked intents are NOT retransmitted (that is the current wire
 * contract); `needsResync` is counted but no resync frame is sent (the client has no wire-level room client
 * id to address). Both choices are recorded in the metrics object and the report.
 *
 * Byte accounting: up bytes are counted at the client's `send()` call, down bytes at the server-side
 * socket's `send()` call — encoded frame payload bytes only; ws framing overhead is not counted.
 * Server tick time is measured with `performance.now()` around each `room.tick()` at the 30 Hz cadence.
 */
import { createWorld, hashEntity, TICK_HZ, type Axis } from '@strata/core';
import { PROTOCOL_VERSION, decodeFrame, encodeFrame, type SnapshotFrame } from '@strata/protocol';
import { performance } from 'node:perf_hooks';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import type { AddressInfo } from 'node:net';
import { RoomHub, attachRooms } from '../../src/rooms';
import {
  MATRIX_DEFAULT_SEED, MATRIX_WORLD_SEED, ByteMeter, MatrixChannel, SeededLcg,
  summarizeDurations, toBytes, type DurationStats, type MatrixNetConfig,
} from './matrix-emulator';
import { MatrixPredictor } from './matrix-predictor';

const TICK_MS = 1000 / TICK_HZ;

export interface MatrixCellOptions {
  readonly rttMs: number;
  readonly lossPct: number;
  readonly jitterMs: number;
  /** Wall-clock duration of the cell. The 30-minute soak uses 1800. */
  readonly durationS: number;
  /** Emulation seed (loss/jitter draws and intent axes). Default 20261118. */
  readonly seed?: number;
  /** Deterministic world seed. Default 1337. */
  readonly worldSeed?: number;
  /** If set, append the metrics object to this JSON array file (created if missing). */
  readonly metricsFile?: string | null;
  /** Commit hash to embed in the metrics object (driver passes `git rev-parse HEAD`). */
  readonly commit?: string | null;
  /** Optional run identifier; defaults to a UTC stamp + cell coordinates. */
  readonly runId?: string;
}

export interface MatrixClientMetrics {
  readonly index: number;
  readonly entityId: number;
  readonly connected: boolean;
  readonly welcomeReceived: boolean;
  /** Whether the viewHash scan of the first snapshot agreed with the join-order own entity id. */
  readonly ownIdCheck: 'match' | 'mismatch' | 'unverified';
  readonly intentsSent: number;
  readonly upBytes: number;
  readonly upBytesPerSecond: number;
  readonly downBytes: number;
  readonly downBytesPerSecond: number;
  readonly snapshotsReceived: number;
  readonly okReconciles: number;
  readonly unknownReconciles: number;
  readonly desyncs: number;
  /** Times a reconcile ended in desync with needsResync set; no resync frame is sent (see header). */
  readonly resyncRequests: number;
  /** Reject frames received (gate refusals surface as reason 'malformed' through attachRooms). */
  readonly rejectsReceived: number;
  /** Per-reconcile |reconciled own entity − predicted own entity| (hypot, rounded to integer mm). */
  readonly correctionMm: DurationStats;
  readonly rubberBandMaxMm: number;
  readonly upFramesLost: number;
}

export interface MatrixCellMetrics {
  readonly schema: 'netgate-matrix/1';
  readonly run_id: string;
  readonly task: 'GATE:NET';
  readonly config: {
    readonly room: 'matrix';
    readonly capacity: 4;
    readonly reconnectTicks: 90;
    readonly worldSeed: number;
    readonly rttMs: number;
    readonly lossPct: number;
    readonly jitterMs: number;
    readonly emulationSeed: number;
    readonly targetDurationS: number;
    readonly actualDurationS: number;
    readonly intentHz: number;
    readonly resendsUnackedIntents: false;
    readonly sendsResyncFrames: false;
  };
  readonly commit: string | null;
  readonly started_utc: string;
  readonly ended_utc: string;
  /** Authoritative room ticks observed by the harness. */
  readonly ticks: number;
  /** performance.now() around each room.tick(), at the 30 Hz cadence. */
  readonly tick_ms: DurationStats;
  readonly clients: readonly MatrixClientMetrics[];
  readonly totals: {
    readonly desyncs: number;
    readonly okReconciles: number;
    readonly unknownReconciles: number;
    readonly intentsSent: number;
    readonly snapshotsReceived: number;
    readonly intentsUpFrames: number;
    readonly intentsUpFramesDropped: number;
    readonly snapshotsDownFrames: number;
    readonly snapshotsDownFramesDropped: number;
    readonly downBytes: number;
    readonly upBytes: number;
    readonly downBytesPerSecond: number;
    readonly upBytesPerSecond: number;
    readonly perClientDownBytesPerSecond: number;
    readonly perClientUpBytesPerSecond: number;
    readonly correctionP95Mm: number;
    readonly rubberBandMaxMm: number;
  };
  readonly sanity: {
    readonly fourClientsConnected: boolean;
    readonly tickAdvanced: boolean;
  };
  readonly notes: readonly string[];
}

interface ClientState {
  index: number;
  entityId: number;
  intentSeq: number;
  lcg: SeededLcg;
  predictor: MatrixPredictor;
  upChannel: MatrixChannel;
  upMeter: ByteMeter;
  downMeter: ByteMeter | null;
  ws: WebSocket | null;
  intentsSent: number;
  snapshotsReceived: number;
  okReconciles: number;
  unknownReconciles: number;
  desyncs: number;
  resyncRequests: number;
  rejectsReceived: number;
  corrections: number[];
  ownIdCheck: 'match' | 'mismatch' | 'unverified';
  connected: boolean;
  welcomeReceived: boolean;
  intentTimer: ReturnType<typeof setInterval> | null;
  helloTimer: ReturnType<typeof setInterval> | null;
}

const sleep = (ms: number) => new Promise<void>((resolveSleep) => setTimeout(resolveSleep, ms));

function stampUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export async function runMatrixCell(options: MatrixCellOptions): Promise<MatrixCellMetrics> {
  const { rttMs, lossPct, jitterMs, durationS } = options;
  if (!Number.isFinite(rttMs) || rttMs < 0) throw new RangeError('rttMs must be a non-negative finite number');
  if (!Number.isFinite(lossPct) || lossPct < 0 || lossPct >= 100) throw new RangeError('lossPct must be in [0, 100)');
  if (!Number.isFinite(jitterMs) || jitterMs < 0) throw new RangeError('jitterMs must be a non-negative finite number');
  if (!Number.isFinite(durationS) || durationS <= 0 || durationS > 3600) {
    throw new RangeError('durationS must be in (0, 3600]');
  }

  const seed = options.seed ?? MATRIX_DEFAULT_SEED;
  const worldSeed = options.worldSeed ?? MATRIX_WORLD_SEED;
  const net: MatrixNetConfig = { rttMs, lossPct, jitterMs };
  const startedUtc = new Date();
  const startedMs = performance.now();

  const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  const hub = new RoomHub({ capacity: 4, reconnectTicks: 90, seed: worldSeed });

  // Downlink emulation must wrap the server-side socket BEFORE attachRooms hands it to the room.
  let connectionIndex = 0;
  const downlinks = new Map<WebSocket, { channel: MatrixChannel; meter: ByteMeter; index: number }>();
  wss.on('connection', (socket: WebSocket) => {
    const index = connectionIndex++;
    const channel = new MatrixChannel(net, SeededLcg.subSeed(seed, 2 * index + 1));
    const meter = new ByteMeter();
    downlinks.set(socket, { channel, meter, index });
    const realSend = socket.send.bind(socket) as (data: Uint8Array) => void;
    (socket as unknown as { send: (data: unknown, ...rest: unknown[]) => void }).send =
      (data: unknown) => {
        const bytes = toBytes(data);
        meter.add(bytes.byteLength);
        channel.push(bytes, (delivered) => realSend(delivered));
      };
  });
  attachRooms(wss, hub);

  await new Promise<void>((resolveListen, rejectListen) => {
    wss.once('listening', () => resolveListen());
    wss.once('error', rejectListen);
  });
  const port = (wss.address() as AddressInfo).port;

  const clients: ClientState[] = [];

  const handleSnapshot = (state: ClientState, snapshot: SnapshotFrame): void => {
    state.snapshotsReceived += 1;
    const ownBefore = state.predictor.state.entities.find((e) => e.id === state.entityId);
    const serverOwn = snapshot.entities.find((e) => e.id === state.entityId);
    if (ownBefore && serverOwn) {
      state.corrections.push(
        Math.round(Math.hypot(serverOwn.x - ownBefore.x, serverOwn.z - ownBefore.z)),
      );
    }
    if (state.ownIdCheck === 'unverified') {
      const match = snapshot.entities.find((e) => hashEntity(snapshot.tick, e) === snapshot.viewHash);
      state.ownIdCheck = match && match.id === state.entityId ? 'match' : 'mismatch';
    }
    const verdict = state.predictor.reconcile(snapshot);
    if (verdict === 'desync') {
      state.desyncs += 1;
      if (state.predictor.needsResync) state.resyncRequests += 1;
    } else if (verdict === 'ok') {
      state.okReconciles += 1;
    } else {
      state.unknownReconciles += 1;
    }
  };

  for (let index = 0; index < 4; index += 1) {
    const state: ClientState = {
      index,
      entityId: index + 1, // room assigns entity ids in join order; connects are sequential
      intentSeq: 0,
      lcg: new SeededLcg(SeededLcg.subSeed(seed, 1000 + index)),
      predictor: new MatrixPredictor(createWorld(worldSeed, 4), index + 1),
      upChannel: new MatrixChannel(net, SeededLcg.subSeed(seed, 2 * index)),
      upMeter: new ByteMeter(),
      downMeter: null,
      ws: null,
      intentsSent: 0,
      snapshotsReceived: 0,
      okReconciles: 0,
      unknownReconciles: 0,
      desyncs: 0,
      resyncRequests: 0,
      rejectsReceived: 0,
      corrections: [],
      ownIdCheck: 'unverified',
      connected: false,
      welcomeReceived: false,
      intentTimer: null,
      helloTimer: null,
    };
    clients.push(state);

    const ws = new WebSocket(`ws://127.0.0.1:${port}/rooms?room=matrix&nonce=${index + 1}`);
    state.ws = ws;
    const realSend = ws.send.bind(ws) as (data: Uint8Array) => void;
    (ws as unknown as { send: (data: unknown, ...rest: unknown[]) => void }).send =
      (data: unknown) => {
        const bytes = toBytes(data);
        state.upMeter.add(bytes.byteLength);
        state.upChannel.push(bytes, (delivered) => realSend(delivered));
      };
    ws.on('message', (raw: Buffer | Uint8Array | ArrayBuffer) => {
      const bytes = raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw);
      let message;
      try {
        message = decodeFrame(bytes);
      } catch {
        return; // undecodable frame from the server: ignored by the harness, counted nowhere
      }
      if (message.kind === 'welcome') {
        state.welcomeReceived = true;
        if (state.helloTimer) {
          clearInterval(state.helloTimer);
          state.helloTimer = null;
        }
      } else if (message.kind === 'snapshot') {
        handleSnapshot(state, message);
      } else if (message.kind === 'reject') {
        state.rejectsReceived += 1;
      }
    });
    ws.on('open', () => {
      state.connected = true;
      const sendHello = () => {
        if (!state.welcomeReceived) {
          ws.send(encodeFrame({ kind: 'hello', version: PROTOCOL_VERSION, capabilities: 0 }));
        }
      };
      sendHello();
      // Retransmit the hello until the welcome arrives — a lost handshake must not stall the cell.
      state.helloTimer = setInterval(sendHello, 250);
    });
    await new Promise<void>((resolveOpen, rejectOpen) => {
      ws.once('open', () => resolveOpen());
      ws.once('error', rejectOpen);
    });
    // Link this client to its downlink meter (same connection order as the server-side handler).
    const downlink = [...downlinks.values()].find((d) => d.index === index);
    if (downlink) state.downMeter = downlink.meter;
  }

  const room = hub.get('matrix');
  if (!room) throw new Error('matrix room was not created by the connections');

  const tickSamples: number[] = [];
  let lastTick = 0;
  const tickTimer = setInterval(() => {
    const t0 = performance.now();
    const result = room.tick();
    tickSamples.push(performance.now() - t0);
    lastTick = result.tick;
  }, TICK_MS);

  for (const state of clients) {
    state.intentTimer = setInterval(() => {
      const dx = (state.lcg.nextInt(3) - 1) as Axis;
      const dz = (state.lcg.nextInt(3) - 1) as Axis;
      state.intentSeq += 1;
      const seq = state.intentSeq;
      state.predictor.input(seq, dx, dz);
      state.ws?.send(encodeFrame({ kind: 'intent', entity: state.entityId, seq, dx, dz }));
      state.intentsSent += 1;
    }, TICK_MS);
  }

  await sleep(durationS * 1000);

  clearInterval(tickTimer);
  for (const state of clients) {
    if (state.intentTimer) clearInterval(state.intentTimer);
    if (state.helloTimer) clearInterval(state.helloTimer);
  }
  for (const { channel } of downlinks.values()) channel.dispose();
  for (const state of clients) state.upChannel.dispose();

  await Promise.all(clients.map((state) => new Promise<void>((resolveClose) => {
    const ws = state.ws;
    if (!ws || ws.readyState === ws.CLOSED) { resolveClose(); return; }
    const force = setTimeout(() => resolveClose(), 5_000);
    ws.once('close', () => { clearTimeout(force); resolveClose(); });
    ws.close();
  })));
  await new Promise<void>((resolveWss) => wss.close(() => resolveWss()));
  hub.sweep();

  const endedUtc = new Date();
  const actualDurationS = (performance.now() - startedMs) / 1000;
  const tickStats = summarizeDurations(tickSamples);

  const clientMetrics: MatrixClientMetrics[] = clients.map((state) => {
    const downMeter = state.downMeter;
    const downBytes = downMeter?.bytes ?? 0;
    const correctionStats = summarizeDurations(state.corrections);
    return {
      index: state.index,
      entityId: state.entityId,
      connected: state.connected,
      welcomeReceived: state.welcomeReceived,
      ownIdCheck: state.ownIdCheck,
      intentsSent: state.intentsSent,
      upBytes: state.upMeter.bytes,
      upBytesPerSecond: state.upMeter.ratePerSecond(actualDurationS),
      downBytes,
      downBytesPerSecond: downMeter ? downMeter.ratePerSecond(actualDurationS) : 0,
      snapshotsReceived: state.snapshotsReceived,
      okReconciles: state.okReconciles,
      unknownReconciles: state.unknownReconciles,
      desyncs: state.desyncs,
      resyncRequests: state.resyncRequests,
      rejectsReceived: state.rejectsReceived,
      correctionMm: correctionStats,
      rubberBandMaxMm: correctionStats.max,
      upFramesLost: state.upChannel.stats.dropped,
    };
  });

  const totalDown = clientMetrics.reduce((acc, c) => acc + c.downBytes, 0);
  const totalUp = clientMetrics.reduce((acc, c) => acc + c.upBytes, 0);
  const pooledCorrections = clients.flatMap((state) => state.corrections);
  const pooledStats = summarizeDurations(pooledCorrections);
  const upFrames = clients.reduce((acc, state) => acc + state.upChannel.stats.pushed, 0);
  const upFramesDropped = clients.reduce((acc, state) => acc + state.upChannel.stats.dropped, 0);
  const downFrames = [...downlinks.values()].reduce((acc, d) => acc + d.channel.stats.pushed, 0);
  const downFramesDropped = [...downlinks.values()].reduce((acc, d) => acc + d.channel.stats.dropped, 0);

  const runId = options.runId
    ?? `${stampUtc(startedUtc)}-rtt${rttMs}-loss${lossPct}-jitter${jitterMs}-d${durationS}s`;

  const metrics: MatrixCellMetrics = {
    schema: 'netgate-matrix/1',
    run_id: runId,
    task: 'GATE:NET',
    config: {
      room: 'matrix',
      capacity: 4,
      reconnectTicks: 90,
      worldSeed,
      rttMs,
      lossPct,
      jitterMs,
      emulationSeed: seed,
      targetDurationS: durationS,
      actualDurationS,
      intentHz: TICK_HZ,
      resendsUnackedIntents: false,
      sendsResyncFrames: false,
    },
    commit: options.commit ?? null,
    started_utc: startedUtc.toISOString(),
    ended_utc: endedUtc.toISOString(),
    ticks: lastTick,
    tick_ms: tickStats,
    clients: clientMetrics,
    totals: {
      desyncs: clientMetrics.reduce((acc, c) => acc + c.desyncs, 0),
      okReconciles: clientMetrics.reduce((acc, c) => acc + c.okReconciles, 0),
      unknownReconciles: clientMetrics.reduce((acc, c) => acc + c.unknownReconciles, 0),
      intentsSent: clientMetrics.reduce((acc, c) => acc + c.intentsSent, 0),
      snapshotsReceived: clientMetrics.reduce((acc, c) => acc + c.snapshotsReceived, 0),
      intentsUpFrames: upFrames,
      intentsUpFramesDropped: upFramesDropped,
      snapshotsDownFrames: downFrames,
      snapshotsDownFramesDropped: downFramesDropped,
      downBytes: totalDown,
      upBytes: totalUp,
      downBytesPerSecond: totalDown / actualDurationS,
      upBytesPerSecond: totalUp / actualDurationS,
      perClientDownBytesPerSecond: totalDown / actualDurationS / clientMetrics.length,
      perClientUpBytesPerSecond: totalUp / actualDurationS / clientMetrics.length,
      correctionP95Mm: pooledStats.p95,
      rubberBandMaxMm: pooledStats.max,
    },
    sanity: {
      fourClientsConnected: clientMetrics.every((c) => c.connected),
      tickAdvanced: lastTick > 0,
    },
    notes: [
      'Application-level emulation (setTimeout), not tc/netem; loss drawn before jitter; seeded LCG (default 20261118).',
      'Own entity assigned by join order (sequential connects); cross-checked against the snapshot viewHash on every reconcile (ownIdCheck).',
      'Clients predict ahead of the server under latency: known current Predictor behaviour, recorded not fixed (target-tick contract lives on session/20261118-net-target-tick).',
      'Unacked intents are not retransmitted; lost intents are lost.',
      'needsResync is counted per desync reconcile; no resync frame is sent (the wire gives the client no room client id to address).',
      'up bytes counted at the client send() call; down bytes counted at the server-side socket send() call; ws framing overhead excluded.',
      'correction distance = hypot(|serverOwn.x - predictedOwn.x|, |serverOwn.z - predictedOwn.z|) rounded to integer mm, predicted position sampled before reconcile adoption.',
      'tick_ms samples only setInterval callback bodies (room.tick()), measured with performance.now().',
    ],
  };

  if (options.metricsFile) {
    const filePath = resolve(options.metricsFile);
    let arr: unknown[] = [];
    try {
      const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
      if (!Array.isArray(parsed)) throw new Error(`metrics file ${filePath} does not contain a JSON array`);
      arr = parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    arr.push(metrics);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(arr, null, 2)}\n`);
  }

  return metrics;
}
