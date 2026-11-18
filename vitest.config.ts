import { defineConfig } from 'vitest/config';

/**
 * TRACER-001's WS + Babylon integration assert is separate (`vitest.tracer.config.ts`, `pnpm tracer
 * --assert`): it is driven by its own harness and must not slow or entangle the unit suite.
 */
export default defineConfig({
  test: {
    include: [
      'packages/**/test/**/*.test.ts',
      'apps/**/test/**/*.test.ts',
      'tools/**/test/**/*.test.ts',
      'tests/replay/**/*.spec.ts',
    ],
    exclude: ['**/node_modules/**', 'apps/game/test/tracer.test.ts'],
    environment: 'node',
    passWithNoTests: false,
  },
});
