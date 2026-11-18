/**
 * PR-S2 local propagation harness. Builds a deterministic fact script (including two crossing acts in one tick
 * and one late fact), derives consequences and checks the T2 verdict from GDD-CONSEQUENCE. Local greybox only —
 * no browser replay, no blind reviewer, no real geometry (GB-001 / PR-S3 own those).
 */
import {
  FactLog, clientReport, comparableReport, deriveConsequence, makeFact, t2Verdict,
  type FactKind, type Verdict,
} from '../../../packages/world-state/src/index';

export interface PropagationReport {
  readonly facts_in_window: number;
  readonly late_facts: number;
  readonly strata: number;
  readonly variant_swaps: number;
  readonly captures: number;
  readonly clients_agree: boolean;
  readonly verdict_pass: boolean;
  readonly reasons: readonly string[];
  readonly deterministic: boolean;
  readonly label: string;
}

const KINDS: readonly FactKind[] = ['burn', 'flood', 'ruin'];

function run() {
  const log = new FactLog();
  for (let index = 0; index < 3; index++) {
    log.record(makeFact(index + 1, 10 + index * 7, KINDS[index]!, `payload-${index}`));
  }
  // Two acts in the same tick: separate chains, separate ids (GDD §8.4).
  log.record(makeFact(9, 31, 'neon', 'cross-a'));
  log.record(makeFact(10, 31, 'ruin', 'cross-b'));
  // A fact after tick 900 is stored but excluded from this replay (GDD §8.5).
  log.record(makeFact(11, 901, 'burn', 'late'));

  const facts = log.inWindow();
  const consequences = facts.map(deriveConsequence);
  const reports = [1, 2].map((client) => clientReport(client, consequences));
  const verdict: Verdict = t2Verdict(facts, consequences, reports);
  const first = JSON.stringify(comparableReport(reports[0]!));
  return {
    facts: facts.length,
    late: log.all.length - facts.length,
    strata: new Set(consequences.map((consequence) => consequence.stratumId)).size,
    swaps: consequences.filter((consequence) => consequence.variantId !== 0).length,
    captures: consequences.reduce((total, consequence) => total + consequence.captureIds.length, 0),
    clientsAgree: reports.every((report) => JSON.stringify(comparableReport(report)) === first),
    verdict,
  };
}

export function runPropagation(): PropagationReport {
  const a = run();
  const b = run();
  return {
    facts_in_window: a.facts,
    late_facts: a.late,
    strata: a.strata,
    variant_swaps: a.swaps,
    captures: a.captures,
    clients_agree: a.clientsAgree,
    verdict_pass: a.verdict.pass,
    reasons: a.verdict.reasons,
    deterministic: JSON.stringify(a) === JSON.stringify(b),
    label: 'local greybox propagation — not a T2 sign-off',
  };
}
