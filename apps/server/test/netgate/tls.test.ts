/**
 * GATE:NET prototype — TLS transport measurement.
 *
 * A self-signed certificate is generated at runtime (never committed), an HTTPS server carries the same
 * `WebSocketServer` + auth wrapper + `attachRooms` path, and a `ws` client connects with
 * `rejectUnauthorized: false` because the certificate is self-signed. A plain `ws://` connection to the TLS
 * port must fail. If `openssl` is unavailable the test records NOT MEASURED instead of skipping silently.
 */
import { createServer as createHttpsServer } from 'node:https';
import { describe, expect, it } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { PROTOCOL_VERSION, encodeFrame } from '@strata/protocol';
import { RoomHub } from '../../src/rooms';
import { attachAuthenticatedRooms } from './auth-rooms';
import { closeClient, listen, trackFrames, waitFor, waitOpen } from './harness';
import { generateSecret, issueToken } from './hmac-token';
import { generateSelfSignedCertificate, opensslVersion } from './tls-cert';

function plaintextAttempt(url: string, timeoutMs = 3000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const client = new WebSocket(url);
    let settled = false;
    const finish = (action: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      action();
    };
    const timer = setTimeout(() => {
      finish(() => {
        client.terminate();
        reject(new Error('plaintext connection neither failed nor opened within the timeout'));
      });
    }, timeoutMs);
    client.once('open', () => {
      finish(() => {
        client.terminate();
        reject(new Error('plaintext ws:// unexpectedly opened on the TLS port'));
      });
    });
    client.once('error', (error: Error) => {
      finish(() => {
        client.terminate();
        resolve(error.message);
      });
    });
  });
}

const openssl = opensslVersion();

describe('TLS transport (real sockets)', () => {
  if (openssl === null) {
    it('records NOT MEASURED because openssl is unavailable', () => {
      console.log('NETGATE_TLS {"status":"NOT MEASURED","reason":"openssl not found on PATH"}');
      expect(openssl).toBeNull();
    });
    return;
  }

  it('serves the gated room path over TLS and refuses a plaintext connection', async () => {
    const certificate = generateSelfSignedCertificate();
    const server = createHttpsServer({ key: certificate.key, cert: certificate.cert }, (_request, response) => {
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('not found');
    });
    const secret = generateSecret();
    const hub = new RoomHub({ seed: 5 });
    const wss = new WebSocketServer({ server });
    attachAuthenticatedRooms(wss, hub, { secret });
    let client: WebSocket | null = null;
    try {
      const port = await listen(server);
      const now = Date.now();
      const token = issueToken(secret, { clientId: 4, roomId: 'tls', expiresAt: now + 60_000 }, now);

      const plaintextError = await plaintextAttempt(
        `ws://127.0.0.1:${port}/rooms?room=tls&nonce=1&auth=${token}`,
      );

      client = new WebSocket(
        `wss://127.0.0.1:${port}/rooms?room=tls&nonce=1&auth=${token}`,
        { rejectUnauthorized: false },
      );
      const captured = trackFrames(client);
      await waitOpen(client);

      const raw = (client as unknown as {
        _socket?: {
          getProtocol?: () => string | null;
          getCipher?: () => { name?: string } | null;
        };
      })._socket;
      const protocol = raw?.getProtocol?.() ?? null;
      const cipher = raw?.getCipher?.()?.name ?? null;
      expect(protocol).toMatch(/^TLSv1/);
      expect(cipher).toBeTruthy();

      client.send(encodeFrame({ kind: 'hello', version: PROTOCOL_VERSION, capabilities: 0 }));
      await waitFor(() => captured.frames.some((frame) => frame.kind === 'welcome'), 'welcome over TLS');
      expect(captured.frames[0]).toMatchObject({ kind: 'welcome', version: PROTOCOL_VERSION });
      expect(hub.get('tls')?.members).toHaveLength(1);

      console.log(`NETGATE_TLS ${JSON.stringify({
        status: 'MEASURED',
        openssl: certificate.opensslVersion,
        protocol,
        cipher,
        encryptedHandshake: 'welcome',
        plaintextError,
        plaintextFailed: true,
        certCommitted: false,
        rejectUnauthorized: false,
      })}`);
    } finally {
      if (client) await closeClient(client);
      for (const socket of wss.clients) socket.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
      certificate.cleanup();
    }
  }, 20_000);
});
