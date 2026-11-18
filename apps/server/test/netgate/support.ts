/**
 * NET-GATE measurement harness — real loopback `ws` rooms.
 *
 * This file is test support, not production code. It starts a real `WebSocketServer` on an ephemeral
 * 127.0.0.1 port, binds `RoomHub`/`attachRooms`, and drives four real `ws` clients at 30 Hz against a
 * 30 Hz authoritative tick. Wall-clock numbers are measured here, never simulated.
 */
import type { AddressInfo } from 'node:net';
import type { RawData } from 'ws';
import { WebSocket, WebSocketServer } from 'ws';
import { performance } from 'node:perf_hooks';
import { PROTOCOL_VERSION, decodeFrame, encodeFrame, type SnapshotFrame, type WireMessage } from '@strata/protocol';
import { TICK_HZ, type Axis } from '@strata/core';
import { RoomHub, attachRooms, type Room, type RoomEvent } from '../../src/rooms';

export const TICK_MS = 1000 / TICK_HZ;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export function now(): number {
  return performance.now();
}

export function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

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

export interface LiveServer {
  readonly wss: WebSocketServer;
  readonly hub: RoomHub;
  readonly room: Room;
  readonly port: number;
  url(roomId: string, query: string): string;
  close(): Promise<void>;
}

export interface LiveServerOptions {
  readonly roomId?: string;
  readonly capacity?: number;
  readonly reconnectTicks?: number;
  readonly seed?: number;
}

/** Start a real WebSocketServer on port 0, bind the room adapter, and create the measured room. */
export async function startLiveServer(options: LiveServerOptions = {}): Promise<LiveServer> {
  const roomId = options.roomId ?? 'netgate';
  const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  const hub = new RoomHub({
    capacity: options.capacity ?? 4,
    reconnectTicks: options.reconnectTicks ?? 90,
    seed: options.seed ?? 0x5eed,
  });
  attachRooms(wss, hub);
  await new Promise<void>((resolve, reject) => {
    wss.once('listening', resolve);
    wss.once('error', reject);
  });
  const address = wss.address() as AddressInfo;
  const room = hub.create(roomId);
  return {
    wss,
    hub,
    room,
    port: address.port,
    url(id: string, query: string): string {
      return `ws://127.0.0.1:${address.port}/rooms?room=${encodeURIComponent(id)}&${query}`;
    },
    async close(): Promise<void> {
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    },
  };
}

/** One logical client. Reusing the instance across a reconnect keeps its seq and snapshot history. */
export class SocketClient {
  readonly messages: WireMessage[] = [];
  readonly snapshots = new Map<number, SnapshotFrame>();
  readonly errors: Error[] = [];
  ws: WebSocket | null = null;
  entityId = 0;
  clientId = 0;
  seq = 0;
  paused = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(readonly label: string) {}

  get welcomed(): boolean {
    return this.messages.some((message) => message.kind === 'welcome');
  }

