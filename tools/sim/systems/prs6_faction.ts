/**
 * PR-S6 greybox faction/reputation prototype. Standing is DERIVED from immutable attributed facts — there is no
 * authored bar to edit. Integer weights only, deterministic seed, no wall clock, no player or UI.
 */
import { fnv1a32 } from '../../../packages/core/src/index';

export const REPUTATION_MIN = -100;
export const REPUTATION_MAX = 100;
export const HOSTILE_THRESHOLD = -20;
export const ALLIED_THRESHOLD = 40;
export const FACT_COUNT = 1_000;
export const ACTOR_COUNT = 10;
export const FACTION_COUNT = 3;

export type Standing = 'hostile' | 'neutral' | 'allied';

export interface FactionFact {
  readonly id: string;
  readonly actor: number;
  readonly faction: number;
  readonly weight: number;
  readonly tick: number;
}

function hashOf(text: string): number {
  const codes: number[] = [];
  for (let index = 0; index < text.length; index++) codes.push(text.charCodeAt(index));
  return fnv1a32(codes);
}

export class FactionGraph {
  private readonly facts: FactionFact[] = [];
  private readonly reputation = new Map<string, number>();
  private readonly membership = new Map<number, number>();
  private reputationChanges = 0;
  private standingChanges = 0;
  private switches = 0;
  private switchRefusals = 0;

  get allFacts(): readonly FactionFact[] { return [...this.facts]; }
  get reputationChangeCount(): number { return this.reputationChanges; }
  get standingChangeCount(): number { return this.standingChanges; }
  get switchCount(): number { return this.switches; }
  get switchRefusalCount(): number { return this.switchRefusals; }

  private key(actor: number, faction: number): string { return `${actor}:${faction}`; }

  private apply(fact: FactionFact, count: boolean): void {
    const key = this.key(fact.actor, fact.faction);
    const before = this.standing(fact.actor, fact.faction);
    const previous = this.reputation.get(key) ?? 0;
    const next = Math.max(REPUTATION_MIN, Math.min(REPUTATION_MAX, previous + fact.weight));
    this.reputation.set(key, next);
    if (count && next !== previous) this.reputationChanges++;
    if (count && before !== this.standing(fact.actor, fact.faction)) this.standingChanges++;
  }

  record(fact: FactionFact): boolean {
    if (!Number.isInteger(fact.actor) || fact.actor < 1 || fact.actor > ACTOR_COUNT) return false;
    if (!Number.isInteger(fact.faction) || fact.faction < 1 || fact.faction > FACTION_COUNT) return false;
    if (!Number.isInteger(fact.weight) || fact.weight === 0) return false;
    if (!Number.isInteger(fact.tick) || fact.tick < 0) return false;
    if (this.facts.some((existing) => existing.id === fact.id)) return false;
    this.facts.push(fact);
    this.apply(fact, true);
    return true;
  }

  reputationOf(actor: number, faction: number): number {
    return this.reputation.get(this.key(actor, faction)) ?? 0;
  }

  standing(actor: number, faction: number): Standing {
    const value = this.reputationOf(actor, faction);
    if (value <= HOSTILE_THRESHOLD) return 'hostile';
    if (value >= ALLIED_THRESHOLD) return 'allied';
    return 'neutral';
  }

  memberOf(actor: number): number { return this.membership.get(actor) ?? 1; }

  /** A switch needs non-negative standing with the new faction and no hostile standing with the old one. */
  switchFaction(actor: number, newFaction: number, tick: number): boolean {
    if (newFaction < 1 || newFaction > FACTION_COUNT || !Number.isInteger(tick) || tick < 0) return false;
    const old = this.memberOf(actor);
    if (newFaction === old) return false;
    if (this.reputationOf(actor, newFaction) < 0 || this.standing(actor, old) === 'hostile') {
      this.switchRefusals++;
      return false;
    }
    this.membership.set(actor, newFaction);
    this.switches++;
    return true;
  }

  /** Reproduce every reputation value from the immutable log; a mismatch is a hard failure. */
  replay(): boolean {
    const before = [...this.reputation.entries()].sort().map(([key, value]) => `${key}:${value}`).join('|');
    this.reputation.clear();
    for (const fact of this.facts) this.apply(fact, false);
    const after = [...this.reputation.entries()].sort().map(([key, value]) => `${key}:${value}`).join('|');
    return before === after;
  }
}

export interface FactionReport {
  readonly facts: number;
  readonly reputation_changes: number;
  readonly standing_changes: number;
  readonly switches: number;
  readonly switch_refusals: number;
  readonly replay_exact: boolean;
  readonly deterministic: boolean;
  readonly label: string;
}

export function runFactionPrototype(): FactionReport {
  const run = () => {
    const graph = new FactionGraph();
    for (let index = 0; index < FACT_COUNT; index++) {
      const hash = hashOf(`fact:${index}`);
      const actor = (index % ACTOR_COUNT) + 1;
      const faction = (hash % FACTION_COUNT) + 1;
      // A zero weight is not a fact (GDD: no implicit neutral act); map it to +1 so the script records 1000 facts.
      const weight = ((hash >>> 8) % 9 - 4) || 1;
      graph.record({ id: `f-${hash.toString(16).padStart(8, '0')}-${index}`, actor, faction, weight, tick: index });
      if (index % 100 === 0) graph.switchFaction(actor, (faction % FACTION_COUNT) + 1, index);
    }
    return {
      facts: graph.allFacts.length,
      reputation: graph.reputationChangeCount,
      standing: graph.standingChangeCount,
      switches: graph.switchCount,
      refusals: graph.switchRefusalCount,
      replay: graph.replay(),
    };
  };
  const a = run();
  const b = run();
  return {
    facts: a.facts,
    reputation_changes: a.reputation,
    standing_changes: a.standing,
    switches: a.switches,
    switch_refusals: a.refusals,
    replay_exact: a.replay,
    deterministic: JSON.stringify(a) === JSON.stringify(b),
    label: 'local greybox faction prototype — not a balance sign-off',
  };
}
