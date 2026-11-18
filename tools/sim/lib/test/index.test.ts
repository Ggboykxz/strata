import { describe, expect, it } from 'vitest';
import { DEFAULT_TICK_HZ } from '../src/index';

describe('sim harness skeleton', () => {
  it('defaults to the authoritative tick rate', () => {
    expect(DEFAULT_TICK_HZ).toBe(30);
  });
});