  /** Open a connection and send hello. Message handlers are attached before the open event. */
  async open(url: string, withHello = true): Promise<void> {
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.on('message', (raw) => {
      const message = decodeFrame(toBytes(raw));
      this.messages.push(message);
      if (message.kind === 'snapshot') this.snapshots.set(message.tick, message);
    });
    ws.on('error', (error) => { this.errors.push(error); });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${this.label}: open timed out`)), 8000);
      ws.once('open', () => { clearTimeout(timer); resolve(); });
      ws.once('error', (error) => { clearTimeout(timer); reject(error); });
    });
    if (withHello) ws.send(encodeFrame({ kind: 'hello', version: PROTOCOL_VERSION, capabilities: 0 }));
  }

  /** Abrupt disconnect: no close frame, like a browser tab killed at the network edge. */
  async terminate(): Promise<void> {
    const ws = this.ws;
    if (!ws) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 1000);
      ws.once('close', () => { clearTimeout(timer); resolve(); });
      ws.terminate();
    });
  }

  async close(): Promise<void> {
    this.stopIntents();
    const ws = this.ws;
    if (!ws) return;
    await new Promise<void>((resolve) => {
      if (ws.readyState === WebSocket.CLOSED) { resolve(); return; }
      const timer = setTimeout(resolve, 1000);
      ws.once('close', () => { clearTimeout(timer); resolve(); });
      ws.close();
    });
  }

  /** Send one intent per 30 Hz tick. The sequence is monotonic for the lifetime of the client. */
  startIntents(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (this.paused) return;
      const ws = this.ws;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      this.seq++;
      const dx: Axis = this.seq % 3 === 0 ? 1 : this.seq % 3 === 1 ? -1 : 0;
      const dz: Axis = this.seq % 5 < 2 ? 1 : this.seq % 5 < 4 ? -1 : 0;
      ws.send(encodeFrame({ kind: 'intent', entity: this.entityId, seq: this.seq, dx, dz }));
    }, TICK_MS);
  }

  stopIntents(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  latestSnapshot(): SnapshotFrame | undefined {
    let latest: SnapshotFrame | undefined;
    for (const snapshot of this.snapshots.values()) {
      if (!latest || snapshot.tick > latest.tick) latest = snapshot;
    }
    return latest;
  }

  /** Wait until a snapshot strictly after `afterTick` arrives. */
  async waitForSnapshot(afterTick: number, timeoutMs = 4000): Promise<SnapshotFrame> {
    const deadline = now() + timeoutMs;
    for (;;) {
      for (const snapshot of this.snapshots.values()) {
        if (snapshot.tick > afterTick) return snapshot;
      }
      if (now() > deadline) throw new Error(`${this.label}: no snapshot after tick ${afterTick}`);
      await sleep(2);
    }
  }
}

/** Attempt a connection that is expected to be refused. Returns every frame before close. */
export async function attemptRefusedConnection(url: string, timeoutMs = 2000): Promise<{ messages: WireMessage[]; closed: boolean }> {
  const ws = new WebSocket(url);
  const messages: WireMessage[] = [];
  ws.on('message', (raw) => { messages.push(decodeFrame(toBytes(raw))); });
  const closed = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    const done = (): void => { clearTimeout(timer); resolve(true); };
    ws.once('close', done);
    ws.once('error', done);
  });
  return { messages, closed };
}

/** Real 30 Hz authoritative tick driven by the wall clock. */
export class Ticker {
  ticks = 0;
  readonly events: RoomEvent[] = [];
  private readonly timer: NodeJS.Timeout;

  constructor(private readonly room: Room, maxTicks = 100_000) {
    this.timer = setInterval(() => {
      if (this.ticks >= maxTicks) return;
      const result = this.room.tick();
      this.ticks = result.tick;
      this.events.push(...result.events);
    }, TICK_MS);
  }

  async waitTicks(target: number, timeoutMs = 20_000): Promise<void> {
    const deadline = now() + timeoutMs;
    while (this.ticks < target) {
      if (now() > deadline) throw new Error(`tick driver stalled at ${this.ticks}, wanted ${target}`);
      await sleep(2);
    }
  }

  stop(): void {
    clearInterval(this.timer);
  }
}

/** Poll the authoritative room until the server has seen the socket close. */
export async function waitForDisconnect(room: Room, clientId: number, timeoutMs = 2000): Promise<number> {
  const deadline = now() + timeoutMs;
  for (;;) {
    const member = room.members.find((candidate) => candidate.clientId === clientId);
    if (member && member.socket === null && member.disconnectedAtTick !== null) return member.disconnectedAtTick;
    if (now() > deadline) throw new Error(`client ${clientId} was not marked disconnected`);
    await sleep(2);
  }
}

export function entitySeq(room: Room, entityId: number): number {
  const entity = room.sim.state.entities.find((candidate) => candidate.id === entityId);
  if (!entity) throw new Error(`entity ${entityId} is not in the world`);
  return entity.seq;
}

/**
 * Wait until an entity's applied seq stops moving. Used after stopping a client's intent timer so the
 * abrupt disconnect cannot race an in-flight message: once the seq is stable, a late duplicate would be
 * refused by the room's per-entity seq check, not applied to the resumed connection.
 */
export async function settleEntitySeq(room: Room, entityId: number, stableReads = 3, timeoutMs = 3000): Promise<number> {
  let previous = -1;
  let stable = 0;
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    const seq = entitySeq(room, entityId);
    if (seq === previous) {
      stable++;
      if (stable >= stableReads) return seq;
    } else {
      previous = seq;
      stable = 0;
    }
    await sleep(5);
  }
  return entitySeq(room, entityId);
}

/** Connect four clients one at a time so join order, clientId and entityId are deterministic. */
export async function connectFour(server: LiveServer): Promise<SocketClient[]> {
  const clients: SocketClient[] = [];
  for (let index = 1; index <= 4; index++) {
    const client = new SocketClient(`client-${index}`);
    await client.open(server.url(server.room.id, `nonce=${index}`));
    clients.push(client);
  }
  const joinDeadline = now() + 15000;
  while (server.room.members.length < 4) {
    if (now() > joinDeadline) throw new Error(`only ${server.room.members.length}/4 clients joined the room`);
    await sleep(2);
  }
  const members = [...server.room.members].sort((a, b) => a.clientId - b.clientId);
  for (let index = 0; index < clients.length; index++) {
    const member = members[index];
    const client = clients[index];
    if (!member || !client) throw new Error('member mapping failed');
    client.clientId = member.clientId;
    client.entityId = member.entityId;
  }
  return clients;
}
