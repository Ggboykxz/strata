/**
 * GATE:NET prototype — real-socket harness helpers.
 *
 * Each server below is a real loopback HTTP(S) server with a real `ws` `WebSocketServer`. The auth wrapper is
 * installed first, then `attachRooms` owns the private relay. Nothing here is imported by production code.
 */
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo, Server as NetServer } from 'node:net';
import { type RawData, WebSocket, WebSocketServer } from 'ws';
import { decodeFrame, type WireMessage } from '@strata/protocol';
import type { RoomHub } from '../../src/rooms';
import { attachAuthenticatedRooms } from './auth-rooms';

export interface RoomServer {
  readonly server: HttpServer;
  readonly wss: WebSocketServer;
  readonly hub: RoomHub;
  readonly port: number;
  close(): Promise<void>;
}

export function bytesOf(raw: RawData): Uint8Array {
  if (Array.isArray(raw)) return new Uint8Array(Buffer.concat(raw));
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
  return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
}

/** Collect decoded frames in arrival order. Undecodable frames are counted, never silently dropped. */
export function trackFrames(client: WebSocket): { frames: WireMessage[]; undecodable: Uint8Array[] } {
  const frames: WireMessage[] = [];
  const undecodable: Uint8Array[] = [];
  client.on('message', (raw: RawData) => {
    const bytes = bytesOf(raw);
    try {
      frames.push(decodeFrame(bytes));
    } catch {
      undecodable.push(bytes);
    }
  });
  return { frames, undecodable };
}

export async function listen(server: NetServer, host = '127.0.0.1'): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
    server.listen(0, host);
  });
  const address = server.address();
  if (typeof address === 'string' || address === null) throw new Error('test server has no TCP address');
  return (address as AddressInfo).port;
}

export async function startRoomServer(hub: RoomHub, secret: string): Promise<RoomServer> {
  const server = createServer((_request, response) => {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('not found');
  });
  const wss = new WebSocketServer({ server });
  attachAuthenticatedRooms(wss, hub, { secret });
  const port = await listen(server);
  return {
    server,
    wss,
    hub,
    port,
    async close() {
      for (const client of wss.clients) client.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

export function waitOpen(client: WebSocket, timeoutMs = 5000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (client.readyState === WebSocket.OPEN) { resolve(); return; }
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('timed out opening the WebSocket'));
    }, timeoutMs);
    const onOpen = (): void => { cleanup(); resolve(); };
    const onError = (error: Error): void => { cleanup(); reject(error); };
    const cleanup = (): void => {
      clearTimeout(timer);
      client.off('open', onOpen);
      client.off('error', onError);
    };
    client.once('open', onOpen);
    client.once('error', onError);
  });
}

export async function waitFor(predicate: () => boolean, label: string, timeoutMs = 5000): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

export function closeClient(client: WebSocket): Promise<void> {
  if (client.readyState === WebSocket.CLOSED) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => { client.terminate(); resolve(); }, 1000);
    timer.unref();
    client.once('close', () => { clearTimeout(timer); resolve(); });
    client.close();
  });
}
