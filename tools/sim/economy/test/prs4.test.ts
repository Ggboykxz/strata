import { describe, expect, it } from 'vitest';
import {
  applyCraft, bundleValue, canCraft, detectProfitCycle, recipeDelta, runCraftPrototype,
  unitValue, validateRecipe, type Recipe,
} from '../prs4_craft';

const smelt: Recipe = {
  id: 'smelt',
  inputs: [{ kind: 'ore', units: 2n }, { kind: 'coal', units: 1n }],
  output: { kind: 'ingot', units: 1n },
  outputTier: 2,
  delayedCostTicks: 30,
  sink: 'sink:smelt',
};

const replicate: Recipe = {
  id: 'replicate',
  inputs: [{ kind: 'script', units: 1n }, { kind: 'coal', units: 1n }],
  output: { kind: 'script', units: 3n },
  outputTier: 4,
  delayedCostTicks: 60,
  sink: 'sink:replicate',
};

describe('minor-unit value', () => {
  it('derives a deterministic value from the item kind', () => {
    expect(unitValue('ore')).toBe(unitValue('ore'));
    expect(unitValue('ore')).toBeGreaterThan(0n);
    expect(bundleValue({ kind: 'ore', units: 3n })).toBe(unitValue('ore') * 3n);
  });

  it('flags a recipe that prints value', () => {
    expect(recipeDelta(replicate)).toBeGreaterThan(0n);
  });
});

describe('recipe validation and craft', () => {
  it('refuses an illegal recipe instead of downgrading it', () => {
    expect(validateRecipe(smelt)).toEqual([]);
    expect(validateRecipe({ ...smelt, outputTier: 5 }).join(' ')).toContain('tier');
    expect(validateRecipe({ ...smelt, sink: '' }).join(' ')).toContain('sink');
    expect(validateRecipe({ ...smelt, inputs: [] }).join(' ')).toContain('input count');
    expect(validateRecipe({ ...smelt, inputs: [smelt.inputs[0]!, smelt.inputs[0]!] }).join(' ')).toContain('duplicate');
    expect(validateRecipe({ ...smelt, output: { kind: 'ore', units: 1n } }).join(' ')).toContain('output kind');
    expect(validateRecipe({ ...smelt, delayedCostTicks: 0 }).join(' ')).toContain('delayed cost');
  });

  it('consumes inputs through a named sink and writes provenance fact ids', () => {
    const inventory = new Map<string, bigint>([['ore', 4n], ['coal', 2n]]);
    expect(canCraft(smelt, inventory)).toBe(true);
    const item = applyCraft(smelt, inventory, 7, ['f-in-1', 'f-in-2']);
    expect(item.inputFactIds).toEqual(['f-in-1', 'f-in-2']);
    expect(item.outputFactId).toMatch(/^f-[0-9a-f]{8}-7$/);
    expect(inventory.get('ore')).toBe(2n);
    expect(inventory.get('sink:smelt')).toBe(3n);
    expect(inventory.get('ingot')).toBe(1n);
    applyCraft(smelt, inventory, 8, ['f-in-3', 'f-in-4']);
    expect(canCraft(smelt, inventory)).toBe(false);
    expect(() => applyCraft(smelt, inventory, 9, [])).toThrow(RangeError);
    expect([...inventory.values()].every((value) => value >= 0n)).toBe(true);
  });
});

describe('infinite-profit cycle detection', () => {
  it('names a positive cycle and refuses to call a benign chain a cycle', () => {
    const cycle = detectProfitCycle([smelt, replicate]);
    expect(cycle).not.toBeNull();
    expect(cycle?.path.join(' ')).toContain('script');
    expect(BigInt(cycle?.gainMinorUnits ?? '0')).toBeGreaterThan(0n);
    expect(detectProfitCycle([smelt])).toBeNull();
  });

  it('is deterministic for the same recipe script', () => {
    expect(detectProfitCycle([smelt, replicate])).toEqual(detectProfitCycle([smelt, replicate]));
  });
});

describe('PR-S4 harness', () => {
  it('prints a deterministic labelled local report', () => {
    const report = runCraftPrototype();
    console.log(JSON.stringify(report, null, 2));
    expect(report.deterministic).toBe(true);
    expect(report.cycles).toBe(1);
    expect(report.cycle_path.length).toBeGreaterThan(0);
    expect(report.crafted).toBeGreaterThan(0);
    expect(BigInt(report.inventory_value)).toBeGreaterThanOrEqual(0n);
    expect(report.label).toContain('not ECON-001');
  });
});
