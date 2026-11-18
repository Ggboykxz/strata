import { describe, expect, it } from 'vitest';
import { ALLIED_THRESHOLD, FactionGraph, HOSTILE_THRESHOLD, runFactionPrototype } from '../prs6_faction';

describe('derived faction standing', () => {
  it('derives reputation and standing from immutable facts only', () => {
    const graph = new FactionGraph();
    graph.record({ id: 'f-a', actor: 1, faction: 2, weight: 30, tick: 1 });
    expect(graph.reputationOf(1, 2)).toBe(30);
    expect(graph.standing(1, 2)).toBe('neutral');
    graph.record({ id: 'f-b', actor: 1, faction: 2, weight: 10, tick: 2 });
    expect(graph.standing(1, 2)).toBe('allied');
    expect(ALLIED_THRESHOLD).toBe(40);
  });

  it('clamps reputation to the integer domain and refuses a duplicate fact id', () => {
    const graph = new FactionGraph();
    for (let index = 0; index < 40; index++) {
      graph.record({ id: `f-${index}`, actor: 2, faction: 1, weight: 8, tick: index });
    }
    expect(graph.reputationOf(2, 1)).toBe(100);
    expect(graph.record({ id: 'f-0', actor: 2, faction: 1, weight: 1, tick: 99 })).toBe(false);
    expect(graph.allFacts).toHaveLength(40);
  });

  it('blocks a switch from a hostile faction and records the refusal', () => {
    const graph = new FactionGraph();
    graph.record({ id: 'f-h', actor: 1, faction: 1, weight: -30, tick: 1 });
    expect(graph.standing(1, 1)).toBe('hostile');
    expect(HOSTILE_THRESHOLD).toBe(-20);
    expect(graph.switchFaction(1, 2, 2)).toBe(false);
    expect(graph.switchRefusalCount).toBe(1);
    expect(graph.memberOf(1)).toBe(1);
  });

  it('replays the fact log into identical reputation values', () => {
    const graph = new FactionGraph();
    graph.record({ id: 'f-1', actor: 1, faction: 3, weight: 12, tick: 1 });
    graph.record({ id: 'f-2', actor: 1, faction: 2, weight: -4, tick: 2 });
    expect(graph.replay()).toBe(true);
  });
});

describe('PR-S6 harness', () => {
  it('prints a deterministic labelled local report', () => {
    const report = runFactionPrototype();
    console.log(JSON.stringify(report, null, 2));
    expect(report.facts).toBe(1_000);
    expect(report.reputation_changes).toBeGreaterThan(0);
    expect(report.standing_changes).toBeGreaterThan(0);
    expect(report.switch_refusals).toBeGreaterThan(0);
    expect(report.replay_exact).toBe(true);
    expect(report.deterministic).toBe(true);
    expect(report.label).toContain('not a balance sign-off');
  });
});
