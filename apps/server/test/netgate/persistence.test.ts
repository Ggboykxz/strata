/**
 * GATE:NET prototype — counters survive an in-process restart.
 *
 * This is a file-backed prototype, not Redis: one process, one writer, atomic write-and-rename. The test
 * restarts the gate over the same JSON file and proves the rate window, rejection counts and audit entries
 * are still there. Sequence anti-replay state is intentionally not persisted and is reported as a residual gap.
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { encodeFrame } from '@strata/protocol';
import { PersistentSecurity } from './persistent-security';

function intent(seq: number): Uint8Array {
  return encodeFrame({ kind: 'intent', entity: 1, seq, dx: 1, dz: 0 });
}

describe('file-backed counters', () => {
  it('persists the rate window, rejection counts and audit entries across a restart', () => {
    const directory = mkdtempSync(join(tmpdir(), 'strata-netgate-persist-'));
    const file = join(directory, 'security-counters.json');
    try {
      const first = new PersistentSecurity(file);
      let admitted = 0;
      let rateLimited = 0;
      for (let seq = 1; seq <= 32; seq++) {
        const verdict = first.accept(9, 100, intent(seq));
        if (verdict.allowed) admitted++;
        else if (verdict.reason === 'rate-limited') rateLimited++;
      }
      expect(admitted).toBe(30);
      expect(rateLimited).toBe(2);
      expect(first.counts.get('rate-limited')).toBe(2);
      expect(first.auditAction(1, 100, 'grant', 'ticket-42')).toBe(true);
      expect(first.auditAction(1, 100, 'grant', '   ')).toBe(false);

      const stored = JSON.parse(readFileSync(file, 'utf8')) as {
        version: number;
        rejections: Record<string, number>;
        rate: Record<string, { window: number; count: number }>;
        audit: unknown[];
      };
      expect(stored.version).toBe(1);
      expect(stored.rate['9']).toEqual({ window: 3, count: 30 });
      expect(stored.rejections['rate-limited']).toBe(2);
      expect(stored.audit).toHaveLength(1);
      expect(readdirSync(directory).filter((name) => name.endsWith('.tmp'))).toHaveLength(0);

      const restarted = new PersistentSecurity(file);
      expect(restarted.counts.get('rate-limited')).toBe(2);
      expect(restarted.auditEntries).toHaveLength(1);
      expect(restarted.auditEntries[0]?.reason).toBe('ticket-42');
      expect(Object.isFrozen(restarted.auditEntries[0])).toBe(true);

      // The same window is still exhausted after restart: a reset would have admitted another 30.
      expect(restarted.accept(9, 101, intent(33))).toMatchObject({ allowed: false, reason: 'rate-limited' });
      expect(restarted.counts.get('rate-limited')).toBe(3);
      // The next fixed window starts fresh.
      expect(restarted.accept(9, 130, intent(34)).allowed).toBe(true);

      expect(restarted.auditAction(2, 130, 'grant', 'ticket-99')).toBe(true);
      const third = new PersistentSecurity(file);
      expect(third.auditEntries).toHaveLength(2);
      expect(third.counts.get('rate-limited')).toBe(3);

      console.log(`NETGATE_PERSIST ${JSON.stringify({
        firstAdmitted: admitted,
        firstRateLimited: rateLimited,
        persistedWindow: stored.rate['9'],
        restartedCounts: Object.fromEntries(restarted.counts),
        afterRestartRateLimited: third.counts.get('rate-limited'),
        auditEntriesAfterRestart: third.auditEntries.length,
        stateBytes: readFileSync(file).byteLength,
      })}`);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fails closed on a corrupt counter file instead of resetting the budget', () => {
    const directory = mkdtempSync(join(tmpdir(), 'strata-netgate-corrupt-'));
    const file = join(directory, 'security-counters.json');
    try {
      writeFileSync(file, '{not json', 'utf8');
      expect(() => new PersistentSecurity(file)).toThrow(/unreadable/);
      writeFileSync(file, JSON.stringify({
        version: 1,
        rejections: {},
        rate: { 9: { window: 0, count: 31 } },
        audit: [],
      }), 'utf8');
      expect(() => new PersistentSecurity(file)).toThrow(/invalid rate counter/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
