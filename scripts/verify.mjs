#!/usr/bin/env node
/**
 * scripts/verify.mjs — the one definition of `pnpm verify` (P0-003, master §6).
 * Owner: tools-engineer.
 *
 * The master defines the full pipeline: typecheck -> lint -> unit -> determinism replay ->
 * every scripts/validate-*.mjs -> gdd-coverage --min -> scope-math --check. At P0-003 some of
 * those cannot exist: there is no sim to replay, no GDD to cover, and 21 validators are declared
 * stubs. They are printed under DEFERRED with a reason; an absent step is never silently green.
 *
 * Exit 0 only if every ENABLED step exits 0. Fail-fast: the first red stops the run.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

const ENABLED = [
  ['typecheck', 'pnpm', ['typecheck']],
  ['lint — core-math ban', 'pnpm', ['lint']],
  ['unit — vitest', 'pnpm', ['test']],
  ['validate-prompt-drift', 'node', ['scripts/validate-prompt-drift.mjs']],
  ['validate-scope', 'node', ['scripts/validate-scope.mjs']],
  ['scope-math --check', 'node', ['scripts/scope-math.mjs', '--check']],
  ['validate-blueprint', 'node', ['scripts/validate-blueprint.mjs']],
  ['validate-ownership (WF-002)', 'node', ['scripts/validate-ownership.mjs']],
  ['validate-locks (WF-002)', 'node', ['scripts/validate-locks.mjs']],
  ['validate-workflows (P0-004)', 'node', ['scripts/validate-workflows.mjs']],
  ['resume drill --dry (P0-005)', 'node', ['scripts/drill-resume.mjs', '--dry']],
];

/* A stub is a validator that prints NOT IMPLEMENTED and exits 1 (P0-002 contract). */
const enabledScripts = new Set(ENABLED.filter(([, cmd]) => cmd === 'node').map(([, , args]) => args[0]));
const stubs = readdirSync('scripts')
  .filter((f) => f.endsWith('.mjs'))
  .filter((f) => !enabledScripts.has(`scripts/${f}`))
  .filter((f) => f !== 'verify.mjs')
  .filter((f) => readFileSync(`scripts/${f}`, 'utf8').includes("console.error('NOT IMPLEMENTED"))
  .sort();
const validateStubs = stubs.filter((f) => f.startsWith('validate-'));
const otherStubs = stubs.filter((f) => !f.startsWith('validate-'));

console.log('STRATA verify — P0-003 skeleton');
console.log(`enabled: ${ENABLED.length} step(s), fail-fast\n`);

for (const [name, cmd, args] of ENABLED) {
  process.stdout.write(`== ${name}\n`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (r.error) {
    console.log(`\nRESULT: FAIL — ${name}: ${r.error.message}`);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.log(`\nRESULT: FAIL — ${name} exited ${r.status}.`);
    process.exit(1);
  }
}

console.log('\nDEFERRED — required by master §6, not buildable at P0-003:');
console.log('  - determinism replay (Node + Chromium hash equality): no sim before TRACER-001/NET-001');
console.log('  - gdd-coverage --min: no GDD module before GDD-001 (P1)');
console.log(`  - ${validateStubs.length} validate-*.mjs stub(s) + ${otherStubs.length} other declared stub(s); each exits 1 until its owner implements it:`);
for (const s of validateStubs) console.log(`      scripts/${s}`);
console.log(`      other: ${otherStubs.map((s) => `scripts/${s}`).join(', ')}`);

console.log(`\nRESULT: PASS — ${ENABLED.length}/${ENABLED.length} enabled steps green, 3 deferred groups listed above.`);
