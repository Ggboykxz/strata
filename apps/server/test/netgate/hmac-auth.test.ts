/**
 * GATE:NET prototype — HMAC token verification before `attachRooms`, over real loopback sockets.
 *
 * The pure tests pin the token contract. The socket tests pin the boundary: a bad credential must be refused
 * before any room exists, and a good credential must still reach the unchanged SEC-002 room path.
 */
import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { encodeFrame } from '@strata/protocol';
import { RoomHub } from '../../src/rooms';
import { generateSecret, issueToken, verifyToken } from './hmac-token';
import { closeClient, startRoomServer, trackFrames, waitFor, waitOpen, type RoomServer } from './harness';

function tamperPayload(token: string): string {
  const [version, payload, signature] = token.split('.');
  if (!version || !payload || !signature) throw new Error('test token is malformed');
  const first = payload.startsWith('A') ? 'B' : 'A';
  return `${version}.${first}${payload.slice(1)}.${signature}`;
}

async function expectRefused(server: RoomServer, url: string, roomId: string): Promise<string> {
  const client = new WebSocket(url);
  const captured = trackFrames(client);
  await waitFor(() => captured.frames.length > 0, `refusal frame for ${roomId}`);
  await waitFor(() => client.readyState === WebSocket.CLOSED, `refusal close for ${roomId}`);
  expect(captured.undecodable).toHaveLength(0);
  expect(captured.frames[0]).toMatchObject({ kind: 'reject', version: 3, reason: 'unauthorized' });
  expect(server.hub.get(roomId)).toBeNull();
  await closeClient(client);
  return (captured.frames[0] as { reason: string }).reason;
}

describe('HMAC-SHA256 session token', () => {
  it('round-trips claims and binds clientId, roomId and expiry', () => {
    const secret = generateSecret();
    const now = Date.now();
    const token = issueToken(secret, { clientId: 7, roomId: 'arena', expiresAt: now + 60_000 }, now);
    expect(token).not.toContain(secret);
    const verdict = verifyToken(secret, token, 'arena', now);
    expect(verdict).toMatchObject({ ok: true, claims: { clientId: 7, roomId: 'arena' } });
  });

  it('refuses a tampered payload, a forged signature, a wrong room, expiry and missing input', () => {
    const secret = generateSecret();
    const now = Date.now();
    const token = issueToken(secret, { clientId: 7, roomId: 'arena', expiresAt: now + 60_000 }, now);
    expect(verifyToken(secret, tamperPayload(token), 'arena', now)).toMatchObject({ ok: false, reason: 'bad-signature' });

    const [, payload] = token.split('.');
    const forged = `v1.${payload}.${'A'.repeat(43)}`;
    expect(verifyToken(secret, forged, 'arena', now)).toMatchObject({ ok: false, reason: 'bad-signature' });
    expect(verifyToken(secret, token, 'other', now)).toMatchObject({ ok: false, reason: 'room-mismatch' });
    expect(verifyToken(secret, token, 'arena', now + 60_001)).toMatchObject({ ok: false, reason: 'expired' });
    expect(verifyToken(secret, null, 'arena', now)).toMatchObject({ ok: false, reason: 'missing' });
    expect(verifyToken(secret, 'not-a-token', 'arena', now)).toMatchObject({ ok: false, reason: 'malformed' });
  });

  it('generates a different 256-bit secret for each run', () => {
    expect(generateSecret()).not.toBe(generateSecret());
  });
});

describe('auth wrapper before attachRooms (real sockets)', () => {
  it('refuses missing, tampered, wrong-room and expired tokens before any room is created', async () => {
    const secret = generateSecret();
    const server = await startRoomServer(new RoomHub({ seed: 3 }), secret);
    const now = Date.now();
    try {
      const roomId = 'auth';
      const reasons: string[] = [];
      reasons.push(await expectRefused(server, `ws://127.0.0.1:${server.port}/rooms?room=${roomId}&nonce=1`, roomId));

      const tampered = tamperPayload(issueToken(secret, { clientId: 3, roomId, expiresAt: now + 60_000 }, now));
      reasons.push(await expectRefused(
        server,
        `ws://127.0.0.1:${server.port}/rooms?room=${roomId}&nonce=1&auth=${tampered}`,
        roomId,
      ));

      const wrongRoom = issueToken(secret, { clientId: 3, roomId: 'elsewhere', expiresAt: now + 60_000 }, now);
      reasons.push(await expectRefused(
        server,
        `ws://127.0.0.1:${server.port}/rooms?room=${roomId}&nonce=1&auth=${wrongRoom}`,
        roomId,
      ));

      const expired = issueToken(
        secret,
        { clientId: 3, roomId, expiresAt: now - 1_000 },
        now - 120_000,
      );
      reasons.push(await expectRefused(
        server,
        `ws://127.0.0.1:${server.port}/rooms?room=${roomId}&nonce=1&auth=${expired}`,
        roomId,
      ));

      expect(server.hub.size).toBe(0);
      console.log(`NETGATE_AUTH ${JSON.stringify({ refused: reasons.length, reasons, roomsCreated: server.hub.size })}`);
    } finally {
      await server.close();
    }
  });

  it('admits a valid token and still reaches the SEC-002 room path', async () => {
    const secret = generateSecret();
    const server = await startRoomServer(new RoomHub({ seed: 3 }), secret);
    const now = Date.now();
    try {
      const token = issueToken(secret, { clientId: 11, roomId: 'auth', expiresAt: now + 60_000 }, now);
      const client = new WebSocket(`ws://127.0.0.1:${server.port}/rooms?room=auth&nonce=1&auth=${token}`);
      const captured = trackFrames(client);
      await waitOpen(client);
      client.send(encodeFrame({ kind: 'hello', version: 3, capabilities: 0 }));
      await waitFor(() => captured.frames.some((frame) => frame.kind === 'welcome'), 'welcome frame');
      expect(captured.frames[0]).toMatchObject({ kind: 'welcome', version: 3 });
      const room = server.hub.get('auth');
      expect(room).not.toBeNull();
      expect(room?.members).toHaveLength(1);
      console.log(`NETGATE_AUTH_OK ${JSON.stringify({ rooms: server.hub.size, members: room?.members.length })}`);
      await closeClient(client);
    } finally {
      await server.close();
    }
  });
});
