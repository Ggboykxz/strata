/**
 * @strata/dashboard — read-only view contract.
 *
 * P0-007 generates `dist/index.html` and `dist/data.json` from repository state in `build.mjs`. This
 * module declares the shape a future browser hydrator must consume; it does not compute values and it has
 * no auth, no live server calls and no gameplay state (those are later tasks).
 */
export interface DashboardView {
  readonly generated_at: string;
  readonly source_metric: string;
  readonly sources: readonly string[];
  readonly workflow: Readonly<Record<string, unknown>>;
  readonly concept: Readonly<Record<string, unknown>>;
  readonly gdd: Readonly<Record<string, unknown>>;
  readonly scope: Readonly<Record<string, unknown>>;
  readonly netcode: Readonly<Record<string, unknown>>;
  readonly economy: Readonly<Record<string, unknown>>;
  readonly ai_audit: Readonly<Record<string, unknown>>;
  readonly blueprint: Readonly<Record<string, unknown>>;
}

/** The browser renders exactly what the builder produced; it never derives a metric. */
export function renderValue(value: unknown): string {
  return value === null || value === undefined ? 'NOT COMPUTABLE' : String(value);
}
