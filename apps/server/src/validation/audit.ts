/**
 * GM action audit (SEC-001 / GDD-SECURITY §4.3). A reason is mandatory. An accepted action produces an immutable
 * entry with actor id, tick and a deterministic hash. No reason means refusal before any state change.
 * Retention is an OPS-001 runbook item — this in-memory log makes no retention promise.
 */
import { fnv1a32 } from '@strata/core';

export interface AuditEntry {
  readonly id: string;
  readonly actor: number;
  readonly tick: number;
  readonly action: string;
  readonly reason: string;
  readonly hash: string;
}

export type AuditVerdict =
  | { readonly ok: true; readonly entry: AuditEntry }
  | { readonly ok: false; readonly reason: 'missing-reason' };

function hashEntry(actor: number, tick: number, action: string, reason: string): string {
  const parts = [String(actor), String(tick), action, reason];
  const codes: number[] = [];
  for (const part of parts) for (let i = 0; i < part.length; i++) codes.push(part.charCodeAt(i));
  return fnv1a32(codes).toString(16).padStart(8, '0');
}

export function makeAuditEntry(actor: number, tick: number, action: string, reason: string): AuditVerdict {
  if (!Number.isInteger(actor) || actor < 0 || !Number.isInteger(tick) || tick < 0
    || !action || typeof reason !== 'string' || reason.trim().length === 0) {
    return { ok: false, reason: 'missing-reason' };
  }
  const hash = hashEntry(actor, tick, action, reason);
  return {
    ok: true,
    entry: Object.freeze({
      id: `${tick}:${actor}:${hash}`,
      actor,
      tick,
      action,
      reason,
      hash,
    }),
  };
}

export class AuditLog {
  private readonly entries: AuditEntry[] = [];

  add(verdict: AuditVerdict): boolean {
    if (!verdict.ok) return false;
    this.entries.push(verdict.entry);
    return true;
  }

  get list(): readonly AuditEntry[] { return [...this.entries]; }
  get size(): number { return this.entries.length; }
  clear(): void { this.entries.length = 0; }
}
