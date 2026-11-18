/**
 * `ws` transport adapter for NET-003 (A0004). The only file that imports `ws` in the rooms module.
 *
 * The resume handle and room id travel in the upgrade URL (`?room=<id>&token=<handle>` or
 * `?room=<id>&nonce=<n>`), because protocol v2 has no field for them and adding one would be NET-002 scope.
 * SEC-001 must replace this with an authenticated frame before any public deployment; the handle is not a
 * credential (see A0004).
 */
import type { IncomingMessage } from 'node:http';
import type { WebSocket, WebSocketServer } from 'ws';
import { PROTOCOL_VERSION, encodeFrame } from '@strata/protocol';
import { MessageGate } from '../validation';
import { RoomHub, type Room, type RoomClient } from './room';

export interface ConnectionQuery {
  readonly roomId: string;
  readonly token: string | null;
  readonly nonce: number | null;
}

/** Parse the upgrade query. Returns null on a missing room id or a non-integer nonce. */
export function parseConnectionQuery(url: string): ConnectionQuery | null {
  try {
    const parsed = new URL(url, 'http://localhost');
    const roomId = parsed.searchParams.get('room');
    if (!roomId) return null;
    const token = parsed.searchParams.get('token');
    const nonceText = parsed.searchParams.get('nonce');
    let nonce: number | null = null;
    if (nonceText !== null) {
      if (!/^\d+$/.test(nonceText)) return null;
      nonce = Number(nonceText);
      if (!Number.isSafeInteger(nonce)) return null;
    }
    return { roomId, token, nonce };
  } catch {
    return null;
  }
}

function reject(socket: WebSocket): void {
  socket.send(encodeFrame({ kind: 'reject', version: 2, reason: 'unauthorized' }));
  socket.close();
}

/** Bind rooms to an existing WebSocketServer. Caller owns the server and the tick loop. */
export function attachRooms(wss: WebSocketServer, hub: RoomHub): void {
  const gate = new MessageGate(); // SEC-002: no frame reaches a room without validation
  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    const query = parseConnectionQuery(request.url ?? '/');
    if (!query) { reject(socket); return; }

    let room: Room;
    let client: RoomClient | null;
    if (query.token !== null) {
      room = hub.create(query.roomId);
      client = room.resume(query.token, socket);
    } else if (query.nonce !== null) {
      room = hub.create(query.roomId);
      client = room.join(socket);
      if (client) {
        // The nonce is the caller's replay counter for this connection attempt; it is not trusted for identity.
        void query.nonce;
      }
    } else {
      reject(socket);
      return;
    }

    if (!client) { reject(socket); return; }
    const clientId = client.clientId;

    socket.on('message', (raw) => {
      const bytes: Uint8Array = raw instanceof ArrayBuffer
        ? new Uint8Array(raw)
        : new Uint8Array(raw as ArrayLike<number>);
      const verdict = gate.accept(clientId, room.currentTick, bytes);
      if (!verdict.allowed) {
        socket.send(encodeFrame({ kind: 'reject', version: PROTOCOL_VERSION, reason: 'malformed' }));
        return;
      }
      room.handleBytes(clientId, bytes);
    });
    socket.on('close', () => room.disconnect(clientId));
  });
}
