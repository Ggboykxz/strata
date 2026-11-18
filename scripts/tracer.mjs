#!/usr/bin/env node
/**
 * scripts/tracer.mjs — the one entry point for `pnpm tracer --assert` (TRACER-001).
 * Owner: tools-engineer.
 *
 * Delegates to a Vitest integration test rather than reimplementing verification in shell: the test
 * starts a real WebSocket server, drives two client replicas through a real tick sequence, checks equal
 * hashes and runs a Babylon NullEngine render. TRACER_FORCE_DESYNC=1 makes a replica lie, so the same
 * command can be proven to fail.
 */
import { spawnSync } from 'node:child_process';

if (!process.argv.includes('--assert')) {
  console.error('usage: pnpm tracer --assert');
  process.exit(64);
}

const result = spawnSync('pnpm', [
  'exec', 'vitest', 'run', '--config', 'vitest.tracer.config.ts', '--reporter=verbose',
], { stdio: 'inherit', shell: false });

if (result.error) {
  console.error(`RESULT: FAIL — cannot start vitest: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.log(`\nRESULT: FAIL — tracer assert exited ${result.status}.`);
  process.exit(1);
}
console.log('\nRESULT: PASS — tracer assert: equal state hashes, desync rejected, capsule rendered.');
