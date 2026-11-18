import { describe, expect, it } from 'vitest';
import { DELAY_TICKS, QuestGraph, runQuestPrototype } from '../prs3_quests';

describe('fact-derived quests', () => {
  it('keeps both players\' fact ids when they choose different options', () => {
    const graph = new QuestGraph();
    graph.addFact('seed', 0, 1);
    expect(graph.resolve('q_abbey', 1, 1, 4, ['seed'], true)).toBe(true);
    expect(graph.resolve('q_abbey', 2, 2, 5, ['seed'], true)).toBe(true);
    expect(new Set(graph.allResolutions.map((item) => item.factId)).size).toBe(2);
  });

  it('refuses a text-only resolution and a missing prerequisite', () => {
    const graph = new QuestGraph();
    graph.addFact('seed', 0, 1);
    expect(graph.resolve('q_abbey', 3, 3, 6, ['seed'], false)).toBe(false);
    expect(graph.resolve('q_abbey', 1, 1, 7, ['absent'], true)).toBe(false);
    expect(graph.textOnlyRefused).toBe(1);
    expect(graph.allResolutions).toHaveLength(0);
  });

  it('schedules the delayed effect from the fact tick, not the current tick', () => {
    const graph = new QuestGraph();
    graph.addFact('seed', 0, 1);
    graph.resolve('q_abbey', 1, 1, 4, ['seed'], true);
    graph.advanceTo(4 + DELAY_TICKS - 1);
    expect(graph.appliedEffects).toHaveLength(0);
    graph.advanceTo(4 + DELAY_TICKS);
    expect(graph.appliedEffects).toHaveLength(1);
    expect(graph.appliedEffects[0]).toContain(`@${4 + DELAY_TICKS}:`);
  });

  it('re-derives availability when a prerequisite fact is erased', () => {
    const graph = new QuestGraph();
    graph.addFact('seed', 0, 1);
    expect(graph.available(['seed'])).toBe(true);
    graph.eraseFact('seed');
    expect(graph.available(['seed'])).toBe(false);
  });
});

describe('PR-S3 harness', () => {
  it('prints a deterministic labelled local report', () => {
    const report = runQuestPrototype();
    console.log(JSON.stringify(report, null, 2));
    expect(report.resolutions).toBe(2);
    expect(report.distinct_fact_ids).toBe(2);
    expect(report.delayed_applied).toBe(2);
    expect(report.text_only_refusals).toBe(1);
    expect(report.reachable_states).toBeGreaterThanOrEqual(200);
    expect(report.fr_en_keys).toBe(6);
    expect(report.untranslated_keys).toBe(0);
    expect(report.deterministic).toBe(true);
    expect(report.label).toContain('not a playtest');
  });
});
