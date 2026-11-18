import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runSoak } from '../prn1_matrix';

/**
 * The real-time soak is opt-in: `pnpm verify` must stay short, and a 30-minute wall-clock test is an
 * acceptance measurement, not a unit test. Run it with PRN1_SOAK=1 and a real PRN1_SOAK_MINUTES=30.
 */
const enabled = process.env.PRN1_SOAK === '1';
const suite = enabled ? describe : describe.skip;
const minutes = Number(process.env.PRN1_SOAK_MINUTES ?? 30);

suite('PR-N1 real-time soak', () => {
  it(`runs ${minutes} real minutes at 30 Hz with four clients and zero desyncs`, { timeout: 35 * 60 * 1000 }, async () => {
    const report = await runSoak({
      minutes,
      clients: 4,
      entities: 64,
      seed: 4242,
      cell: { rtt_ms: 150, loss_pct: 2, jitter_ms: 30 },
      progressEverySeconds: 60,
    });

    const dir = process.env.PRN1_EVIDENCE_DIR;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/soak.json`, `${JSON.stringify(report, null, 2)}\n`);
    }
    console.log(JSON.stringify(report, null, 2));

    expect(report.checks.duration).toBe(true);
    expect(report.checks.desyncs).toBe(true);
    expect(report.checks.corrections).toBe(true);
    expect(report.checks.verified).toBe(true);
    expect(report.checks.server_tick).toBe(true);
    expect(report.desyncs).toBe(0);
    expect(report.server_desyncs).toBe(0);
    expect(report.hash_integrity_failures).toBe(0);
    expect(report.ack_missing_ticks).toBe(0);
    expect(report.input_refusals).toBe(0);
    expect(report.corrections.samples).toBeGreaterThan(0);
    expect(report.corrections.p95_mm).toBeLessThan(300);
    expect(report.corrections.max_mm).toBeLessThanOrEqual(2000);
    expect(report.corrections.over_2m).toBe(0);
    expect(report.server_tick_ms.p95).toBeLessThanOrEqual(25);
  });
});
