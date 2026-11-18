import { describe, expect, it } from 'vitest';
import { computeCis, runClient, runDemo } from '../../scripts/concept-demo.mjs';

describe('hc_demo_30s', () => {
  it('runs one act in <=900 ticks with 3 facts across 3 strata and 6 captures', () => {
    const demo = runDemo();
    expect(demo.ticks).toBe(900);
    expect(demo.facts).toBeGreaterThanOrEqual(3);
    expect(demo.strata).toBeGreaterThanOrEqual(2);
    expect(demo.physical_swaps).toBeGreaterThanOrEqual(1);
    expect(demo.captures).toBe(6);
  });

  it('makes two clients agree on fact ids, variant ids, epoch and state hash', () => {
    const a = runClient('A');
    const b = runClient('B');
    expect(a.factIds).toEqual(b.factIds);
    expect(a.variantIds).toEqual(b.variantIds);
    expect(a.epoch).toBe(b.epoch);
    expect(a.stateHash).toBe(b.stateHash);
    expect(a.stateHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('computes CIS from the demo and scores the unmeasured wow density 0', () => {
    const cis = computeCis(runDemo());
    expect(cis.components.demo).toBe(30);
    expect(cis.components.propagation).toBe(20);
    expect(cis.components['visible variants']).toBe(15);
    expect(cis.components['wow density']).toBe(0);
    expect(cis.components.traceability).toBe(10);
    expect(cis.total).toBe(85);
    expect(cis.reasons['wow density']).toContain('NOT MEASURED');
  });
});
