import { describe, expect, it } from 'vitest';
import { loadManifest } from '@strata/core';
import { AnimAuthority, HitLedger } from '../src/combat';

const manifest = loadManifest({
  version: 1,
  clips: [
    { id: 1, archetype: 1, kind: 'locomotion', durationTicks: 24, loop: true, events: [{ tick: 0, kind: 'footstep' }] },
    { id: 3, archetype: 1, kind: 'action', durationTicks: 15, loop: false, events: [{ tick: 6, kind: 'hit' }] },
  ],
});

describe('server anim validation', () => {
  it('accepts a legal request and advances the authoritative runtime', () => {
    const authority = new AnimAuthority(manifest);
    expect(authority.request(1, { clipId: 3, sequence: 1 }, 10).verdict).toBe('accepted');
    expect(authority.stateOf(1)?.state).toBe('transitioning');
    authority.advance(12);
    expect(authority.stateOf(1)?.state).toBe('action');
    authority.advance(25);
    expect(authority.stateOf(1)?.state).toBe('recovery');
  });

  it('refuses a replayed seq without mutating the authoritative state', () => {
    const authority = new AnimAuthority(manifest);
    authority.request(1, { clipId: 3, sequence: 5 }, 0);
    const before = authority.stateOf(1);
    const out = authority.request(1, { clipId: 3, sequence: 5 }, 1);
    expect(out.verdict).toBe('refused');
    expect(out.reason).toBe('stale-sequence');
    expect(authority.stateOf(1)).toEqual(before);
  });

  it('refuses a malformed or unknown clip request', () => {
    const authority = new AnimAuthority(manifest);
    expect(authority.request(1, 'attack', 0).reason).toBe('malformed');
    expect(authority.request(1, { clipId: 99, sequence: 1 }, 0).reason).toBe('unknown-clip');
    expect(authority.stateOf(1)?.state).toBe('idle');
  });

  it('keeps one runtime per entity', () => {
    const authority = new AnimAuthority(manifest);
    authority.request(1, { clipId: 1, sequence: 1 }, 0);
    authority.request(2, { clipId: 3, sequence: 1 }, 0);
    expect(authority.stateOf(1)?.clipId).toBe(1);
    expect(authority.stateOf(2)?.clipId).toBe(3);
  });
});

describe('server-owned hit frames', () => {
  it('fires a hit at the clip offset plus the start tick, exactly once', () => {
    const ledger = new HitLedger();
    expect(ledger.process(manifest, 3, 100, 1, 105)).toEqual([]);
    expect(ledger.process(manifest, 3, 100, 1, 106))
      .toEqual([{ tick: 106, entity: 1, clipId: 3, kind: 'hit' }]);
    expect(ledger.process(manifest, 3, 100, 1, 106)).toEqual([]);
    expect(ledger.count).toBe(1);
  });

  it('never accepts a client claim as authority', () => {
    const ledger = new HitLedger();
    expect(ledger.clientClaim(1, 106)).toEqual([]);
    expect(ledger.count).toBe(0);
  });

  it('clears on resync without re-firing old hits', () => {
    const ledger = new HitLedger();
    ledger.process(manifest, 3, 0, 1, 6);
    ledger.clear();
    expect(ledger.count).toBe(0);
    expect(ledger.process(manifest, 3, 0, 1, 6)).toHaveLength(1);
  });
});
