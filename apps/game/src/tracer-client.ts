/**
 * Headless client replica for TRACER-001: prediction, reconciliation, interpolation and a hash of the
 * reconciled state. Transport is injected (the test supplies WebSocket); the client itself is pure TS so
 * the same code runs in the browser and in the Node assert harness.
 */
import {
  step, stateHash, initialState,
  type CapsuleState, type Intent,
} from '@strata/core';
import type { SnapshotMessage, HashAckMessage } from '@strata/protocol';

export interface RenderPosition { readonly x: number; readonly z: number; }

export class TracerClient {
  private state: CapsuleState;
  private unacked: Intent[] = [];
  private from: RenderPosition;
  private to: RenderPosition;

  constructor(
    readonly name: string,
    seed = 1337,
  ) {
    this.state = initialState(seed);
    this.from = { x: this.state.x, z: this.state.z };
    this.to = this.from;
  }

  get hash(): string { return stateHash(this.state); }
  get snapshotState(): CapsuleState { return this.state; }

  /** Apply an intent locally before the server has acked it. */
  predict(intent: Intent): void {
    this.state = step(this.state, intent);
    this.unacked.push(intent);
    this.from = this.to;
    this.to = { x: this.state.x, z: this.state.z };
  }

  /** Reset to the authoritative state, then replay only intents the server has not applied. */
  onSnapshot(snapshot: SnapshotMessage): void {
    this.from = { x: this.state.x, z: this.state.z };
    this.state = snapshot.state;
    this.unacked = this.unacked.filter(i => i.seq > snapshot.appliedSeq);
    for (const intent of this.unacked) this.state = step(this.state, intent);
    this.to = { x: this.state.x, z: this.state.z };
  }

  /** Display-only interpolation between the last two reconciled states. Never hashed, never authoritative. */
  interpolate(alpha: number): RenderPosition {
    const t = Math.max(0, Math.min(1, alpha));
    return {
      x: this.from.x + (this.to.x - this.from.x) * t,
      z: this.from.z + (this.to.z - this.from.z) * t,
    };
  }

  ack(tick: number): HashAckMessage {
    return { kind: 'hashack', v: 1, client: this.name, tick, hash: this.hash };
  }

  /** Fault injection for the negative test: simulates a client-side desync. Never used in the happy path. */
  injectDesync(): void {
    this.state = { ...this.state, x: this.state.x + 1 };
  }
}
