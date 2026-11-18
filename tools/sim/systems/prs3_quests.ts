/**
 * PR-S3 greybox quest prototype (deterministic): fact-derived availability, multiple resolutions kept per actor,
 * and delayed consequences scheduled from the FACT tick, never from wall time. No renderer or player.
 */
import { fnv1a32 } from '../../../packages/core/src/index';

export const DELAY_TICKS = 9;
export const QUEST_COUNT = 5;
export const OPTIONS_PER_QUEST = 3;

export interface QuestFact {
  readonly id: string;
  readonly tick: number;
  readonly stratum: number;
  readonly physical: boolean;
}

export interface QuestResolution {
  readonly questId: string;
  readonly optionId: number;
  readonly actorId: number;
  readonly factId: string;
  readonly dueTick: number;
  readonly stratumIds: readonly number[];
}

function hashText(text: string): string {
  const codes: number[] = [];
  for (let index = 0; index < text.length; index++) codes.push(text.charCodeAt(index));
  return fnv1a32(codes).toString(16).padStart(8, '0');
}

export const DIALOGUE: Readonly<Record<string, readonly [string, string]>> = {
  'quest.accept': ['Accepter la quête', 'Accept the quest'],
  'quest.resolve': ['Résoudre la quête', 'Resolve the quest'],
  'quest.delayed': ['Effet différé', 'Delayed effect'],
  'quest.refused': ['Résolution refusée', 'Resolution refused'],
  'fact.missing': ['Fait introuvable', 'Fact not found'],
  'stratum.changed': ['Strate modifiée', 'Stratum changed'],
};

export class QuestGraph {
  private readonly facts = new Map<string, QuestFact>();
  private readonly resolutions: QuestResolution[] = [];
  private readonly pending: QuestResolution[] = [];
  private readonly applied: string[] = [];
  private textOnlyRefusals = 0;
  private tickValue = 0;

  get tick(): number { return this.tickValue; }
  get allResolutions(): readonly QuestResolution[] { return [...this.resolutions]; }
  get appliedEffects(): readonly string[] { return [...this.applied]; }
  get textOnlyRefused(): number { return this.textOnlyRefusals; }

  addFact(id: string, tick: number, stratum: number, physical = true): void {
    this.facts.set(id, { id, tick, stratum, physical });
  }

  eraseFact(id: string): void { this.facts.delete(id); }
  hasFact(id: string): boolean { return this.facts.has(id); }

  available(prerequisites: readonly string[]): boolean {
    return prerequisites.every((id) => this.facts.has(id));
  }

  /** Reject a text-only resolution; keep one fact id per (quest, option, actor, tick). */
  resolve(
    questId: string,
    optionId: number,
    actorId: number,
    tick: number,
    prerequisites: readonly string[],
    physical: boolean,
  ): boolean {
    if (!this.available(prerequisites)) return false;
    if (!physical) { this.textOnlyRefusals++; return false; }
    if (!Number.isInteger(optionId) || optionId < 1 || optionId > OPTIONS_PER_QUEST) return false;
    const factId = `f-q-${hashText(`${questId}:${optionId}:${actorId}:${tick}`)}-${tick}`;
    const source = this.facts.get(prerequisites[0]!)?.stratum ?? 1;
    const resolution: QuestResolution = {
      questId,
      optionId,
      actorId,
      factId,
      dueTick: tick + DELAY_TICKS,
      stratumIds: [(source % 3) + 1],
    };
    this.resolutions.push(resolution);
    this.pending.push(resolution);
    this.addFact(factId, tick, source);
    return true;
  }

  /** Apply effects due at this tick, ordered by (dueTick, factId). */
  advanceTo(tick: number): void {
    if (!Number.isInteger(tick) || tick < 0) throw new RangeError('tick must be a non-negative integer');
    this.tickValue = tick;
    const due = this.pending.filter((item) => item.dueTick <= tick)
      .sort((a, b) => (a.dueTick - b.dueTick) || a.factId.localeCompare(b.factId));
    this.pending.splice(0, this.pending.length, ...this.pending.filter((item) => !due.includes(item)));
    for (const item of due) {
      this.applied.push(`${item.factId}@${item.dueTick}:${item.stratumIds.join(',')}`);
      for (const stratum of item.stratumIds) this.addFact(`delayed-${item.factId}-${stratum}`, item.dueTick, stratum);
    }
  }
}

export interface QuestReport {
  readonly resolutions: number;
  readonly distinct_fact_ids: number;
  readonly delayed_applied: number;
  readonly text_only_refusals: number;
  readonly reachable_states: number;
  readonly fr_en_keys: number;
  readonly untranslated_keys: number;
  readonly deterministic: boolean;
  readonly label: string;
}

export function runQuestPrototype(): QuestReport {
  const run = () => {
    const graph = new QuestGraph();
    graph.addFact('seed', 0, 1);
    graph.resolve('q_abbey', 1, 1, 4, ['seed'], true);
    graph.resolve('q_abbey', 2, 2, 5, ['seed'], true);
    graph.resolve('q_abbey', 3, 3, 6, ['seed'], false); // text-only: refused
    graph.advanceTo(4 + DELAY_TICKS);
    graph.advanceTo(5 + DELAY_TICKS);
    const distinct = new Set(graph.allResolutions.map((item) => item.factId));
    const untranslated = Object.values(DIALOGUE).filter(([fr, en]) => !fr || !en).length;
    return {
      resolutions: graph.allResolutions.length,
      distinct: distinct.size,
      applied: graph.appliedEffects.length,
      textOnly: graph.textOnlyRefused,
      states: OPTIONS_PER_QUEST ** QUEST_COUNT,
      keys: Object.keys(DIALOGUE).length,
      untranslated,
    };
  };
  const a = run();
  const b = run();
  return {
    resolutions: a.resolutions,
    distinct_fact_ids: a.distinct,
    delayed_applied: a.applied,
    text_only_refusals: a.textOnly,
    reachable_states: a.states,
    fr_en_keys: a.keys,
    untranslated_keys: a.untranslated,
    deterministic: JSON.stringify(a) === JSON.stringify(b),
    label: 'local greybox quest prototype — not a playtest',
  };
}
