/**
 * NET-101 / A0011-i — live gate-scoped delta downlink measurement.
 *
 * A real `ws` server, a real 64-entity room (seed 1337), four real clients and 60 server-scripted
 * NPC movers. Each mode runs for a 10 s measurement window on lossless in-process loopback delivery;
 * no packet is dropped, no retransmit is attempted and the only ack is the existing `hashack` flow.
 * Byte counts are the actual encoded bytes received by each socket, cross-checked against the
 * `encodeFrame` / `encodeDeltaFrame` length extractors. Numbers are logged, never invented.
 *
 * This is NOT RTT, NOT a soak and NOT a NET-GATE pass: it measures one wire-budget criterion on a
 * 64-entity dense room, at one radius, on one machine. Loss, jitter and sustained loss recovery stay
 * with the matrix agent; the dossier and validator stay with the parent.
 */
import type { AddressInfo } from 'node:net';
import { appendFileSync } from 'node:fs';
import type { RawData } from 'ws';
import { WebSocket, WebSocketServer } from 'ws';
import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import {
  TICK_HZ,
  type EntityState,
  type WorldState,
} from '@strata/core';
import {
  DELTA_FRAME_TYPE,
  FrameType,
  PROTOCOL_VERSION,
  baselineFromSnapshot,
  buildDelta,
  decodeDeltaFrame,
  decodeFrame,
  encodeDeltaFrame,
  encodeFrame,
  hashAoiSnapshot,
} from '@strata/protocol';
import { queryAoi } from '../../src/aoi';
import { DELTA_KEYFRAME_INTERVAL_TICKS, Room, RoomHub, attachRooms, type RoomSocket } from '../../src/rooms';

const SEED = 1337;
const CAPACITY = 64;
const NPC_FIRST = 5;
const NPC_COUNT = 60;
const CLIENT_COUNT = 4;
const ROOM_ID = 'dense-delta';
const MEASURE_MS = 10_000;
const WARMUP_MS = 250;
const SETTLE_MS = 75;
const DOWN_BUDGET_BYTES_PER_SECOND = 12 * 1024;
const TICK_MS = 1000 / TICK_HZ;

function toBytes(raw: RawData): Uint8Array {
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
  if (Array.isArray(raw)) {
    const total = raw.reduce((sum, part) => sum + part.byteLength, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of raw) { out.set(part, offset); offset += part.byteLength; }
    return out;
  }
  return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
}

/** Seeded LCG + the PR-N1 dense pattern: `dx` every 3rd tick, `dz` every 5th => 7/15 movers. */
class NpcScript {
  private state = 0x1337;
  private readonly seq = new Map<number, number>();

  apply(room: Room, tick: number): number {
    this.state = (Math.imul(this.state, 1_664_525) + 1_013_904_223) >>> 0;
    const phase = this.state % 15;
    let moving = 0;
    for (let index = 0; index < NPC_COUNT; index++) {
      const entityId = NPC_FIRST + index;
      const k = (tick + entityId + phase) % 15;
      const dx = k % 3 === 0 ? 1 : 0;
      const dz = k % 5 === 0 ? -1 : 0;
      if (dx === 0 && dz === 0) continue;
      const seq = (this.seq.get(entityId) ?? 0) + 1;
      this.seq.set(entityId, seq);
      room.sim.submit({ entity: entityId, seq, dx, dz });
      moving++;
    }
    return moving;
  }
}

interface ClientStats {
  bytes: number;
  frames: number;
  snapshots: number;
  keyframes: number;
  deltas: number;
  lastTick: number;
  lastHash: string;
  undecodable: number;
  lengthMismatch: number;
}

function freshStats(): ClientStats {
  return {
    bytes: 0, frames: 0, snapshots: 0, keyframes: 0, deltas: 0,
    lastTick: -1, lastHash: '00000000', undecodable: 0, lengthMismatch: 0,
  };
}

/** A raw socket client: it never assumes a frame kind, so it cannot hide an undecodable delta. */
class RawClient {
  readonly stats = freshStats();
  readonly socket: WebSocket;
  welcomed = false;
  private readonly errors: Error[] = [];

