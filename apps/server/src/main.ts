/**
 * @strata/server — authoritative headless host (TRACER-001).
 *
 * The wall clock lives here, outside packages/core: it drives a fixed 30 Hz tick. The tick itself is pure
 * and is the same function the deterministic assert harness calls.
 */
import { TICK_HZ } from '@strata/core';
import { TracerServer } from './tracer';

const server = new TracerServer();
const port = Number(process.env.TRACER_PORT ?? 8787);

server.listen(port).then((bound) => {
  console.log(`STRATA tracer server — ${TICK_HZ} Hz authoritative tick on ws://127.0.0.1:${bound}/tracer`);
  const timer = setInterval(() => server.tick(), 1000 / TICK_HZ);
  process.once('SIGINT', () => {
    clearInterval(timer);
    void server.close().then(() => process.exit(0));
  });
}).catch((e) => {
  console.error(`tracer server failed to listen: ${String(e)}`);
  process.exit(1);
});
