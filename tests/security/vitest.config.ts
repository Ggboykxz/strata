import { defineConfig } from 'vitest/config';

/** SEC-001 tests live at the blueprint's `tests/security/` path, outside the main vitest include globs. */
export default defineConfig({
  test: {
    include: ['tests/security/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: false,
  },
});