  constructor(url: string) {
    this.socket = new WebSocket(url);
    this.socket.on('error', (error) => { this.errors.push(error); });
    this.socket.on('message', (raw: RawData) => {
      const bytes = toBytes(raw);
      const type = bytes[0];
      if (type === FrameType.Snapshot) {
        try {
          const frame = decodeFrame(bytes);
          if (frame.kind !== 'snapshot') { this.stats.undecodable++; return; }
          if (encodeFrame(frame).byteLength !== bytes.byteLength) this.stats.lengthMismatch++;
          this.stats.snapshots++;
          this.stats.lastTick = frame.tick;
          this.stats.lastHash = frame.viewHash;
        } catch { this.stats.undecodable++; return; }
      } else if (type === DELTA_FRAME_TYPE) {
        try {
          const frame = decodeDeltaFrame(bytes);
          if (encodeDeltaFrame(frame).byteLength !== bytes.byteLength) this.stats.lengthMismatch++;
          if (frame.kind === 'delta-keyframe') this.stats.keyframes++;
          else this.stats.deltas++;
          this.stats.lastTick = frame.tick;
          this.stats.lastHash = frame.hash;
        } catch { this.stats.undecodable++; return; }
      } else {
        return; // welcome / reject frames are handshake, not downlink payload
      }
      this.stats.bytes += bytes.byteLength;
      this.stats.frames++;
    });
  }

