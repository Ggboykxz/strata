import { describe, expect, it } from 'vitest';
import { runAnimFuzz } from '../prs8_animstate';

describe('PR-S8 anim fuzz harness', () => {
  it('prints a deterministic labelled local report', () => {
    const report = runAnimFuzz();
    console.log(JSON.stringify(report, null, 2));
    expect(report.requests).toBe(10_000);
    expect(report.refused).toBeGreaterThan(0);
    expect(report.illegal_refusals).toBe(report.refused);
    expect(report.mutations_on_refusal).toBe(0);
    expect(report.accepted).toBeGreaterThan(0);
    expect(report.hits).toBeGreaterThan(0);
    expect(report.deterministic).toBe(true);
    expect(report.label).toContain('not a playtest');
  });

  it('is repeatable', () => {
    expect(runAnimFuzz()).toEqual(runAnimFuzz());
  });
});
