import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MATRIX_CELLS, SNAPSHOT_64_ENTITIES_BYTES, WIRE_BUDGET_BYTES_PER_SECOND,
  maxSample, runMatrix, runReconnect,
} from '../prn1_matrix';

const smokeCell = { rtt_ms: 150, loss_pct: 2, jitter_ms: 30 } as const;
const ticks = Number(process.env.PRN1_MATRIX_TICKS ?? 240);

describe('PR-N1 NET-GATE matrix', () => {
  it('computes the maximum of a soak-sized sample without spreading it into Math.max', () => {
    // 300k corrections exceed the argument limit of Math.max(0, ...samples): the first 30-minute soak
    // ran its full wall time with zero desyncs and then died while building the report.
    const samples = Array.from({ length: 300_000 }, (_, index) => index % 450);
    expect(maxSample(samples)).toBe(449);
    expect(maxSample([])).toBe(0);
  });

  it('declares the full RTT x loss x jitter matrix exactly once', () => {
    expect(MATRIX_CELLS).toHaveLength(4 * 3 * 2);
    expect(new Set(MATRIX_CELLS.map((cell) => JSON.stringify(cell))).size).toBe(MATRIX_CELLS.length);
    expect(MATRIX_CELLS).toContainEqual({ rtt_ms: 0, loss_pct: 0, jitter_ms: 0 });
    expect(MATRIX_CELLS).toContainEqual({ rtt_ms: 300, loss_pct: 5, jitter_ms: 30 });
  });

  it('runs the full 24-cell matrix with four clients and zero desyncs', { timeout: 240_000 }, () => {
    const report = runMatrix({ ticks, clients: 4, entities: 64, seed: 4242 });
    expect(report.cells).toHaveLength(24);
    for (const cell of report.cells) {
      expect(cell.desyncs).toBe(0);
      expect(cell.server_desyncs).toBe(0);
      expect(cell.hash_integrity_failures).toBe(0);
      expect(cell.ack_missing_ticks).toBe(0);
      // A tick already simulated by a replayed in-flight intent does not generate a second intent.
      expect(cell.input_refusals).toBe(0);
      expect(cell.verified_snapshots).toBeGreaterThan(0);
      expect(cell.snapshot_bytes.min).toBe(SNAPSHOT_64_ENTITIES_BYTES);
      expect(cell.snapshot_bytes.max).toBe(SNAPSHOT_64_ENTITIES_BYTES);
      expect(cell.corrections.samples).toBeGreaterThan(0);
      expect(cell.corrections.p95_mm).toBeLessThan(300);
      expect(cell.corrections.max_mm).toBeLessThanOrEqual(2000);
      expect(cell.corrections.over_2m).toBe(0);
      expect(cell.server_tick_ms.p95).toBeLessThanOrEqual(25);
      // The full-snapshot budget is a known NET-101 failure; the matrix must not hide it.
      expect(cell.checks.wire_budget).toBe(false);
      expect(cell.wire.over_budget_factor).toBeGreaterThan(3);
    }
    expect(report.verdict.transport_pass).toBe(true);
    expect(report.verdict.wire_budget_pass).toBe(false);
    expect(report.verdict.desyncs).toBe(0);
    expect(report.verdict.server_desyncs).toBe(0);
    expect(report.verdict.hash_integrity_failures).toBe(0);
    expect(report.verdict.rubber_band_over_2m).toBe(0);

    const dir = process.env.PRN1_EVIDENCE_DIR;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/matrix.json`, `${JSON.stringify(report, null, 2)}\n`);
      console.log('| RTT ms | loss % | jitter ms | desyncs | verified | speculative | server-ahead | corr p50/p95/max mm | tick p95 ms | down B/s | up B/s |');
      console.log('|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|');
      for (const cell of report.cells) {
        console.log(`| ${cell.requested.rtt_ms} | ${cell.requested.loss_pct} | ${cell.requested.jitter_ms}`
          + ` | ${cell.desyncs} | ${cell.verified_snapshots} | ${cell.speculative_snapshots}`
          + ` | ${cell.server_ahead_snapshots}`
          + ` | ${cell.corrections.p50_mm}/${cell.corrections.p95_mm}/${cell.corrections.max_mm}`
          + ` | ${cell.server_tick_ms.p95} | ${cell.wire.down_bytes_per_client_per_s}`
          + ` | ${cell.wire.up_bytes_per_client_per_s} |`);
      }
      console.log(`VERDICT ${JSON.stringify(report.verdict)}`);
      console.log(`RECONNECT ${JSON.stringify(report.reconnect)}`);
    }
  });

  it('proves reconnect: same entity, seq not reset, exact authoritative state', { timeout: 120_000 }, () => {
    const report = runReconnect({ clients: 4, entities: 64, seed: 4242 });
    expect(report.attempted).toBe(true);
    expect(report.resumed_within_window).toBe(true);
    expect(report.same_entity).toBe(true);
    expect(report.seq_preserved).toBe(true);
    expect(report.hash_valid).toBe(true);
    expect(report.exact_state).toBe(true);
    expect(report.late_resume_refused).toBe(true);
    expect(report.seq_after_resume).toBeGreaterThanOrEqual(report.seq_at_disconnect);
  });

  it('keeps the 64-entity wire budget failing until NET-101', { timeout: 120_000 }, () => {
    const report = runMatrix({
      ticks: 120,
      clients: 4,
      entities: 64,
      seed: 99,
      cells: [{ rtt_ms: 0, loss_pct: 0, jitter_ms: 0 }],
    });
    const cell = report.cells[0]!;
    expect(cell.wire.down_bytes_per_client_per_s).toBeGreaterThan(WIRE_BUDGET_BYTES_PER_SECOND);
    expect(cell.checks.wire_budget).toBe(false);
    expect(cell.wire.over_budget_factor).toBeGreaterThan(3);
    expect(cell.wire.up_bytes_per_client_per_s).toBeLessThanOrEqual(cell.wire.up_budget_bytes_per_s);
  });

  it('is deterministic for transport outcomes across two identical runs', { timeout: 120_000 }, () => {
    const options = {
      ticks: 240,
      clients: 4,
      entities: 16,
      seed: 777,
      cells: [smokeCell],
    };
    const a = runMatrix(options);
    const b = runMatrix(options);
    const stable = (report: typeof a) => report.cells.map((cell) => ({
      desyncs: cell.desyncs,
      server_ahead: cell.server_ahead_snapshots,
      speculative: cell.speculative_snapshots,
      no_prediction: cell.no_prediction_snapshots,
      verified: cell.verified_snapshots,
      hashacks: cell.hashacks_sent,
      server_desyncs: cell.server_desyncs,
      integrity: cell.hash_integrity_failures,
      samples: cell.corrections.samples,
      p95: cell.corrections.p95_mm,
      max: cell.corrections.max_mm,
      over_2m: cell.corrections.over_2m,
      bytes: cell.wire.down_total_bytes_per_s,
    }));
    expect(stable(a)).toEqual(stable(b));
    expect(a.reconnect).toEqual(b.reconnect);
  });

  it('refuses invalid harness parameters', () => {
    const base = { ticks: 10, clients: 4, entities: 64, seed: 1 };
    expect(() => runMatrix({ ...base, clients: 0 })).toThrow(RangeError);
    expect(() => runMatrix({ ...base, entities: 2 })).toThrow(RangeError);
    expect(() => runMatrix({ ...base, ticks: 1 })).toThrow(RangeError);
    expect(() => runReconnect({ clients: 0, entities: 64, seed: 1 })).toThrow(RangeError);
  });
});
