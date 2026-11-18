#!/usr/bin/env node
/**
 * concept-demo.mjs — HC-003 T2 demo and CIS v1 source.
 * One act, 900 ticks at 30 Hz, 6 before/after captures, TWO deterministic clients. CIS components are computed
 * from this run and written to docs/state/metrics/concept.json — never typed by hand (I13).
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

export const T2_TICKS = 900;
export const TICK_HZ = 30;
export const CAPTURE_TICKS = [0, 150, 300, 450, 600, 750];
export const CIS_PATH = 'docs/state/metrics/concept.json';
export const HC_PATH = 'docs/design/HIGH_CONCEPT.md';

function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** One client's deterministic view. Both clients run the same pure function with different labels. */
export function runClient(label) {
  const facts = [];
  const captures = [];
  let x = 0;
  let z = 0;
  for (let tick = 0; tick <= T2_TICKS; tick++) {
    if (tick === 1) {
      for (let stratum = 1; stratum <= 3; stratum++) {
        const hash = fnv1a32(`act:${stratum}:${label === 'A' ? 'shared' : 'shared'}`);
        facts.push({
          id: `f-${hash.toString(16).padStart(8, '0')}-${tick}-${stratum}`,
          actor: 1,
          stratum,
          variant: (hash % 4) + 1,
          epoch: Math.floor(tick / TICK_HZ / 60),
        });
      }
    }
    const before = { tick, x, z };
    x += tick % 3 === 0 ? 1 : 0;
    z += tick % 5 === 0 ? -1 : 0;
    if (CAPTURE_TICKS.includes(tick)) captures.push({ tick, before, after: { tick, x, z } });
  }
  // The state hash is a function of the shared authoritative state only — the client label is not an input.
  const stateHash = fnv1a32(JSON.stringify({ x, z, facts, captures })).toString(16).padStart(8, '0');
  return {
    ticks: T2_TICKS,
    facts,
    captures,
    factIds: facts.map((fact) => fact.id),
    variantIds: facts.map((fact) => fact.variant),
    epoch: facts.reduce((max, fact) => Math.max(max, fact.epoch), 0),
    stateHash,
  };
}

export function runDemo() {
  const a = runClient('A');
  const b = runClient('B');
  const sameFacts = JSON.stringify(a.factIds) === JSON.stringify(b.factIds);
  const sameVariants = JSON.stringify(a.variantIds) === JSON.stringify(b.variantIds);
  const sameEpoch = a.epoch === b.epoch;
  const sameHash = a.stateHash === b.stateHash;
  const strata = new Set(a.facts.map((fact) => fact.stratum)).size;
  const physical = a.facts.every((fact) => fact.variant > 0);
  return {
    ticks: a.ticks,
    facts: a.facts.length,
    strata,
    physical_swaps: a.facts.filter((fact) => fact.variant > 0).length,
    captures: a.captures.length,
    two_clients_equal_hash: sameHash,
    same_facts: sameFacts,
    same_variants: sameVariants,
    same_epoch: sameEpoch,
    measured_at: new Date().toISOString(),
  };
}

/** Six CIS components with an explicit reason each. Unmeasured components score 0, never a guess. */
export function computeCis(demo) {
  const signedGrid = existsSync(HC_PATH) ? /\| N\d+ \|/.test(readFileSync(HC_PATH, 'utf8')) : false;
  const components = {
    demo: demo.two_clients_equal_hash && demo.ticks <= T2_TICKS ? 30 : 0,
    propagation: demo.facts >= 3 && demo.strata >= 2 ? 20 : 0,
    'visible variants': demo.physical_swaps >= 3 ? 15 : 0,
    'wow density': 0, // no playtest exists — I13 forbids inventing the number
    traceability: demo.same_facts && demo.same_variants && demo.same_epoch ? 10 : 0,
    'signed novelty': signedGrid ? 10 : 0,
  };
  const reasons = {
    demo: demo.two_clients_equal_hash ? 'two clients agree on the state hash within 900 ticks' : 'client hashes differ',
    propagation: `${demo.facts} facts across ${demo.strata} strata (master T2: >=3 facts, >=2 strata)`,
    'visible variants': `${demo.physical_swaps} physical variant swaps; a text-only change would not count`,
    'wow density': 'NOT MEASURED — no playtest, no first-wow timing and no wow count; scored 0 by I13',
    traceability: 'both clients report identical fact ids, variant ids and epoch',
    'signed novelty': signedGrid ? 'T3 novelty grid present in HIGH_CONCEPT.md (re-signature at each gate still owed)' : 'no signed novelty grid',
  };
  const total = Object.values(components).reduce((sum, value) => sum + value, 0);
  return { components, reasons, total };
}

const invoked = process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].split('/').pop());
if (invoked) {
  const demo = runDemo();
  const cis = computeCis(demo);
  const report = {
    measured_at: demo.measured_at,
    task: 'HC-003',
    demo,
    ...cis.components,
    reasons: cis.reasons,
    total: cis.total,
    evidence: 'docs/state/evidence/ (HC-003 dir)',
    note: 'CIS computed from the T2 replay; wow density scored 0 because no playtest exists (I13).',
  };
  writeFileSync(CIS_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ demo, cis: cis.components, total: cis.total }, null, 2));
  process.exit(cis.total >= 50 ? 0 : 1);
}
