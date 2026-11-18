/**
 * Authoritative room lifecycle (NET-003). A room owns membership, reconnect windows and session resume
 * handles around the NET-001 `SimHost`. It knows nothing about a transport: a socket is anything with
 * `send(Uint8Array)`, so the `ws` adapter is replaceable without touching lifecycle (A0004).
 *
 * No wall clock here: the caller ticks rooms. No auth here: a handle is a resume hint, not a credential
 * (SEC-001). No persistence: a process restart loses rooms by design.
 */
import { fnv1a32 } from '@strata/core';
import {
  SUPPORTED_MAX_VERSION, SUPPORTED_MIN_VERSION, decodeFrame, encodeFrame, negotiate, snapshotFromWorld,
  type SnapshotFrame, type WireMessage,
} from '@strata/protocol';
import { SimHost } from '../sim/host';
import { TokenIssuer } from './tokens';

/** Minimal transport contract. A `ws` socket satisfies it with an adapter. */
export interface RoomSocket {
  send(data: Uint8Array): void;
}

export type RoomPhase = 'open' | 'draining' | 'closed';
export type RoomEventKind = 'desync' | 'rejected-intent' | 'reconnected' | 'evicted' | 'closed';

export interface RoomEvent {
  readonly kind: RoomEventKind;
  readonly roomId: string;
  readonly clientId: number;
  readonly tick: number;
}

export interface RoomClient {
  readonly clientId: number;
  readonly entityId: number;
  readonly token: string;
  socket: RoomSocket | null;
  disconnectedAtTick: number | null;
}

export interface RoomOptions {
  /** Simulation seed. Defaults to a hash of the room id, so the same id spawns the same world. */
  readonly seed?: number;
  /** Authoritative entities in the room. */
  readonly capacity?: number;
  /** Ticks a handle may stay away before eviction. 30 ticks = 1 s at 30 Hz. */
  readonly reconnectTicks?: number;
}

/** Tick at which the room currently is, plus the events that tick produced. */
export interface RoomTick {
  readonly tick: number;
  readonly hash: string;
  readonly events: readonly RoomEvent[];
}

function seedFromId(id: string): number {
  const codes: number[] = [];
  for (let i = 0; i < id.length; i++) codes.push(id.charCodeAt(i));
  return fnv1a32(codes);
}

export class Room {
  private readonly host: SimHost;
  private readonly issuer: TokenIssuer;
  private readonly clients = new Map<number, RoomClient>();
  private readonly submittedSeq = new Map<number, number>();
  private nextClientId = 1;
  private nextNonce = 1;
  private phaseValue: RoomPhase = 'open';
  private tickValue = 0;
  private readonly events: RoomEvent[] = [];
  readonly capacity: number;
  readonly reconnectTicks: number;

  constructor(readonly id: string, readonly options: RoomOptions = {}) {
    const seed = options.seed ?? seedFromId(id);
    this.capacity = options.capacity ?? 2;
    this.reconnectTicks = options.reconnectTicks ?? 30;
    if (!Number.isInteger(this.capacity) || this.capacity < 1) throw new RangeError('capacity must be positive');
    if (!Number.isInteger(this.reconnectTicks) || this.reconnectTicks < 0) throw new RangeError('reconnectTicks must be non-negative');
    this.host = new SimHost(seed, this.capacity);
    this.issuer = new TokenIssuer(seed);
  }

  get currentTick(): number { return this.tickValue; }
  get phase(): RoomPhase { return this.phaseValue; }
  get members(): readonly RoomClient[] { return [...this.clients.values()]; }
  get hash(): string { return this.host.hash; }
  get sim(): SimHost { return this.host; }

  private emit(kind: RoomEventKind, clientId: number): void {
    this.events.push({ kind, roomId: this.id, clientId, tick: this.tickValue });
  }

  /** Attach a new client to the first free entity. Identity comes from the room, never from the client. */
  join(socket: RoomSocket): RoomClient | null {
    if (this.phaseValue === 'closed') return null;
    const used = new Set(this.members.map((c) => c.entityId));
    let entityId = 0;
    for (let id = 1; id <= this.capacity; id++) {
      if (!used.has(id)) { entityId = id; break; }
    }
    if (entityId === 0) return null; // room full
    const clientId = this.nextClientId++;
    const client: RoomClient = {
      clientId,
      entityId,
      token: this.issuer.issue(this.id, clientId, this.nextNonce++),
      socket,
      disconnectedAtTick: null,
    };
    this.clients.set(clientId, client);
    this.phaseValue = 'open';
    return client;
  }

