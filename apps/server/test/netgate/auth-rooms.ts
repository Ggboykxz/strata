/**
 * GATE:NET prototype — authentication in front of `attachRooms`.
 *
 * `attachRooms` is unchanged production code. This harness-only wrapper listens on the real `WebSocketServer`,
 * verifies an HMAC session token from the upgrade URL, and only then re-emits the connection to a private
 * relay on which `attachRooms` is registered. A missing, malformed, wrong-room, tampered or expired token is
 * answered with an `unauthorized` reject and a 1008 close, and `attachRooms` never sees the socket — so no
 * room membership, entity id or resume handle is created.
 *
 * This is NOT the production auth design: the token lives in a query string, there is no identity provider,
 * key rotation, revocation list or binding to the room's internal client id. It measures a boundary only.
 */
import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';
import type { WebSocket, WebSocketServer } from 'ws';
import { PROTOCOL_VERSION, encodeFrame } from '@strata/protocol';
import { attachRooms, type RoomHub } from '../../src/rooms';
import { verifyToken, type TokenClaims } from './hmac-token';

export interface AuthOptions {
  readonly secret: string;
  /** Injectable clock for expiry tests. Defaults to `Date.now`. */
  readonly now?: () => number;
}

export interface AuthRequest {
  readonly roomId: string;
  readonly token: string | null;
}

/** Parse only what the auth boundary needs. The room adapter parses the rest. */
export function parseAuthQuery(url: string | undefined): AuthRequest | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, 'http://localhost');
    const roomId = parsed.searchParams.get('room');
    if (!roomId) return null;
    return { roomId, token: parsed.searchParams.get('auth') };
  } catch {
    return null;
  }
}

function refuse(socket: WebSocket): void {
  socket.send(encodeFrame({ kind: 'reject', version: PROTOCOL_VERSION, reason: 'unauthorized' }));
  socket.close(1008, 'unauthorized');
}

/**
 * Install the auth boundary. Must be the first `connection` listener on `wss`: a later listener added by
 * another caller would bypass it. Returns the relay that `attachRooms` owns.
 */
export function attachAuthenticatedRooms(
  wss: WebSocketServer,
  hub: RoomHub,
  options: AuthOptions,
): WebSocketServer {
  if (wss.listenerCount('connection') > 0) {
    throw new Error('attachAuthenticatedRooms must be registered before any other connection listener');
  }
  const relay = new EventEmitter() as unknown as WebSocketServer;
  attachRooms(relay, hub);

  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    const query = parseAuthQuery(request.url);
    const verdict = verifyToken(
      options.secret,
      query?.token ?? null,
      query?.roomId ?? '',
      options.now?.() ?? Date.now(),
    );
    if (!verdict.ok) { refuse(socket); return; }
    const claims: TokenClaims = verdict.claims;
    // Observable for tests and logs without putting the token or secret anywhere.
    (request as IncomingMessage & { strataClaims?: TokenClaims }).strataClaims = claims;
    relay.emit('connection', socket, request);
  });

  return relay;
}
