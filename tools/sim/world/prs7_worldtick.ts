/**
 * PR-S7 greybox world tick: deterministic node graph with a BOUNDED Rouille cascade. Over-harvest writes a fact
 * that spawns Rouille in a later era; each spawn erases at most one node per tick and propagates to at most two
 * neighbours until `CASCADE_BOUND_TICKS`. Integer ticks only, no wall clock, no float.
 */
import { fnv1a32 } from '../../../packages/core/src/index';

export const CASCADE_BOUND_TICKS = 12;
export const MAX_NEIGHBOURS = 2;
export const OVER_HARVEST_THRESHOLD = 10;

export interface WorldNode {
  readonly id: number;
  readonly era: number;
  readonly amount: number;
  readonly neighbours: readonly number[];
  readonly erased: boolean;
}

export interface RouilleFact {
  readonly id: string;
  readonly tick: number;
  readonly era: number;
  readonly nodeId: number;
}

interface Pending {
  readonly nodeId: number;
  readonly era: number;
  readonly atTick: number;
}

function hashOf(text: string): number {
  const codes: number[] = [];
  for (let index = 0; index < text.length; index++) codes.push(text.charCodeAt(index));
  return fnv1a32(codes);
}

export class WorldTick {
  private readonly nodes = new Map<number, WorldNode>();
  private readonly facts: RouilleFact[] = [];
  private readonly queue: Pending[] = [];
  private tickValue = 0;
  private lastActiveTick = 0;
  private eraseCount = 0;
  private droppedAfterBound = 0;
  private doubleEraseRefusals = 0;

  constructor(count = 12) {
    if (!Number.isInteger(count) || count < 3) throw new RangeError('world needs at least 3 nodes');
    for (let id = 1; id <= count; id++) {
      const hash = hashOf(`node:${id}`);
      const era = (hash % 3) + 1;
      const neighbours: number[] = [];
      for (let step = 1; step <= MAX_NEIGHBOURS; step++) {
        const neighbour = ((id - 1 + step) % count) + 1;
        if (neighbour !== id) neighbours.push(neighbour);
      }
      this.nodes.set(id, { id, era, amount: 100, neighbours, erased: false });
    }
  }

  get tick(): number { return this.tickValue; }
  get factsWritten(): readonly RouilleFact[] { return [...this.facts]; }
  get erases(): number { return this.eraseCount; }
  get dropped(): number { return this.droppedAfterBound; }
  get doubleEraseRefusalsSeen(): number { return this.doubleEraseRefusals; }
  get lastActive(): number { return this.lastActiveTick; }
  get state(): readonly WorldNode[] { return [...this.nodes.values()].sort((a, b) => a.id - b.id); }

  /** Over-harvest reduces an amount and schedules one Rouille spawn in a LATER era. */
  overHarvest(nodeId: number, units: number): boolean {
    if (!Number.isInteger(nodeId) || !Number.isInteger(units) || units <= 0) return false;
    const node = this.nodes.get(nodeId);
    if (!node || node.erased || node.amount < units) return false;
    this.nodes.set(nodeId, { ...node, amount: node.amount - units });
    if (node.amount - units <= OVER_HARVEST_THRESHOLD) {
      const laterEra = (node.era % 3) + 1;
      this.queue.push({ nodeId, era: laterEra, atTick: this.tickValue + 1 });
      this.lastActiveTick = this.tickValue + 1;
    }
    return true;
  }

  /** Advance one tick and process due spawns, bounded by CASCADE_BOUND_TICKS. */
  step(): void {
    this.tickValue++;
    if (this.tickValue > CASCADE_BOUND_TICKS) {
      this.droppedAfterBound += this.queue.length;
      this.queue.length = 0;
      return;
    }
    const due = this.queue.filter((pending) => pending.atTick <= this.tickValue).slice(0, MAX_NEIGHBOURS);
    this.queue.splice(0, this.queue.length, ...this.queue.filter((pending) => !due.includes(pending)));
    for (const pending of due) {
      const node = this.nodes.get(pending.nodeId);
      if (!node) continue;
      if (node.erased) { this.doubleEraseRefusals++; continue; }
      this.nodes.set(node.id, { ...node, erased: true });
      this.eraseCount++;
      this.lastActiveTick = this.tickValue;
      this.facts.push({
        id: `rouille-${pending.nodeId}-${this.tickValue}`,
        tick: this.tickValue,
        era: pending.era,
        nodeId: pending.nodeId,
      });
      for (const neighbour of node.neighbours) {
        const target = this.nodes.get(neighbour);
        if (!target || target.erased) continue;
        this.queue.push({ nodeId: neighbour, era: pending.era, atTick: this.tickValue + 1 });
      }
    }
  }
}

export interface WorldReport {
  readonly bound_ticks: number;
  readonly facts: number;
  readonly erases: number;
  readonly dropped_after_bound: number;
  readonly double_erase_refusals: number;
  readonly last_active_tick: number;
  readonly deterministic: boolean;
  readonly label: string;
}

export function runWorldPrototype(): WorldReport {
  const run = () => {
    const world = new WorldTick(12);
    world.overHarvest(1, 95);
    world.overHarvest(4, 95);
    for (let tick = 0; tick < CASCADE_BOUND_TICKS + 4; tick++) world.step();
    return {
      facts: world.factsWritten.length,
      erases: world.erases,
      dropped: world.dropped,
      doubles: world.doubleEraseRefusalsSeen,
      last: world.lastActive,
    };
  };
  const a = run();
  const b = run();
  return {
    bound_ticks: CASCADE_BOUND_TICKS,
    facts: a.facts,
    erases: a.erases,
    dropped_after_bound: a.dropped,
    double_erase_refusals: a.doubles,
    last_active_tick: a.last,
    deterministic: JSON.stringify(a) === JSON.stringify(b),
    label: 'local greybox world tick — not a world demo',
  };
}
