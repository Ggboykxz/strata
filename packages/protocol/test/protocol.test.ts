import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION, TRACER_PROTOCOL_VERSION } from '../src/index';

describe('protocol versions', () => {
  it('exposes v2 as the current wire version', () => {
    expect(PROTOCOL_VERSION).toBe(2);
  });

  it('keeps the v1 tracer codec until the game client moves off JSON', () => {
    expect(TRACER_PROTOCOL_VERSION).toBe(1);
    expect(TRACER_PROTOCOL_VERSION).toBeLessThan(PROTOCOL_VERSION);
  });
});
