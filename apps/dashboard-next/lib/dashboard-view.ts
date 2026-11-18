/**
 * Read-only access to the generated dashboard view.
 *
 * `apps/dashboard/build.mjs` is the single source of truth. This module only reads its
 * `dist/data.json` artifact; it never reads source state and never computes a metric.
 * The shape mirrors `apps/dashboard/src/main.ts#DashboardView` and includes the
 * `tier` and `netgate` groups that the builder also emits.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

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
  readonly tier: Readonly<Record<string, unknown>>;
  readonly netgate: Readonly<Record<string, unknown>>;
  readonly ai_audit: Readonly<Record<string, unknown>>;
  readonly blueprint: Readonly<Record<string, unknown>>;
}

export type ViewGroupKey =
  | 'workflow'
  | 'concept'
  | 'gdd'
  | 'scope'
  | 'netcode'
  | 'economy'
  | 'tier'
  | 'netgate'
  | 'ai_audit'
  | 'blueprint';

/** The ten view groups, in the builder's order. */
export const VIEW_GROUPS: readonly (readonly [ViewGroupKey, string])[] = [
  ['workflow', 'WORKFLOW'],
  ['concept', 'CONCEPT'],
  ['gdd', 'GDD'],
  ['scope', 'SCOPE'],
  ['netcode', 'NETCODE'],
  ['economy', 'ECONOMY'],
  ['tier', 'TIER'],
  ['netgate', 'NET-GATE'],
  ['ai_audit', 'AI AUDIT'],
  ['blueprint', 'BLUEPRINT'],
];

const META_KEYS = ['generated_at', 'source_metric', 'sources'] as const;
const GROUP_KEYS = VIEW_GROUPS.map(([key]) => key);

/**
 * Path is relative to this app's directory (the pnpm filter sets cwd there):
 * apps/dashboard-next -> ../../apps/dashboard/dist/data.json
 */
const DATA_PATH = path.resolve(process.cwd(), '../../apps/dashboard/dist/data.json');

/** Fail closed if the generated artifact does not match the declared view contract. */
function assertView(value: unknown): asserts value is DashboardView {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`dashboard view is not an object: ${DATA_PATH}`);
  }
  const record = value as Record<string, unknown>;
  for (const key of [...META_KEYS, ...GROUP_KEYS]) {
    if (!(key in record)) {
      throw new Error(`dashboard view is missing "${key}": ${DATA_PATH}`);
    }
  }
}

/** Reads the generated artifact. Called from the server component at build time. */
export function loadDashboardView(): DashboardView {
  const parsed: unknown = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  assertView(parsed);
  return parsed;
}

/** Equivalent to apps/dashboard/src/main.ts#renderValue. */
export function renderValue(value: unknown): string {
  return value === null || value === undefined ? 'NOT COMPUTABLE' : String(value);
}

/** Presentation-only array formatting; no value is computed or changed. */
export function toCell(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length ? value.map(renderValue).join(', ') : 'none';
  }
  return renderValue(value);
}