  /** Reclaim the same entity from a handle within the reconnect window. Never issues a new entity id. */
  resume(token: string, socket: RoomSocket): RoomClient | null {
    if (this.phaseValue === 'closed') return null;
    const parsed = this.issuer.parse(token);
    if (!parsed || !this.issuer.valid(token, this.id, parsed.clientId)) return null;
    const client = this.clients.get(parsed.clientId);
    if (!client || client.socket !== null || client.disconnectedAtTick === null) return null;
    if (this.tickValue - client.disconnectedAtTick > this.reconnectTicks) return null;
    client.socket = socket;
    client.disconnectedAtTick = null;
    this.phaseValue = 'open';
    this.emit('reconnected', client.clientId);
    return client;
  }

  disconnect(clientId: number): void {
    const client = this.clients.get(clientId);
    if (!client || client.socket === null) return;
    client.socket = null;
    client.disconnectedAtTick = this.tickValue;
    this.phaseValue = 'draining';
  }

  /**
   * Snapshot for one client: the whole world (needed to interpolate other players) plus `viewHash`,
   * the hash of that client's own entity, and its own applied seq. A client cannot predict remote
   * intents, so the global hash is audit-only (A0010 / NET-104).
   */
  snapshotFor(client: RoomClient): SnapshotFrame | null {
    const entity = this.host.state.entities.find((e) => e.id === client.entityId);
    if (!entity) return null;
    return snapshotFromWorld(this.host.state, this.hash, client.entityId, entity.seq);
  }

  private send(client: RoomClient, message: WireMessage): void {
    if (client.socket) client.socket.send(encodeFrame(message));
  }

  /** Decode one inbound frame. Returns false for malformed bytes, a refused intent or a desync ack. */
  handleBytes(clientId: number, bytes: Uint8Array): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.socket === null) return false;
    let message: WireMessage;
    try {
      message = decodeFrame(bytes);
    } catch {
      return false; // malformed wire: SEC-001 owns counting and rate limits
    }

    if (message.kind === 'hello') {
      this.send(client, negotiate(message.version));
      return message.version >= SUPPORTED_MIN_VERSION && message.version <= SUPPORTED_MAX_VERSION;
    }
    if (message.kind === 'intent') {
      const previous = this.submittedSeq.get(client.entityId) ?? 0;
      if (message.seq <= previous) {
        this.emit('rejected-intent', clientId);
        return false; // replay or stale intent: never enqueue it twice
      }
      const accepted = this.host.submit({
        entity: client.entityId, seq: message.seq, dx: message.dx, dz: message.dz,
      });
      if (accepted) this.submittedSeq.set(client.entityId, message.seq);
      else this.emit('rejected-intent', clientId);
      return accepted;
    }
    if (message.kind === 'hashack') {
      const verdict = this.host.ack(message.tick, message.hash);
      if (verdict === 'desync') this.emit('desync', clientId);
      return verdict !== 'desync';
    }
    return false; // a server does not accept snapshots from clients (I1)
  }

  /** Advance the authoritative tick, send each client its own snapshot, then sweep handles. */
  tick(): RoomTick {
    const result = this.host.step();
    this.tickValue = result.tick;
    for (const client of this.members) {
      const snapshot = this.snapshotFor(client);
      if (snapshot) this.send(client, snapshot);
    }

    for (const client of this.members) {
      if (client.socket === null && client.disconnectedAtTick !== null
        && this.tickValue - client.disconnectedAtTick > this.reconnectTicks) {
        this.clients.delete(client.clientId);
        this.emit('evicted', client.clientId);
      }
    }
    if (this.clients.size === 0) {
      this.phaseValue = 'closed';
      this.emit('closed', 0);
    }
    const pending = this.events.splice(0, this.events.length);
    return { tick: this.tickValue, hash: result.hash, events: pending };
  }

  close(): void {
    for (const client of this.members) {
      client.socket = null;
      this.emit('closed', client.clientId);
    }
    this.phaseValue = 'closed';
  }
}

/** Rooms indexed by id. `create` is idempotent so the same id always gets the same seed. */
export class RoomHub {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly options: RoomOptions = {}) {}

  get size(): number { return this.rooms.size; }
  get ids(): readonly string[] { return [...this.rooms.keys()]; }
  get(id: string): Room | null { return this.rooms.get(id) ?? null; }

  create(id: string): Room {
    let room = this.rooms.get(id);
    if (!room) {
      room = new Room(id, this.options);
      this.rooms.set(id, room);
    }
    return room;
  }

  join(roomId: string, socket: RoomSocket): RoomClient | null {
    return this.create(roomId).join(socket);
  }

  resume(roomId: string, token: string, socket: RoomSocket): RoomClient | null {
    return this.create(roomId).resume(token, socket);
  }

  /** Remove closed rooms; returns their ids so a caller can log or emit telemetry. */
  sweep(): readonly string[] {
    const removed: string[] = [];
    for (const [id, room] of this.rooms) {
      if (room.phase === 'closed') { this.rooms.delete(id); removed.push(id); }
    }
    return removed;
  }
}
