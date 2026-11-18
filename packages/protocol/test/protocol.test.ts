import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION } from '../src/index';

describe('protocol skeleton', () => {
  it('starts at version 1', () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });
});
