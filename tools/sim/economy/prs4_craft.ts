/**
 * PR-S4 crafting chain and infinite-profit cycle detection (local greybox economy). All value is bigint minor
 * units (D150). A positive-value cycle is a structural exploit: it is detected and named, never averaged away.
 * No market simulation, no inflation/Gini claim — PR-S5/ECON-001 own those.
 */
import { fnv1a32 } from '../../../packages/core/src/index';

export const MAX_RECIPE_INPUTS = 8;
export const MIN_RECIPE_INPUTS = 2;
export const MAX_OUTPUT_TIER = 4;

export interface Bundle {
  readonly kind: string;
  readonly units: bigint;
}

export interface Recipe {
  readonly id: string;
  readonly inputs: readonly Bundle[];
  readonly output: Bundle;
  readonly outputTier: number;
  /** Cost deferred to another era; zero means a concept-debt item (GDD §8.4). */
  readonly delayedCostTicks: number;
  readonly sink: string;
}

export interface CraftedItem {
  readonly itemId: string;
  readonly recipeId: string;
  readonly inputFactIds: readonly string[];
  readonly outputFactId: string;
  readonly tier: number;
  readonly tick: number;
}

export interface ProfitCycle {
  readonly path: readonly string[];
  readonly gainMinorUnits: string;
}

function hashText(text: string): number {
  const codes: number[] = [];
  for (let index = 0; index < text.length; index++) codes.push(text.charCodeAt(index));
  return fnv1a32(codes);
}

/** Deterministic unit value in minor units, derived from the item kind — never a remembered price. */
export function unitValue(kind: string): bigint {
  if (!kind) throw new RangeError('item kind must be non-empty');
  return BigInt((hashText(kind) % 1_000) + 1);
}

export function bundleValue(bundle: Bundle): bigint {
  if (typeof bundle.units !== 'bigint' || bundle.units < 0n) throw new RangeError('units must be non-negative bigint');
  return unitValue(bundle.kind) * bundle.units;
}

export function inputValue(recipe: Recipe): bigint {
  return recipe.inputs.reduce((total, input) => total + bundleValue(input), 0n);
}

/** Positive means the recipe prints value; negative means a named sink consumed it. */
export function recipeDelta(recipe: Recipe): bigint {
  return bundleValue(recipe.output) - inputValue(recipe);
}

export function validateRecipe(recipe: Recipe): readonly string[] {
  const problems: string[] = [];
  if (!recipe.id) problems.push('empty recipe id');
  if (recipe.inputs.length < MIN_RECIPE_INPUTS || recipe.inputs.length > MAX_RECIPE_INPUTS) {
    problems.push(`${recipe.id}: input count ${recipe.inputs.length} outside ${MIN_RECIPE_INPUTS}..${MAX_RECIPE_INPUTS}`);
  }
  const kinds = new Set(recipe.inputs.map((input) => input.kind));
  if (kinds.size !== recipe.inputs.length) problems.push(`${recipe.id}: duplicate input kind`);
  if (kinds.has(recipe.output.kind)) problems.push(`${recipe.id}: output kind is also an input`);
  if (!Number.isInteger(recipe.outputTier) || recipe.outputTier < 1 || recipe.outputTier > MAX_OUTPUT_TIER) {
    problems.push(`${recipe.id}: tier outside 1..${MAX_OUTPUT_TIER}`);
  }
  if (!Number.isInteger(recipe.delayedCostTicks) || recipe.delayedCostTicks < 1) {
    problems.push(`${recipe.id}: missing delayed cost`);
  }
  if (!recipe.sink) problems.push(`${recipe.id}: missing named sink`);
  return problems;
}

export function canCraft(recipe: Recipe, inventory: ReadonlyMap<string, bigint>): boolean {
  return validateRecipe(recipe).length === 0
    && recipe.inputs.every((input) => (inventory.get(input.kind) ?? 0n) >= input.units);
}

/** Consume inputs through the named sink and write an item carrying its provenance fact ids. */
export function applyCraft(
  recipe: Recipe,
  inventory: Map<string, bigint>,
  tick: number,
  inputFactIds: readonly string[],
): CraftedItem {
  if (!canCraft(recipe, inventory)) throw new RangeError(`craft ${recipe.id} refused: inputs or recipe invalid`);
  if (!Number.isInteger(tick) || tick < 0) throw new RangeError('tick must be non-negative');
  for (const input of recipe.inputs) {
    inventory.set(input.kind, (inventory.get(input.kind) ?? 0n) - input.units);
    inventory.set(recipe.sink, (inventory.get(recipe.sink) ?? 0n) + input.units);
  }
  const previous = inventory.get(recipe.output.kind) ?? 0n;
  inventory.set(recipe.output.kind, previous + recipe.output.units);
  return {
    itemId: `${recipe.id}:${tick}:${inputFactIds.join(',')}`,
    recipeId: recipe.id,
    inputFactIds,
    outputFactId: `f-${hashText(`${recipe.id}:${tick}:${inputFactIds.join(',')}`).toString(16).padStart(8, '0')}-${tick}`,
    tier: recipe.outputTier,
    tick,
  };
}

