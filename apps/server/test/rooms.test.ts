import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';
import type { WebSocket, WebSocketServer } from 'ws';
import { describe, expect, it } from 'vitest';
import { decodeFrame, encodeFrame } from '@strata/protocol';
import { Room, RoomHub, TokenIssuer, attachRooms, parseConnectionQuery, type RoomSocket } from '../src/rooms';

class FakeSocket implements RoomSocket {
  readonly sent: Uint8Array[] = [];
  closed = false;
  send(data: Uint8Array): void { this.sent.push(data); }
  close(): void { this.closed = true; }
}

const frames = (socket: FakeSocket) => socket.sent.map((b) => decodeFrame(b));

describe('tokens', () => {
  it('issues a deterministic, room-scoped resume handle', () => {
    const issuer = new TokenIssuer(7);
    const a = issuer.issue('arena', 1, 4);
    const b = issuer.issue('arena', 1, 4);
    expect(a).toBe(b);
    expect(a.split('.')).toHaveLength(4);
    expect(issuer.valid(a, 'arena', 1)).toBe(true);
    expect(issuer.valid(a, 'other', 1)).toBe(false);
    expect(issuer.valid(a, 'arena', 2)).toBe(false);
    expect(issuer.valid(a.replace(/.$/, '0'), 'arena', 1)).toBe(false);
  });

  it('refuses a malformed handle without throwing', () => {
    const issuer = new TokenIssuer();
    expect(issuer.parse('')).toBeNull();
    expect(issuer.parse('arena.1.2')).toBeNull();
    expect(issuer.parse('arena.x.2.abcdef')).toBeNull();
    expect(issuer.valid('bad', 'arena', 1)).toBe(false);
  });
});

describe('room membership', () => {
  it('assigns entity ids itself and refuses a full room', () => {
    const room = new Room('arena', { capacity: 2, seed: 4 });
    const a = room.join(new FakeSocket());
    const b = room.join(new FakeSocket());
    expect(a?.entityId).toBe(1);
    expect(b?.entityId).toBe(2);
    expect(a?.clientId).not.toBe(b?.clientId);
    expect(room.join(new FakeSocket())).toBeNull();
  });

  it('derives the seed from the room id unless one is given', () => {
    const a = new Room('arena');
    const b = new Room('arena');
    const c = new Room('other');
    expect(a.hash).toBe(b.hash);
    expect(a.hash).not.toBe(c.hash);
  });
});

describe('reconnect', () => {
  it('reclaims the same entity on resume and emits a reconnect event', () => {
    const room = new Room('arena', { seed: 3, reconnectTicks: 5 });
    const socket = new FakeSocket();
    const client = room.join(socket)!;
    room.disconnect(client.clientId);
    expect(room.phase).toBe('draining');
    expect(room.resume(client.token, new FakeSocket())?.entityId).toBe(client.entityId);
    expect(room.phase).toBe('open');
    expect(room.tick().events.some((e) => e.kind === 'reconnected')).toBe(true);
  });

  it('carries the per-entity applied seq so the client knows what to replay', () => {
    const room = new Room('arena', { seed: 3, reconnectTicks: 5 });
    const client = room.join(new FakeSocket())!;
    room.handleBytes(client.clientId, encodeFrame({ kind: 'intent', entity: 1, seq: 9, dx: 1, dz: 0 }));
    room.tick();
    const snapshot = room.snapshotFor(client)!;
    expect(snapshot.appliedSeq).toBe(9);
    expect(snapshot.hash).toBe(room.hash);
    expect(snapshot.entities).toHaveLength(1);
  });

  it('refuses a stale handle and evicts it after the window', () => {
    const room = new Room('arena', { seed: 3, reconnectTicks: 2 });
    const client = room.join(new FakeSocket())!;
    room.disconnect(client.clientId);
    room.tick(); // 1 tick away
    expect(room.resume(client.token, new FakeSocket())).not.toBeNull();
    room.disconnect(client.clientId);
    room.tick(); room.tick(); room.tick(); // 3 > 2
    expect(room.members).toHaveLength(0);
    expect(room.phase).toBe('closed');
    expect(room.resume(client.token, new FakeSocket())).toBeNull();
  });

  it('refuses a handle for a client that is still connected', () => {
    const room = new Room('arena', { seed: 3 });
    const a = room.join(new FakeSocket())!;
    const b = room.join(new FakeSocket())!;
    room.disconnect(b.clientId);
    expect(room.resume(a.token, new FakeSocket())).toBeNull(); // a never left
    expect(room.resume(b.token, new FakeSocket())?.clientId).toBe(b.clientId);
  });
});

