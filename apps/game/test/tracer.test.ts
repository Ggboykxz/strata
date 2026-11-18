/**
 * TRACER-001 integration assert: real WS server, two predicted/reconciled replicas, Babylon render.
 * Run with `pnpm tracer --assert`. With TRACER_FORCE_DESYNC=1 a replica lies and the assert must fail.
 */
import { describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { stateHash, TRACER_SCALE } from '@strata/core';
import { decode, encode } from '@strata/protocol';
import { TracerServer } from '../../server/src/tracer';
import { TracerClient } from '../src/tracer-client';
import { renderCapsuleNull } from '../src/render';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forceDesync = process.env.TRACER_FORCE_DESYNC === '1';

describe('TRACER-001 walking skeleton', () => {
  it('reaches equal hashes on both sides, rejects a desync, and renders the capsule', async () => {
    const server = new TracerServer(1337, 2);
    const port = await server.listen(0);
    const clients = [new TracerClient('A'), new TracerClient('B')];
    const sockets: WebSocket[] = [];
    const lastTick = new Map<string, number>();

    try {
      for (const client of clients) {
        const socket = await new Promise<WebSocket>((resolve, reject) => {
          const ws = new WebSocket(`ws://127.0.0.1:${port}/tracer`);
          ws.once('open', () => resolve(ws));
          ws.once('error', reject);
          ws.on('message', (raw) => {
            const msg = decode(String(raw));
            if (msg.kind === 'snapshot') {
              clients.find(c => c.name === client.name)?.onSnapshot(msg);
              lastTick.set(client.name, msg.state.tick);
            }
          });
        });
        sockets.push(socket);
      }

      // Both replicas predict before the server applies anything.
      for (let seq = 1; seq <= 3; seq++) {
        for (const [i, client] of clients.entries()) {
          const intent = i === 0
            ? { seq, dx: 1 as const, dz: 0 as const }
            : { seq, dx: 0 as const, dz: 1 as const };
          client.predict(intent);
          sockets[i].send(encode({ kind: 'intent', v: 1, intent }));
        }
      }
      await sleep(20);

      // Drive the authoritative tick deterministically; the wall clock stays out of packages/core.
      for (let t = 0; t < 5; t++) {
        server.tick();
        await sleep(20);
      }

      if (forceDesync) clients[1]!.injectDesync();
      const tick = Math.max(...clients.map(c => lastTick.get(c.name) ?? 0));
      for (const client of clients) {
        sockets[clients.indexOf(client)].send(encode(client.ack(tick)));
      }
      await sleep(30);

      expect(server.verdict).toBe('ok');
      expect(clients[0]!.hash).toBe(stateHash(server.currentState));
      expect(clients[1]!.hash).toBe(clients[0]!.hash);

      const rendered = renderCapsuleNull(clients[0]!.interpolate(1));
      expect(rendered.meshes).toBeGreaterThanOrEqual(1);
      expect(rendered.x).toBeCloseTo(clients[0]!.snapshotState.x / TRACER_SCALE, 6);

      // The gate must also be able to reject a lying replica. This phase runs only after the happy path.
      clients[1]!.injectDesync();
      sockets[1]!.send(encode(clients[1]!.ack(tick)));
      await sleep(30);
      expect(server.verdict).toBe('desync');
    } finally {
      for (const ws of sockets) ws.terminate();
      await server.close();
    }
  });
});
