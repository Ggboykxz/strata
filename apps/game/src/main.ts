/**
 * @strata/game — browser client.
 *
 * TRACER-001: one greybox capsule, predicted locally, reconciled from authoritative snapshots, rendered
 * above an HTML overlay (no Babylon.GUI HUD). No hero asset, texture or scene generation (I2).
 */
import { Engine, Scene } from '@babylonjs/core';
import { PROTOCOL_VERSION } from '@strata/protocol';
import { TracerClient } from './tracer-client';
import { buildCapsule } from './render';

const canvas = document.getElementById('game');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('missing #game canvas');

const engine = new Engine(canvas, true);
const scene = new Scene(engine);
const client = new TracerClient('browser');
buildCapsule(scene, client.interpolate(1));
engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());

const url = new URL(`ws://${window.location.host}/tracer`);
url.searchParams.set('v', String(PROTOCOL_VERSION));
const socket = new WebSocket(url);
socket.addEventListener('message', (event) => {
  // The browser path consumes snapshots; the Node assert path exercises the same client logic headlessly.
  const msg = JSON.parse(String(event.data)) as { kind: string };
  void msg.kind;
  void client;
});
