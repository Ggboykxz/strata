/**
 * GATE:NET prototype — 200-message flood over a real loopback WebSocket.
 *
 * The frames travel through the unchanged SEC-002 `attachRooms` path. A prototype-only spy records the verdict
 * of the real `MessageGate.accept` so the test can assert the counted reason, not just count wire frames. The
 * room is ticked once; its hash is compared with a reference room that received exactly 30 intents and with a
 * reference that received all 200. Only the 30-intent reference may match.
 */
import { describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { encodeFrame } from '@strata/protocol';
import { Room, RoomHub } from '../../src/rooms';
import { MessageGate, type GateVerdict } from '../../src/validation';
import { generateSecret, issueToken } from './hmac-token';
import { closeClient, startRoomServer, trackFrames, waitFor, waitOpen } from './harness';

function referenceHash(seed: number, messages: number): string {
  const room = new Room('flood', { seed });
  const client = room.join({ send() { /* reference room records no wire */ } });
  if (!client) throw new Error('reference room did not accept a client');
  for (let seq = 1; seq <= messages; seq++) {
    room.handleBytes(client.clientId, encodeFrame({ kind: 'intent', entity: 1, seq, dx: 1, dz: 0, targetTick: 1 }));
  }
  return room.tick().hash;
}

describe('real-socket flood', () => {
  it('admits exactly 30 of 200, rate-limits 170 and leaves the room hash at the 30-intent state', async () => {
    const secret = generateSecret();
    const hub = new RoomHub({ seed: 21 });
    const server = await startRoomServer(hub, secret);
    const now = Date.now();
    const token = issueToken(secret, { clientId: 9, roomId: 'flood', expiresAt: now + 60_000 }, now);
    const seen: GateVerdict[] = [];
    const original = MessageGate.prototype.accept;
    const spy = vi.spyOn(MessageGate.prototype, 'accept').mockImplementation(function (
      this: MessageGate,
      client: number,
      tick: number,
      bytes: Uint8Array,
    ): GateVerdict {
      const verdict = original.call(this, client, tick, bytes);
      seen.push(verdict);
      return verdict;
    });

    const client = new WebSocket(`ws://127.0.0.1:${server.port}/rooms?room=flood&nonce=1&auth=${token}`);
    const captured = trackFrames(client);
    try {
      await waitOpen(client);
      const room = hub.get('flood');
      if (!room) throw new Error('room was not created for the authenticated socket');
      const hashBefore = room.hash;

      const started = performance.now();
      for (let seq = 1; seq <= 200; seq++) {
        client.send(encodeFrame({ kind: 'intent', entity: 1, seq, dx: 1, dz: 0, targetTick: 1 }));
      }
      await waitFor(
        () => captured.frames.filter((frame) => frame.kind === 'reject').length >= 170,
        '170 rate-limit rejects',
        10_000,
      );
      const durationMs = performance.now() - started;

      const admitted = seen.filter((verdict) => verdict.allowed).length;
      const rateLimited = seen.filter(
        (verdict) => !verdict.allowed && verdict.reason === 'rate-limited',
      ).length;
      const wireRejects = captured.frames.filter((frame) => frame.kind === 'reject');

      expect(seen).toHaveLength(200);
      expect(admitted).toBe(30);
      expect(rateLimited).toBe(170);
      expect(wireRejects).toHaveLength(170);
      expect(captured.undecodable).toHaveLength(0);
      // The production adapter collapses every gate reason to `malformed`; this is a measured finding.
      expect(wireRejects.every((frame) => frame.kind === 'reject' && frame.reason === 'malformed')).toBe(true);

      expect(room.hash).toBe(hashBefore);
      expect(room.sim.state.entities[0]?.seq).toBe(0);
      const tick = room.tick();
      const reference30 = referenceHash(21, 30);
      const reference200 = referenceHash(21, 200);

      expect(room.sim.state.entities[0]?.seq).toBe(30);
      expect(tick.hash).toBe(reference30);
      expect(room.hash).toBe(reference30);
      expect(room.hash).not.toBe(reference200);

      const record = {
        messages: 200,
        admitted,
        rateLimited,
        wireRejects: wireRejects.length,
        wireRejectReason: 'malformed',
        durationMs: Math.round(durationMs * 1000) / 1000,
        bytesUp: 200 * 11,
        bytesDown: wireRejects.length * 4,
        hashBefore,
        hashAfter: room.hash,
        reference30,
        reference200,
      };
      console.log(`NETGATE_FLOOD ${JSON.stringify(record)}`);
    } finally {
      spy.mockRestore();
      await closeClient(client);
      await server.close();
    }
  }, 15_000);
});
