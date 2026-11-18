#!/usr/bin/env node
/**
 * apps/dashboard/check.mjs — regression guard for the generated read-only dashboard (P0-007 repair).
 * Ported from the dashboard branch into the session branch by TOOL-FIXALL so `pnpm verify` can enforce it.
 * Fails when the view drifts from its sources, when a rebuild is not byte-identical, or when a known stale
 * hardcoded literal returns. Exit 0 clean · 1 drift/failure.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const p = (rel) => `${ROOT}${rel}`;
const read = (rel) => readFileSync(p(rel), 'utf8');
const problems = [];
const check = (ok, message) => { if (!ok) problems.push(message); };

const build = () => {
  execFileSync('pnpm', ['--filter', '@strata/dashboard', 'build'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, STRATA_BUILD_UTC: '2026-11-18T00:00:00Z' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    data: read('apps/dashboard/dist/data.json'),
    html: read('apps/dashboard/dist/index.html'),
  };
};

const first = build();
const second = build();
check(first.data === second.data && first.html === second.html, 'rebuild is not byte-identical');

const data = JSON.parse(first.data);
const metrics = JSON.parse(read(`docs/state/metrics/${data.source_metric}`));
const maturity = metrics.gdd_coverage?.maturity ?? {};
const source = read('apps/dashboard/build.mjs');

check(data.gdd.modules === String(metrics.measured?.gdd_modules), 'gdd.modules is not sourced from metrics');
check(data.gdd.draft === String(maturity.draft), 'gdd.draft is not sourced from metrics');
check(data.gdd.coverage === `${Math.round((metrics.gdd_coverage?.value ?? 0) * 100)}%`, 'gdd.coverage is not sourced');
check(data.scope.ledger_entries === String(metrics.scope?.ledger_entries), 'scope.ledger_entries is not sourced');
check(data.tier.authorized === metrics.tier?.authorized, 'tier.authorized is not sourced');
check(data.netgate.status === metrics.netgate?.status, 'netgate.status is not sourced');
check(data.workflow.locks_source.includes('state/locks'), 'active_locks is not read from the lock registry');
for (const stale of [
  'GDD-001 (P1, not started)', 'HIGH_CONCEPT v1.2',
  'green — pnpm tracer --assert (equal state hashes)', 'modules: 0',
]) {
  check(!source.includes(stale), `hardcoded stale value returned: ${stale}`);
}

if (problems.length) {
  console.error(`dashboard truth check — FAIL (${problems.length})`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('dashboard truth check — PASS — deterministic, sourced, no hardcoded values');
