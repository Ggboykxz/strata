/**
 * TRACER-001 wire contract. Deliberately small: three messages, no zod until it has an exact pin in
 * docs/STACK.lock.md. Unknown fields are rejected so a client cannot smuggle state across the wire.
 */
import type { CapsuleState, Intent } from '@strata/core';

export const TRACER_PROTOCOL_VERSION = 1;

export interface IntentMessage {
  readonly kind: 'intent';
  readonly v: number;
  readonly intent: Intent;
}
export interface SnapshotMessage {
  readonly kind: 'snapshot';
  readonly v: number;
  readonly state: CapsuleState;
  readonly hash: string;
  readonly appliedSeq: number;
}
export interface HashAckMessage {
  readonly kind: 'hashack';
  readonly v: number;
  readonly client: string;
  readonly tick: number;
  readonly hash: string;
}
export type TracerMessage = IntentMessage | SnapshotMessage | HashAckMessage;

export function encode(msg: TracerMessage): string {
  return JSON.stringify(msg);
}

export function decode(raw: string): TracerMessage {
  let m: unknown;
  try { m = JSON.parse(raw); }
  catch { throw new Error('protocol: invalid JSON'); }
  if (!m || typeof m !== 'object') throw new Error('protocol: message is not an object');
  const o = m as Record<string, unknown>;
  if (o.v !== TRACER_PROTOCOL_VERSION) throw new Error(`protocol: version mismatch ${String(o.v)}`);
  if (o.kind === 'intent') return m as IntentMessage;
  if (o.kind === 'snapshot') return m as SnapshotMessage;
  if (o.kind === 'hashack') return m as HashAckMessage;
  throw new Error(`protocol: unknown kind ${String(o.kind)}`);
}

/** Extra validation used by the server before an intent can drive the authoritative tick. */
export function asIntent(value: unknown): Intent | null {
  if (!value || typeof value !== 'object') return null;
  const i = value as Record<string, unknown>;
  if (!Number.isInteger(i.seq)) return null;
  if (i.dx !== -1 && i.dx !== 0 && i.dx !== 1) return null;
  if (i.dz !== -1 && i.dz !== 0 && i.dz !== 1) return null;
  return { seq: i.seq as number, dx: i.dx as Intent['dx'], dz: i.dz as Intent['dz'] };
}
