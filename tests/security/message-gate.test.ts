import { describe, expect, it } from 'vitest';
import { encodeFrame, snapshotFromWorld } from '../../packages/protocol/src/index';
import { createWorld } from '../../packages/core/src/index';
import {
  AuditLog, MAX_INTENTS_PER_WINDOW, MessageGate, RateLimiter, makeAuditEntry,
} from '../../apps/server/src/validation';

describe('rate limiter', () => {
  it('admits exactly 30 intents per 30-tick window', () => {
    const limiter = new RateLimiter();
    let allowed = 0;
    for (let i = 0; i < 200; i++) if (limiter.check(7, 5) === 'allowed') allowed++;
    expect(allowed).toBe(MAX_INTENTS_PER_WINDOW);
    expect(limiter.check(7, 5)).toBe('rate-limited');
    expect(limiter.check(7, 35)).toBe('allowed'); // next fixed window
  });

  it('keeps clients separate and forgets one on logout', () => {
    const limiter = new RateLimiter();
    expect(limiter.check(1, 0)).toBe('allowed');
    expect(limiter.check(2, 0)).toBe('allowed');
    limiter.reset(1);
    expect(limiter.trackedClients).toBe(1);
  });
});

describe('message gate', () => {
  it('refuses malformed bytes with a counted reason', () => {
    const gate = new MessageGate();
    expect(gate.accept(1, 1, new Uint8Array([0xff]))).toMatchObject({ allowed: false, reason: 'malformed' });
    expect(gate.counts.get('malformed')).toBe(1);
    expect(gate.rejected).toBe(1);
  });

  it('refuses a client-sent snapshot outright', () => {
    const gate = new MessageGate();
    const frame = encodeFrame(snapshotFromWorld(createWorld(1, 1), '00000000'));
    expect(gate.accept(1, 1, frame)).toMatchObject({ allowed: false, reason: 'client-snapshot' });
  });

  it('refuses a wrong hello version and accepts the supported one', () => {
    const gate = new MessageGate();
    expect(gate.accept(1, 1, encodeFrame({ kind: 'hello', version: 2, capabilities: 0 })))
      .toMatchObject({ reason: 'wrong-version' });
    expect(gate.accept(1, 1, encodeFrame({ kind: 'hello', version: 3, capabilities: 0 })).allowed).toBe(true);
  });

  it('enforces monotonic sequence and rejects a replayed intent', () => {
    const gate = new MessageGate();
    expect(gate.accept(1, 1, encodeFrame({ kind: 'intent', entity: 1, seq: 5, dx: 1, dz: 0 })).allowed).toBe(true);
    expect(gate.accept(1, 2, encodeFrame({ kind: 'intent', entity: 1, seq: 5, dx: 1, dz: 0 })))
      .toMatchObject({ reason: 'non-monotonic-seq' });
    expect(gate.accept(1, 3, encodeFrame({ kind: 'intent', entity: 1, seq: 4, dx: 1, dz: 0 })))
      .toMatchObject({ reason: 'non-monotonic-seq' });
  });

  it('admits the first 30 of a 200-message burst and refuses the rest', () => {
    const gate = new MessageGate();
    let admitted = 0;
    let limited = 0;
    for (let seq = 1; seq <= 200; seq++) {
      const verdict = gate.accept(9, 1, encodeFrame({ kind: 'intent', entity: 1, seq, dx: 1, dz: 0 }));
      if (verdict.allowed) admitted++;
      else if (verdict.reason === 'rate-limited') limited++;
    }
    expect(admitted).toBe(MAX_INTENTS_PER_WINDOW);
    expect(limited).toBe(200 - MAX_INTENTS_PER_WINDOW);
    expect(gate.counts.get('rate-limited')).toBe(limited);
  });

  it('forgets a client on logout so old sequence state cannot be replayed', () => {
    const gate = new MessageGate();
    gate.accept(3, 1, encodeFrame({ kind: 'intent', entity: 1, seq: 50, dx: 1, dz: 0 }));
    gate.forget(3);
    expect(gate.accept(3, 2, encodeFrame({ kind: 'intent', entity: 1, seq: 1, dx: 1, dz: 0 })).allowed).toBe(true);
  });
});

describe('GM audit', () => {
  it('refuses a GM action without a reason', () => {
    const log = new AuditLog();
    expect(makeAuditEntry(1, 10, 'grant', '')).toMatchObject({ ok: false, reason: 'missing-reason' });
    expect(log.add(makeAuditEntry(1, 10, 'grant', '  '))).toBe(false);
    expect(log.size).toBe(0);
  });

  it('writes an immutable, deterministic entry', () => {
    const log = new AuditLog();
    const first = makeAuditEntry(1, 10, 'grant', 'ticket-42');
    const second = makeAuditEntry(1, 10, 'grant', 'ticket-42');
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.entry.hash).toBe(second.entry.hash);
      expect(Object.isFrozen(first.entry)).toBe(true);
      expect(log.add(first)).toBe(true);
      expect(log.list[0]?.reason).toBe('ticket-42');
    }
  });
});
