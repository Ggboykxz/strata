#!/usr/bin/env node
/**
 * Dashboard truth check (P0-007 repair). Fails if the generated view drifts from its declared sources.
 *
 * This is the regression guard for the defect found on 2026-11-18: the builder had hardcoded
 * `gdd.modules = 0`, `GDD-001 not started`, an old HIGH_CONCEPT version and a manual "tracer green",
 * and it looked for metric keys that do not exist, so real values displayed as NOT COMPUTABLE.
 *
 * Exit 0 clean · 1 drift/failure.
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
const measured = metrics.measured ?? {};
const maturity = metrics.gdd_coverage?.maturity ?? {};
const source = read('apps/dashboard/build.mjs');

check(data.gdd.modules === String(measured.gdd_modules), `gdd.modules ${data.gdd.modules} != metrics ${String(measured.gdd_modules)}`);
check(data.gdd.draft === String(maturity.draft), 'gdd.draft does not come from metrics.gdd_coverage.maturity.draft');
check(data.gdd.stub === String(maturity.stub), 'gdd.stub does not come from metrics');
check(data.gdd.coverage === `${Math.round((metrics.gdd_coverage?.value ?? 0) * 100)}%`, 'gdd.coverage is not the sourced ratio');
check(data.scope.ledger_entries === String(metrics.scope?.ledger_entries), 'scope.ledger_entries does not come from metrics.scope');
check(data.concept.cis === (metrics.cis?.value === null ? 'NOT COMPUTABLE' : String(metrics.cis?.value)), 'concept.cis is not sourced');
check(data.tier.authorized === metrics.tier?.authorized, 'tier.authorized does not come from metrics');
check(data.netgate.art_allowed === String(metrics.netgate?.art_allowed), 'netgate.art_allowed does not come from metrics');

const hcVersion = read('docs/design/HIGH_CONCEPT.md').match(/^\| version \| ([^|]+?) \|/m)?.[1]?.trim();
check(hcVersion !== undefined && data.concept.hc_version.includes(hcVersion), 'hc_version is not read from HIGH_CONCEPT.md');
check(/^green — docs\/state\/evidence\/\d{8}T\d{6}Z-[^/]+\/.*tracer.*\.log \(exit 0\)$/.test(data.netcode.tracer),
  'tracer value does not name a passing evidence log');
check(typeof data.workflow.active_locks === 'string' && data.workflow.locks_source.includes('state/locks'),
  'active_locks is not read from the state/locks registry');

for (const stale of [
  'GDD-001 (P1, not started)',
  'HIGH_CONCEPT v1.2',
  'green — pnpm tracer --assert (equal state hashes)',
  'modules: 0',
  "(locks.locks ?? []).filter",
]) {
  check(!source.includes(stale), `hardcoded stale value still in build.mjs: ${stale}`);
}

if (problems.length) {
  console.error(`dashboard truth check — FAIL (${problems.length})`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('dashboard truth check — PASS — deterministic, sourced, no hardcoded values');