describe('authoritative frames', () => {
  it('applies intents to the host and broadcasts one snapshot per connected client', () => {
    const room = new Room('arena', { seed: 3 });
    const socketA = new FakeSocket();
    const socketB = new FakeSocket();
    const a = room.join(socketA)!;
    const b = room.join(socketB)!;
    expect(room.handleBytes(a.clientId, encodeFrame({ kind: 'intent', entity: 1, seq: 1, dx: 1, dz: 0 }))).toBe(true);
    const result = room.tick();
    expect(result.tick).toBe(1);
    expect(frames(socketA)).toEqual(frames(socketB));
    expect(frames(socketA)[0]).toMatchObject({ kind: 'snapshot', tick: 1, hash: room.hash, appliedSeq: 1 });
    expect(room.sim.state.entities.find((e) => e.id === b.entityId)?.seq).toBe(0);
  });

  it('drops a replayed seq and emits a rejection reason', () => {
    const room = new Room('arena', { seed: 3 });
    const client = room.join(new FakeSocket())!;
    const intent = encodeFrame({ kind: 'intent', entity: 1, seq: 5, dx: 1, dz: 0 });
    expect(room.handleBytes(client.clientId, intent)).toBe(true);
    expect(room.handleBytes(client.clientId, intent)).toBe(false);
    expect(room.tick().events.some((e) => e.kind === 'rejected-intent')).toBe(true);
  });

  it('answers a hello with the negotiated version and refuses a foreign one', () => {
    const room = new Room('arena', { seed: 3 });
    const socket = new FakeSocket();
    const client = room.join(socket)!;
    expect(room.handleBytes(client.clientId, encodeFrame({ kind: 'hello', version: 2, capabilities: 1 }))).toBe(true);
    expect(room.handleBytes(client.clientId, encodeFrame({ kind: 'hello', version: 1, capabilities: 0 }))).toBe(false);
    expect(frames(socket)[0]).toMatchObject({ kind: 'welcome', version: 2 });
    expect(frames(socket)[1]).toMatchObject({ kind: 'reject', reason: 'version' });
  });

  it('emits desync on a wrong hash, not on an unknown tick', () => {
    const room = new Room('arena', { seed: 3 });
    const client = room.join(new FakeSocket())!;
    room.tick();
    const good = room.hash;
    expect(room.handleBytes(client.clientId, encodeFrame({ kind: 'hashack', client: 1, tick: 1, hash: good }))).toBe(true);
    expect(room.handleBytes(client.clientId, encodeFrame({ kind: 'hashack', client: 1, tick: 999, hash: good }))).toBe(true);
    expect(room.handleBytes(client.clientId, encodeFrame({ kind: 'hashack', client: 1, tick: 1, hash: 'deadbeef' }))).toBe(false);
    expect(room.tick().events.filter((e) => e.kind === 'desync')).toHaveLength(1);
  });

  it('refuses malformed bytes and a client-sent snapshot', () => {
    const room = new Room('arena', { seed: 3 });
    const client = room.join(new FakeSocket())!;
    expect(room.handleBytes(client.clientId, new Uint8Array([0xff]))).toBe(false);
    expect(room.handleBytes(client.clientId, encodeFrame(room.snapshotFor(client)!))).toBe(false);
  });
});

describe('hub and determinism', () => {
  it('creates a room once per id and sweeps closed rooms', () => {
    const hub = new RoomHub({ seed: 8, capacity: 1, reconnectTicks: 0 });
    const first = hub.create('arena');
    expect(hub.create('arena')).toBe(first);
    expect(hub.size).toBe(1);
    first.join(new FakeSocket());
    first.close();
    expect(hub.sweep()).toEqual(['arena']);
    expect(hub.size).toBe(0);
  });

  it('two hubs with the same room id and intents hash identically at every tick', () => {
    const run = () => {
      const hub = new RoomHub({ seed: 11, capacity: 2 });
      const client = hub.join('arena', new FakeSocket())!;
      const hashes: string[] = [];
      for (let seq = 1; seq <= 40; seq++) {
        hub.get('arena')!.handleBytes(client.clientId, encodeFrame({ kind: 'intent', entity: 1, seq, dx: seq % 2, dz: 0 }));
        hashes.push(hub.get('arena')!.tick().hash);
      }
      return hashes;
    };
    expect(run()).toEqual(run());
  });
});

describe('ws adapter boundary', () => {
  it('parses the upgrade query and refuses invalid input', () => {
    expect(parseConnectionQuery('/rooms?room=arena&token=a.1.2.deadbeef'))
      .toEqual({ roomId: 'arena', token: 'a.1.2.deadbeef', nonce: null });
    expect(parseConnectionQuery('/rooms?room=arena&nonce=7'))
      .toEqual({ roomId: 'arena', token: null, nonce: 7 });
    expect(parseConnectionQuery('/rooms?room=arena&nonce=x')).toBeNull();
    expect(parseConnectionQuery('/rooms')).toBeNull();
  });

  it('sends a reject frame and closes a connection without room or handle', () => {
    const hub = new RoomHub({ seed: 3 });
    const wss = new EventEmitter();
    attachRooms(wss as unknown as WebSocketServer, hub);
    const socket = new FakeSocket();
    wss.emit('connection', socket as unknown as WebSocket, { url: '/rooms' } as IncomingMessage);
    expect(socket.closed).toBe(true);
    expect(decodeFrame(socket.sent[0]!)).toMatchObject({ kind: 'reject', reason: 'unauthorized' });
  });
});