  async open(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('client open timed out')), 8000);
      this.socket.once('open', () => { clearTimeout(timer); resolve(); });
      this.socket.once('error', (error) => { clearTimeout(timer); reject(error); });
    });
    this.socket.send(encodeFrame({ kind: 'hello', version: PROTOCOL_VERSION, capabilities: 0 }));
  }

  /** Welcome is the deterministic join proof; it is checked before any measurement starts. */
  async waitForWelcome(): Promise<void> {
    const started = performance.now();
    while (!this.welcomed) {
      for (const message of this.handshake) {
        if (message.kind === 'welcome') { this.welcomed = true; }
      }
      if (!this.welcomed && performance.now() - started > 8000) {
        throw new Error(`no welcome: ${JSON.stringify(this.errors.map((e) => e.message))}`);
      }
      if (!this.welcomed) await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  private readonly handshake: Array<ReturnType<typeof decodeFrame>> = [];

  recordHandshake(message: ReturnType<typeof decodeFrame>): void {
    this.handshake.push(message);
  }

  reset(): void {
    this.stats.bytes = 0;
    this.stats.frames = 0;
    this.stats.snapshots = 0;
    this.stats.keyframes = 0;
    this.stats.deltas = 0;
    this.stats.lastTick = -1;
    this.stats.lastHash = '00000000';
    this.stats.undecodable = 0;
    this.stats.lengthMismatch = 0;
  }

  close(): void {
    if (this.socket.readyState !== WebSocket.CLOSED) this.socket.terminate();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Measurements go to stdout and, when the harness supplies a path, straight into the evidence log. */
function recordMeasurement(line: string): void {
  console.log(line);
  const path = process.env.NET101_MEASUREMENT_LOG;
  if (path) appendFileSync(path, `${line}\n`, 'utf8');
}

interface ModeMeasurement {
  readonly wire: 'full' | 'delta';
  readonly seconds: number;
  readonly ticks: number;
  readonly entities: number;
  readonly viewSize: number;
  readonly perClient: readonly ClientStats[];
  readonly averageBytesPerSecond: number;
  readonly keyframes: number;
  readonly deltas: number;
  readonly keysPerClient: readonly number[];
}

/**
 * Run one 10 s window against a freshly created real-ws room. The hello handshake is captured by a
 * separate listener before `RawClient` starts counting downlink frames; only snapshots/deltas count.
 */
async function measure(wire: 'full' | 'delta'): Promise<ModeMeasurement> {
  const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  const hub = new RoomHub({ capacity: CAPACITY, seed: SEED, wire, reconnectTicks: 600 });
  attachRooms(wss, hub);
  await new Promise<void>((resolve, reject) => {
    wss.once('listening', resolve);
    wss.once('error', reject);
  });
  const port = (wss.address() as AddressInfo).port;
  const room = hub.create(ROOM_ID);
  const clients: RawClient[] = [];
  let timer: NodeJS.Timeout | null = null;

  try {
    for (let index = 0; index < CLIENT_COUNT; index++) {
      const client = new RawClient(`ws://127.0.0.1:${port}/rooms?room=${ROOM_ID}&nonce=${index + 1}`);
      // Handshake frames arrive before the welcome; capture them without touching byte counters.
      const onHandshake = (raw: RawData): void => {
        const bytes = toBytes(raw);
        if (bytes[0] === FrameType.Welcome || bytes[0] === FrameType.Reject) {
          try { client.recordHandshake(decodeFrame(bytes)); } catch { /* malformed handshake fails below */ }
        }
      };
      client.socket.on('message', onHandshake);
      clients.push(client);
      await client.open();
    }
    await Promise.all(clients.map((client) => client.waitForWelcome()));
    await Promise.all(clients.map(async () => {
      const started = performance.now();
      while (room.members.length < CLIENT_COUNT) {
        if (performance.now() - started > 8000) throw new Error('clients did not join the room');
        await sleep(5);
      }
    }));

    const script = new NpcScript();
    let tick = room.currentTick;
    timer = setInterval(() => {
      script.apply(room, ++tick);
      room.tick();
    }, TICK_MS);

    await sleep(WARMUP_MS);
    for (const client of clients) client.reset();
    const started = performance.now();
    const startTick = room.currentTick;
    await sleep(MEASURE_MS);
    if (timer) { clearInterval(timer); timer = null; }
    await sleep(SETTLE_MS);
    const seconds = (performance.now() - started) / 1000;
    const ticks = room.currentTick - startTick;

    const perClient = clients.map((client) => client.stats);
    const averageBytesPerSecond = perClient.reduce((sum, stats) => sum + stats.bytes, 0)
      / perClient.length / seconds;
    const state = room.sim.state;
    const viewSize = queryAoi(state, 1).length;

    recordMeasurement(
      `[NET101-AOI] wire=${wire} clients=${CLIENT_COUNT} entities=${state.entities.length} `
      + `view@viewer1=${viewSize} ticks=${ticks} seconds=${seconds.toFixed(3)} `
      + `per-client B/s=[${perClient.map((s) => (s.bytes / seconds).toFixed(3)).join(', ')}] `
      + `avg B/s=${averageBytesPerSecond.toFixed(3)} keyframes=${perClient.reduce((n, s) => n + s.keyframes, 0)} `
      + `deltas=${perClient.reduce((n, s) => n + s.deltas, 0)} snapshots=${perClient.reduce((n, s) => n + s.snapshots, 0)} `
      + `undecodable=${perClient.reduce((n, s) => n + s.undecodable, 0)}`,
    );

    return {
      wire, seconds, ticks, entities: state.entities.length, viewSize, perClient,
      averageBytesPerSecond,
      keyframes: perClient.reduce((n, s) => n + s.keyframes, 0),
      deltas: perClient.reduce((n, s) => n + s.deltas, 0),
      keysPerClient: perClient.map((s) => s.lastHash.length),
    };
  } finally {
    if (timer) clearInterval(timer);
    for (const client of clients) client.close();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  }
}

describe('NET-101 live delta downlink (A0011-i, 64-entity dense room)', () => {
  it('full snapshots connect, operate and establish the measured control', async () => {
    const result = await measure('full');
    expect(result.entities).toBe(CAPACITY);
    expect(result.ticks).toBeGreaterThan(0);
    expect(result.perClient).toHaveLength(CLIENT_COUNT);
    for (const stats of result.perClient) {
      expect(stats.frames).toBeGreaterThan(0);
      expect(stats.snapshots).toBeGreaterThan(0);
      expect(stats.keyframes).toBe(0);
      expect(stats.deltas).toBe(0);
      expect(stats.undecodable).toBe(0);
      expect(stats.lengthMismatch).toBe(0);
      expect(stats.lastTick).toBeGreaterThan(0);
    }
  }, 40_000);

  it('delta frames connect, operate and stay under 12 288 B/s/client in the dense room', async () => {
    const result = await measure('delta');
    expect(result.entities).toBe(CAPACITY);
    expect(result.ticks).toBeGreaterThan(0);
    expect(result.keyframes).toBeGreaterThan(0); // first frame re-anchors the chain
    expect(result.deltas).toBeGreaterThan(result.keyframes); // chained deltas dominate
    for (const stats of result.perClient) {
      expect(stats.frames).toBeGreaterThan(0);
      expect(stats.deltas).toBeGreaterThan(0);
      expect(stats.snapshots).toBe(0);
      expect(stats.undecodable).toBe(0);
      expect(stats.lengthMismatch).toBe(0);
      expect(stats.lastTick).toBeGreaterThan(0);
      expect(stats.lastHash).toMatch(/^[0-9a-f]{8}$/);
    }
    for (const size of result.keysPerClient) expect(size).toBe(8);
    recordMeasurement(
      `[NET101-AOI] delta avg ${result.averageBytesPerSecond.toFixed(3)} B/s/client `
      + `vs budget ${DOWN_BUDGET_BYTES_PER_SECOND} B/s — `
      + `${result.averageBytesPerSecond < DOWN_BUDGET_BYTES_PER_SECOND ? 'HOLDS' : 'MISSES'}`,
    );
    expect(result.averageBytesPerSecond).toBeLessThan(DOWN_BUDGET_BYTES_PER_SECOND);
  }, 40_000);
});

class CaptureSocket implements RoomSocket {
  readonly sent: Uint8Array[] = [];
  send(data: Uint8Array): void { this.sent.push(data); }
}

describe('NET-101 delta wiring contract (deterministic, no wall clock)', () => {
  it('sends a keyframe first and every 60 ticks, a chained delta otherwise', () => {
    const room = new Room('contract', { capacity: CAPACITY, seed: SEED, wire: 'delta' });
    const socket = new CaptureSocket();
    const client = room.join(socket);
    expect(client).not.toBeNull();
    const script = new NpcScript();
    const states: WorldState[] = [];
    for (let tick = 1; tick <= 61; tick++) {
      script.apply(room, tick);
      room.tick();
      states.push(room.sim.state);
    }
    expect(room.keyframesSent).toBe(2);
    expect(room.deltaFramesSent).toBe(59);
    expect(DELTA_KEYFRAME_INTERVAL_TICKS).toBe(60);

    const frames = socket.sent.map((bytes) => decodeDeltaFrame(bytes));
    expect(frames).toHaveLength(61);
    expect(frames[0]!.kind).toBe('delta-keyframe');
    expect(frames[60]!.kind).toBe('delta-keyframe');
    for (const frame of frames.slice(1, 60)) {
      expect(frame.kind).toBe('delta');
      if (frame.kind === 'delta') expect(frame.baseTick).toBe(frame.tick - 1);
    }

    // The frame hash is the per-client AoI view hash, recomputed at exactly that tick.
    for (let index = 0; index < frames.length; index++) {
      const state = states[index]!;
      const view = queryAoi(state, client!.entityId);
      expect(frames[index]!.hash).toBe(hashAoiSnapshot(state.tick, view));
    }

    // A forced resync re-anchors the chain immediately.
    expect(room.forceKeyframe(client!.clientId)).toBe(true);
    room.tick();
    expect(decodeDeltaFrame(socket.sent.at(-1)!).kind).toBe('delta-keyframe');
    expect(room.keyframesSent).toBe(3);
  });

  it('emits removed ids when an entity leaves the AoI', () => {
    const viewer = entity(1, 0, 0);
    const before: WorldState = { tick: 1, entities: [viewer, entity(2, 31_990, 0, 50, 0, 1)] };
    const after: WorldState = { tick: 2, entities: [viewer, entity(2, 32_040, 0, 50, 0, 2)] };
    const first = queryAoi(before, 1);
    const second = queryAoi(after, 1);
    expect(first.map((e) => e.id)).toEqual([1, 2]);
    expect(second.map((e) => e.id)).toEqual([1]);
    const baseline = baselineFromSnapshot({
      tick: 1, entities: first, hash: hashAoiSnapshot(1, first),
    });
    const delta = buildDelta(baseline, { tick: 2, entities: second, hash: hashAoiSnapshot(2, second) });
    expect(delta.kind).toBe('delta');
    if (delta.kind === 'delta') expect(delta.removed).toEqual([2]);
  });
});

function entity(id: number, x = 0, z = 0, vx = 0, vz = 0, seq = 0): EntityState {
  return { id, x, z, vx, vz, seq };
}
