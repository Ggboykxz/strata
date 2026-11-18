/**
 * @strata/server — authoritative headless host.
 *
 * The wall clock lives here, outside packages/core: it drives a fixed 30 Hz tick. The tick itself is pure and
 * is the same function the deterministic assert harness calls. Two endpoints share the process:
 *   - TRACER_PORT (8787): the single-capsule tracer (TRACER-001)
 *   - ROOM_PORT   (8788): rooms through attachRooms, whose MessageGate is the only ingress (SEC-002)
 */
import { TICK_HZ } from '@strata/core';
import { WebSocketServer } from 'ws';
import { RoomHub, attachRooms } from './rooms';
import { TracerServer } from './tracer';

const tracer = new TracerServer();
const tracerPort = Number(process.env.TRACER_PORT ?? 8787);
const roomPort = Number(process.env.ROOM_PORT ?? 8788);
// NET-GATE requires four clients in one room; the room default stays conservative, the host is explicit.
const roomCapacity = Number(process.env.ROOM_CAPACITY ?? 4);
const rooms = new RoomHub({ capacity: roomCapacity });

async function listen(wss: WebSocketServer, path: string): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    wss.once('listening', resolve);
    wss.once('error', reject);
  });
  const address = wss.address();
  if (typeof address === 'string' || address === null) throw new Error(`${path} has no TCP address`);
  console.log(`STRATA ${path} — ${TICK_HZ} Hz authoritative tick on ws://127.0.0.1:${address.port}`);
  return address.port;
}

const roomWss = new WebSocketServer({ port: roomPort, host: '127.0.0.1' });
attachRooms(roomWss, rooms);

Promise.all([
  tracer.listen(tracerPort),
  listen(roomWss, 'rooms'),
]).then(([boundTracer]) => {
  console.log(`STRATA tracer endpoint on ws://127.0.0.1:${boundTracer}/tracer`);
  const timer = setInterval(() => {
    tracer.tick();
    for (const id of rooms.ids) rooms.get(id)?.tick();
  }, 1000 / TICK_HZ);
  process.once('SIGINT', () => {
    clearInterval(timer);
    roomWss.close();
    void tracer.close().then(() => process.exit(0));
  });
}).catch((error) => {
  console.error(`STRATA server failed to listen: ${String(error)}`);
  roomWss.close();
  process.exit(1);
});
