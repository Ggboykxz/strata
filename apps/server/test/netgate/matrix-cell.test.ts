/**
 * Env-driven NET-GATE matrix cell test (harness sanity only — never a NET-GATE criterion assertion).
 *
 * Env:
 *   MATRIX_RTT_MS       RTT in ms (default 0)
 *   MATRIX_LOSS_PCT     loss percent in [0, 100) (default 0)
 *   MATRIX_JITTER_MS    extra uniform jitter in ms (default 0)
 *   MATRIX_DURATION_S   wall-clock duration of the cell in seconds (default 2 — small for CI)
 *   MATRIX_METRICS_FILE if set, the metrics object is appended to this JSON array file
 *   MATRIX_COMMIT       commit hash recorded in the metrics object (driver passes git rev-parse HEAD)
 *   MATRIX_RUN_ID       optional explicit run_id
 *
 * The only assertions are harness sanity: 4 clients connected and the tick advanced. Desyncs,
 * correction distances, byte rates and tick times are RECORDED, never asserted.
 */
import { expect, it } from 'vitest';
import { MATRIX_DEFAULT_DURATION_S } from './matrix-emulator';
import { runMatrixCell } from './matrix-harness';

const rttMs = Number(process.env.MATRIX_RTT_MS ?? '0');
const lossPct = Number(process.env.MATRIX_LOSS_PCT ?? '0');
const jitterMs = Number(process.env.MATRIX_JITTER_MS ?? '0');
const durationS = Number(process.env.MATRIX_DURATION_S ?? String(MATRIX_DEFAULT_DURATION_S));

for (const [name, value] of Object.entries({ rttMs, lossPct, jitterMs, durationS })) {
  if (!Number.isFinite(value)) throw new Error(`MATRIX_* env var for ${name} is not a finite number: ${value}`);
}

it(`matrix cell rtt=${rttMs}ms loss=${lossPct}% jitter=${jitterMs}ms duration=${durationS}s`,
  { timeout: Math.ceil(durationS * 1000) + 120_000 },
  async () => {
    const metrics = await runMatrixCell({
      rttMs,
      lossPct,
      jitterMs,
      durationS,
      metricsFile: process.env.MATRIX_METRICS_FILE ?? null,
      commit: process.env.MATRIX_COMMIT ?? null,
      runId: process.env.MATRIX_RUN_ID,
    });
    // Machine-readable metrics on stdout for the evidence log.
    console.log(`MATRIX_METRICS ${JSON.stringify(metrics)}`);
    // Harness sanity only — explicitly NOT a NET-GATE criterion check.
    expect(metrics.clients).toHaveLength(4);
    expect(metrics.clients.every((c) => c.connected)).toBe(true);
    expect(metrics.ticks).toBeGreaterThan(0);
    expect(metrics.sanity.fourClientsConnected).toBe(true);
    expect(metrics.sanity.tickAdvanced).toBe(true);
  });
