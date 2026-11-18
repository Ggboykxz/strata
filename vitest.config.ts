import { defineConfig } from 'vitest/config';

/**
 * Unit tests only. Determinism replay (Node + Chromium hash equality) is a separate step of
 * `pnpm verify`: it does not exist until the sim does, and it is listed as DEFERRED until then.
 */
export default defineConfig({
  test: {
    include: [
      'packages/**/test/**/*.test.ts',
      'apps/**/test/**/*.test.ts',
      'tools/**/test/**/*.test.ts',
    ],
    environment: 'node',
    passWithNoTests: false,
  },
});
