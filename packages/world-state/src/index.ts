/**
 * Deterministic consequence state (PR-S2). Facts are immutable; consequences are derived from a fact id, not
 * authored. Two clients with the same fact log and epoch table must produce byte-identical verdicts.
 * No clock, no float, no dependency.
 */
import { fnv1a32 } from '../../core/src/index';

export const T2_WINDOW_TICKS = 900;
export const T2_MIN_FACTS = 3;
export const T2_MIN_STRATA = 2;
export const T2_CAPTURES = 6;
export const T2_CLIENTS = 2;
export const BASELINE_VARIANT = 0;

export type FactKind = 'burn' | 'flood' | 'ruin' | 'neon';

export interface Fact {
  readonly factId: string;
  readonly actorId: number;
  readonly tick: number;
  readonly kind: FactKind;
  readonly payloadHash: string;
}

export interface Consequence {
  readonly factId: string;
  readonly stratumId: number;
  readonly variantId: number;
  readonly epoch: number;
  readonly captureIds: readonly string[];
}

export interface ClientReport {
  readonly client: number;
  readonly factIds: readonly string[];
  readonly variantIds: readonly number[];
  readonly epoch: number;
}

export interface Verdict {
  readonly pass: boolean;
  readonly reasons: readonly string[];
}

function codes(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i));
  return out;
}

/** Deterministic fact id. A changed payload hash necessarily creates a new id (GDD §7). */
export function makeFact(actorId: number, tick: number, kind: FactKind, payload: string): Fact {
  const payloadHash = fnv1a32(codes(`${payload}:${kind}:${actorId}:${tick}`)).toString(16).padStart(8, '0');
  const idHash = fnv1a32(codes(`${payloadHash}:${actorId}:${tick}`)).toString(16).padStart(8, '0');
  return { factId: `f-${idHash}-${tick}`, actorId, tick, kind, payloadHash };
}

/** Append-only log. A duplicate fact id is refused; nothing is rewritten. */
export class FactLog {
  private readonly facts: Fact[] = [];
  private readonly ids = new Set<string>();

  record(fact: Fact): boolean {
    if (this.ids.has(fact.factId)) return false;
    this.ids.add(fact.factId);
    this.facts.push(fact);
    return true;
  }

  get all(): readonly Fact[] {
    return [...this.facts].sort((a, b) => (a.tick - b.tick) || a.factId.localeCompare(b.factId));
  }

  /** Facts inside the T2 window. Later facts stay in the log but do not count (GDD §8.5). */
  inWindow(): readonly Fact[] {
    return this.all.filter((fact) => fact.tick <= T2_WINDOW_TICKS);
  }
}

/** Derive a spatial consequence. The variant id is a geometry/placement swap, never a text change. */
export function deriveConsequence(fact: Fact): Consequence {
  const hash = fnv1a32(codes(fact.factId));
  return {
    factId: fact.factId,
    stratumId: (hash % 3) + 1,
    variantId: ((hash >>> 8) % 4) + 1,
    epoch: Math.floor(fact.tick / 30),
    captureIds: Array.from({ length: T2_CAPTURES }, (_, index) => `${fact.factId}-c${index + 1}`),
  };
}

/** One client's view, derived from the shared log. No client-specific state. */
export function clientReport(client: number, consequences: readonly Consequence[]): ClientReport {
  return {
    client,
    factIds: consequences.map((consequence) => consequence.factId).sort(),
    variantIds: consequences.map((consequence) => consequence.variantId),
    epoch: consequences.reduce((max, consequence) => Math.max(max, consequence.epoch), 0),
  };
}

/** The fields both clients must agree on. The `client` id is deliberately not part of the comparison. */
export function comparableReport(report: ClientReport): Omit<ClientReport, 'client'> {
  return { factIds: report.factIds, variantIds: report.variantIds, epoch: report.epoch };
}

/** T2 verdict from GDD-CONSEQUENCE §5/§8. Every failed requirement names itself. */
export function t2Verdict(
  facts: readonly Fact[],
  consequences: readonly Consequence[],
  reports: readonly ClientReport[],
): Verdict {
  const reasons: string[] = [];
  if (facts.length < T2_MIN_FACTS) reasons.push(`facts ${facts.length} < ${T2_MIN_FACTS}`);
  if (new Set(consequences.map((consequence) => consequence.stratumId)).size < T2_MIN_STRATA) {
    reasons.push('fewer than 2 strata');
  }
  if (!consequences.some((consequence) => consequence.variantId !== BASELINE_VARIANT)) {
    reasons.push('no geometry variant swap');
  }
  if (consequences.some((consequence) => consequence.captureIds.length !== T2_CAPTURES)) {
    reasons.push(`capture count != ${T2_CAPTURES}`);
  }
  if (reports.length < T2_CLIENTS) reasons.push(`clients ${reports.length} < ${T2_CLIENTS}`);
  const first = reports[0];
  if (first && reports.some((report) => JSON.stringify(comparableReport(report)) !== JSON.stringify(comparableReport(first)))) {
    reasons.push('client reports differ');
  }
  return { pass: reasons.length === 0, reasons };
}