interface Edge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly weight: bigint;
}

/** Condense a multi-input recipe into a bundle node so all inputs participate in any cycle. */
function edgesOf(recipes: readonly Recipe[]): readonly Edge[] {
  const edges: Edge[] = [];
  for (const recipe of [...recipes].sort((a, b) => a.id.localeCompare(b.id))) {
    const bundle = `bundle:${recipe.id}`;
    for (const input of recipe.inputs) {
      edges.push({ id: `${recipe.id}:in:${input.kind}`, from: input.kind, to: bundle, weight: -bundleValue(input) });
    }
    edges.push({ id: `${recipe.id}:out`, from: bundle, to: recipe.output.kind, weight: bundleValue(recipe.output) });
  }
  return edges;
}

/** Bellman-Ford style max-relaxation: a still-improvable node proves a positive (infinite-profit) cycle. */
export function detectProfitCycle(recipes: readonly Recipe[]): ProfitCycle | null {
  const edges = edgesOf(recipes);
  const nodes = [...new Set(edges.flatMap((edge) => [edge.from, edge.to]))].sort();
  const distance = new Map<string, bigint>(nodes.map((node) => [node, 0n]));
  const predecessor = new Map<string, string>();

  for (let round = 0; round < nodes.length; round++) {
    let changed = false;
    for (const edge of edges) {
      const candidate = (distance.get(edge.from) ?? 0n) + edge.weight;
      if (candidate > (distance.get(edge.to) ?? 0n)) {
        distance.set(edge.to, candidate);
        predecessor.set(edge.to, edge.from);
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (const edge of edges) {
    const candidate = (distance.get(edge.from) ?? 0n) + edge.weight;
    if (candidate <= (distance.get(edge.to) ?? 0n)) continue;
    let node = edge.to;
    for (let index = 0; index < nodes.length; index++) node = predecessor.get(node) ?? node;
    const path: string[] = [];
    const seen = new Set<string>();
    let cursor = node;
    while (!seen.has(cursor) && path.length <= nodes.length + 1) {
      seen.add(cursor);
      path.push(cursor);
      cursor = predecessor.get(cursor) ?? edge.from;
    }
    path.reverse();
    return { path, gainMinorUnits: (candidate - (distance.get(edge.to) ?? 0n)).toString() };
  }
  return null;
}

export interface CraftReport {
  readonly recipes: number;
  readonly crafted: number;
  readonly cycles: number;
  readonly cycle_path: readonly string[];
  readonly inventory_value: string;
  readonly deterministic: boolean;
  readonly label: string;
}

function inventoryValue(inventory: ReadonlyMap<string, bigint>): bigint {
  let total = 0n;
  for (const [kind, units] of inventory) total += kind.startsWith('sink:') ? 0n : unitValue(kind) * units;
  return total;
}

export function runCraftPrototype(): CraftReport {
  const recipes: readonly Recipe[] = [
    {
      id: 'smelt',
      inputs: [{ kind: 'ore', units: 2n }, { kind: 'coal', units: 1n }],
      output: { kind: 'ingot', units: 1n },
      outputTier: 2,
      delayedCostTicks: 30,
      sink: 'sink:smelt',
    },
    {
      id: 'forge',
      inputs: [{ kind: 'ingot', units: 1n }, { kind: 'coal', units: 1n }],
      output: { kind: 'blade', units: 1n },
      outputTier: 3,
      delayedCostTicks: 45,
      sink: 'sink:forge',
    },
  ];
  const exploit: Recipe = {
    id: 'replicate',
    inputs: [{ kind: 'script', units: 1n }, { kind: 'coal', units: 1n }],
    output: { kind: 'script', units: 3n },
    outputTier: 4,
    delayedCostTicks: 60,
    sink: 'sink:replicate',
  };

  const run = () => {
    const inventory = new Map<string, bigint>([['ore', 20n], ['coal', 20n], ['script', 2n]]);
    let crafted = 0;
    for (const recipe of recipes) {
      for (let tick = 0; tick < 3; tick++) {
        if (canCraft(recipe, inventory)) { applyCraft(recipe, inventory, tick, [`f-${recipe.id}-${tick}`]); crafted++; }
      }
    }
    const cycle = detectProfitCycle([...recipes, exploit]);
    return { crafted, cycle, value: inventoryValue(inventory).toString() };
  };

  const a = run();
  const b = run();
  return {
    recipes: recipes.length + 1,
    crafted: a.crafted,
    cycles: a.cycle ? 1 : 0,
    cycle_path: a.cycle?.path ?? [],
    inventory_value: a.value,
    deterministic: JSON.stringify(a) === JSON.stringify(b),
    label: 'local greybox economy — not ECON-001, no inflation or Gini claim',
  };
}
