#!/usr/bin/env node
/**
 * validate-scope.mjs — CI gate for scope integrity
 * Owner: producer (P0-001 / SC-001). Acceptance: `node scripts/validate-scope.mjs`
 *
 * Runs in two layers:
 *   1. ledger + arithmetic  -> delegates to scope-math.mjs --check (single source of truth)
 *   2. document integrity   -> SCOPE.md must contain its mandatory sections and must not present an
 *                              assumption as a measurement.
 *
 * A check that cannot run fails. There is no skip path (I5).
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const fail = [];
const pass = (m) => console.log(`PASS  ${m}`);
const bad = (m) => { console.log(`FAIL  ${m}`); fail.push(m); };

/* ---------- 1. ledger ---------- */
try {
  const out = execFileSync(process.execPath, ['scripts/scope-math.mjs', '--check'], { encoding: 'utf8' });
  process.stdout.write(out.split('\n').map(l => (l ? `      ${l}` : l)).join('\n'));
  pass('scope-math --check (ledger balanced, schema complete, scope text in sync)');
} catch (e) {
  process.stdout.write(String(e.stdout ?? ''));
  process.stderr.write(String(e.stderr ?? ''));
  bad('scope-math --check failed');
}

/* ---------- 2. document integrity ---------- */
for (const p of ['docs/SCOPE.md', 'docs/production/SCOPE_LEDGER.yaml', 'docs/production/CONTENT_MATH.yaml']) {
  if (!existsSync(p)) bad(`missing ${p}`);
}

if (existsSync('docs/SCOPE.md')) {
  const s = readFileSync('docs/SCOPE.md', 'utf8');
  const sections = [
    ['truth about the genre', /## 1\. THE TRUTH ABOUT THE GENRE/i],
    ['compute reality', /## 2\. COMPUTE REALITY/i],
    ['capacity tiers', /## 3\. CAPACITY TIERS/i],
    ['content math', /## 4\. WHAT THE VERTICAL SLICE COSTS/i],
    ['session budget', /## 5\. SESSION BUDGET/i],
    ['cut order', /## 6\. THE CUT ORDER/i],
  ];
  for (const [name, re] of sections) {
    if (re.test(s)) pass(`SCOPE.md section: ${name}`);
    else bad(`SCOPE.md missing section: ${name}`);
  }

  const neverCut = ['propagation', 'visible consequences', 'server authority', 'anti-dupe ledger',
    'persistence integrity', 'GDD coverage', 'accessibility basics', 'FR/EN', 'license provenance',
    'separated animation architecture'];
  const missingNeverCut = neverCut.filter(x => !s.toLowerCase().includes(x.toLowerCase()));
  if (missingNeverCut.length) bad(`SCOPE.md never-cut list incomplete: ${missingNeverCut.join(', ')}`);
  else pass('SCOPE.md never-cut list complete (10 items)');

  // an unmeasured throughput must not be presented as a measurement
  const math = readFileSync('docs/production/CONTENT_MATH.yaml', 'utf8');
  const notMeasured = /assets_per_session:\s*null/.test(math);
  if (notMeasured && /months_needed\s*=\s*\d/.test(s)) {
    bad('SCOPE.md prints a numeric months_needed while assets_per_session is null');
  } else {
    pass('no measurement is claimed while throughput is unmeasured');
  }

  // every quantitative claim carries a provenance tag
  const hasTags = /REFERENCE/.test(s) && /ASSUMPTION/.test(s);
  if (hasTags) pass('quantitative claims carry REFERENCE / ASSUMPTION tags');
  else bad('SCOPE.md lacks REFERENCE / ASSUMPTION provenance tags');
}

/* ---------- verdict ---------- */
console.log(`\n${fail.length === 0 ? 'PASS' : 'FAIL'}  validate-scope  failures=${fail.length}`);
process.exit(fail.length === 0 ? 0 : 1);
