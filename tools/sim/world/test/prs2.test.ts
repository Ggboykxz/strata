import { describe, expect, it } from 'vitest';
import {
  FactLog, clientReport, comparableReport, deriveConsequence, makeFact, t2Verdict,
  type Consequence,
} from '../../../../packages/world-state/src/index';
import { runPropagation } from '../prs2_propagation';

describe('immutable fact log', () => {
  it('derives the same fact id from the same inputs and a new id from a changed payload', () => {
    const a = makeFact(1, 10, 'burn', 'x');
    expect(a).toEqual(makeFact(1, 10, 'burn', 'x'));
    expect(makeFact(1, 10, 'burn', 'y').factId).not.toBe(a.factId);
  });

  it('refuses a duplicate id and sorts by (tick, fact_id)', () => {
    const log = new FactLog();
    const fact = makeFact(1, 20, 'burn', 'x');
    expect(log.record(fact)).toBe(true);
    expect(log.record(fact)).toBe(false);
    log.record(makeFact(2, 5, 'flood', 'y'));
    expect(log.all.map((entry) => entry.tick)).toEqual([5, 20]);
  });

  it('records a late fact but excludes it from the T2 window', () => {
    const log = new FactLog();
    log.record(makeFact(1, 900, 'burn', 'x'));
    log.record(makeFact(2, 901, 'flood', 'y'));
    expect(log.all).toHaveLength(2);
    expect(log.inWindow()).toHaveLength(1);
  });
});

describe('deterministic derivation', () => {
  it('derives consequences and keeps separate chains for two facts in one tick', () => {
    const a = makeFact(9, 31, 'neon', 'cross-a');
    const b = makeFact(10, 31, 'ruin', 'cross-b');
    expect(deriveConsequence(a)).toEqual(deriveConsequence(a));
    expect(deriveConsequence(a).factId).not.toBe(deriveConsequence(b).factId);
    expect(deriveConsequence(a).variantId).toBeGreaterThan(0);
    expect(deriveConsequence(a).captureIds).toHaveLength(6);
  });

  it('gives two clients byte-identical reports', () => {
    const facts = [1, 2, 3].map((id) => makeFact(id, id * 7, 'burn', `p-${id}`));
    const consequences = facts.map(deriveConsequence);
    expect(comparableReport(clientReport(1, consequences)))
      .toEqual(comparableReport(clientReport(2, consequences)));
  });
});

describe('T2 verdict', () => {
  const kinds = ['burn', 'flood', 'ruin', 'neon', 'ruin'] as const;
  const facts = kinds.map((kind, index) => makeFact(index + 1, 10 + index * 7, kind, `p-${index}`));
  const consequences = facts.map(deriveConsequence);
  const reports = [1, 2].map((client) => clientReport(client, consequences));
  expect(new Set(consequences.map((consequence) => consequence.stratumId)).size).toBeGreaterThanOrEqual(2);

  it('passes a script with 3 facts, 2+ strata, a variant swap and 6 captures', () => {
    expect(t2Verdict(facts, consequences, reports).pass).toBe(true);
  });

  it('names every failed requirement', () => {
    expect(t2Verdict(facts.slice(0, 2), consequences, reports).reasons.join(' ')).toContain('facts 2 < 3');
    const noSwap: readonly Consequence[] = consequences.map((consequence) => ({ ...consequence, variantId: 0 }));
    expect(t2Verdict(facts, noSwap, reports).reasons.join(' ')).toContain('no geometry variant swap');
    expect(t2Verdict(facts, consequences, reports.slice(0, 1)).reasons.join(' ')).toContain('clients 1 < 2');
  });
});

describe('PR-S2 harness', () => {
  it('prints a deterministic labelled local report', () => {
    const report = runPropagation();
    console.log(JSON.stringify(report, null, 2));
    expect(report.deterministic).toBe(true);
    expect(report.facts_in_window).toBe(5);
    expect(report.late_facts).toBe(1);
    expect(report.strata).toBeGreaterThanOrEqual(2);
    expect(report.variant_swaps).toBeGreaterThan(0);
    expect(report.captures).toBeGreaterThanOrEqual(6);
    expect(report.clients_agree).toBe(true);
    expect(report.verdict_pass).toBe(true);
    expect(report.label).toContain('not a T2 sign-off');
  });
});
