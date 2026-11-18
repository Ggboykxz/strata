import { defineConfig } from 'vitest/config';

/** The TRACER-001 assert is a real integration test: WS server, two replicas, Babylon NullEngine. */
export default defineConfig({
  test: {
    include: ['apps/game/test/tracer.test.ts'],
    environment: 'node',
    passWithNoTests: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
