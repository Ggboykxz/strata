/**
 * Authoritative headless tracer host (TRACER-001). One tick at a time, driven by the caller so the assert
 * harness is deterministic; `apps/server/src/main.ts` adds the wall-clock loop around it.
 *
 * No Babylon here. Even NullEngine is banned from the server tick (I3 / NETCODE contract): the server
 * collision and state come only from packages/core.
 */
import { WebSocketServer, WebSocket } from 'ws';
import {
  initialState, step, stateHash, validIntent,
  type CapsuleState, type Intent,
} from '@strata/core';
import {
  encode, decode, asIntent,
  type SnapshotMessage,
} from '@strata/protocol';

export type TracerVerdict = 'pending' | 'ok' | 'desync';

export class TracerServer {
  private state: CapsuleState;
  private appliedSeq = 0;
  private pending: Intent | null = null;
  private readonly snapshotHashes = new Map<number, string>();
  private readonly acks = new Map<string, { tick: number; ok: boolean }>();
  private wss: WebSocketServer | null = null;
  private verdictValue: TracerVerdict = 'pending';

  constructor(
    seed = 1337,
    private readonly expectedClients = 2,
  ) {
    this.state = initialState(seed);
  }

  get verdict(): TracerVerdict { return this.verdictValue; }
  get currentState(): CapsuleState { return this.state; }
  get lastAppliedSeq(): number { return this.appliedSeq; }
  get hash(): string { return stateHash(this.state); }

  async listen(port = 0): Promise<number> {
    this.wss = new WebSocketServer({ port, host: '127.0.0.1' });
    this.wss.on('connection', (socket) => {
      socket.on('message', (raw) => this.onMessage(String(raw)));
    });
    await new Promise<void>((resolve, reject) => {
      this.wss?.once('listening', resolve);
      this.wss?.once('error', reject);
    });
    const address = this.wss.address();
    return typeof address === 'object' && address ? address.port : port;
  }

  /** One authoritative tick using the latest validated intent (or idle). Returns the broadcast snapshot. */
  tick(): SnapshotMessage {
    const intent: Intent = this.pending ?? { seq: this.appliedSeq, dx: 0, dz: 0 };
    this.pending = null;
    this.state = step(this.state, intent);
    const snapshot: SnapshotMessage = {
      kind: 'snapshot',
      v: 1,
      state: this.state,
      hash: stateHash(this.state),
      appliedSeq: this.appliedSeq,
    };
    this.snapshotHashes.set(this.state.tick, snapshot.hash);
    this.broadcast(encode(snapshot));
    return snapshot;
  }

  private broadcast(raw: string): void {
    for (const client of this.wss?.clients ?? []) {
      if (client.readyState === WebSocket.OPEN) client.send(raw);
    }
  }

  private onMessage(raw: string): void {
    let msg;
    try { msg = decode(raw); }
    catch { return; } // malformed wire data is dropped, never trusted
    if (msg.kind === 'intent') {
      const intent = asIntent(msg.intent);
      if (intent && validIntent(intent, this.appliedSeq)) {
        this.appliedSeq = intent.seq;
        this.pending = intent;
      }
    } else if (msg.kind === 'hashack') {
      const expected = this.snapshotHashes.get(msg.tick);
      const ok = expected !== undefined && expected === msg.hash;
      this.acks.set(msg.client, { tick: msg.tick, ok });
      if (!ok) this.verdictValue = 'desync';
      else if (this.verdictValue === 'pending'
        && this.acks.size >= this.expectedClients
        && [...this.acks.values()].every(a => a.tick === msg.tick && a.ok)) {
        this.verdictValue = 'ok';
      }
    }
  }

  async close(): Promise<void> {
    const wss = this.wss;
    this.wss = null;
    if (!wss) return;
    for (const c of wss.clients) c.terminate();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  }
}
