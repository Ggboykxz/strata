#!/usr/bin/env node
/**
 * concept-integrity.mjs — STRATA high-concept validator
 * Owner: high-concept-guardian (P0-001 / HC-001)
 *
 * Modes
 *   --init    structural bootstrap check (HC-001 acceptance). Exit 0 if the concept document is
 *             structurally complete, 1 otherwise.
 *   --check   full test suite T1/T3 (+structure). Exit 1 on any violation. Used by CI from P2.
 *   --score   compute CIS from docs/state/metrics/concept.json. Exit 2 until HC-003 provides data.
 *
 * Policy I5: a validator that cannot verify MUST fail. There is no silent pass path.
 */
import { readFileSync, existsSync } from 'node:fs';

const HC_PATH = 'docs/design/HIGH_CONCEPT.md';
const CIS_PATH = 'docs/state/metrics/concept.json';

const mode = process.argv.includes('--init') ? 'init'
  : process.argv.includes('--check') ? 'check'
  : process.argv.includes('--score') ? 'score'
  : null;

if (!mode) {
  console.error('usage: concept-integrity.mjs --init | --check | --score');
  process.exit(64);
}

const fail = [];
const debt = [];
const warn = [];
/** Structural invariant: must hold in every mode. */
const report = (label, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) fail.push(label);
};
/** Measured finding: recorded as DEBT in --init, blocking in --check. Never silently green. */
const finding = (label, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'DEBT'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) debt.push(label);
};

if (!existsSync(HC_PATH)) {
  console.error(`MISSING  ${HC_PATH}`);
  process.exit(1);
}
const src = readFileSync(HC_PATH, 'utf8');

/* ---------- structural invariants (all modes) ---------- */

const enMatch = src.match(/^> In STRATA,[^\n]*$/m);
const frMatch = src.match(/^> Dans STRATA,[^\n]*$/m);

report('EN sentence present', !!enMatch);
report('FR sentence present', !!frMatch);
report('signature line present',
  /CROSS-STRATUM CONSEQUENCE PROPAGATION/.test(src));
report('four tests declared (T1..T4)',
  ['T1', 'T2', 'T3', 'T4'].every(t => new RegExp(`### ${t} `).test(src)));

const cisComponents = ['demo', 'propagation', 'visible variants', 'wow density', 'traceability', 'signed novelty'];
report('CIS rubric lists 6 components',
  cisComponents.every(c => src.toLowerCase().includes(c)));

const cisSum = [...src.matchAll(/^\| (?:demo|propagation|visible variants|wow density|traceability|signed novelty) \| (\d+) \|/gm)]
  .map(m => Number(m[1])).reduce((a, b) => a + b, 0);
report('CIS components sum to 100', cisSum === 100, `sum=${cisSum}`);

const noveltyRows = [...src.matchAll(/^\| N\d+ \|/gm)].length;
report('novelty grid has >= 3 properties', noveltyRows >= 3, `n=${noveltyRows}`);

/* ---------- T1: sentence budgets ---------- */

/** A word contains at least one letter or digit — an em dash, colon or guillemet is not a word. */
const countWords = (s) => s.trim().split(/\s+/).filter(t => /[\p{L}\p{N}]/u.test(t)).length;

if (enMatch) {
  const enWords = countWords(enMatch[0].replace(/^>\s*/, ''));
  finding('T1  EN <= 25 words', enWords <= 25, `${enWords} words`);
}
if (frMatch) {
  const frWords = countWords(frMatch[0].replace(/^>\s*/, ''));
  finding('T1  FR <= 35 words', frWords <= 35, `${frWords} words`);
}

/* ---------- T3: novelty signed ---------- */

const t3Signed = /^\| signed novelty \| 10 \|/m.test(src) && !/novelty grid v1 \(unsigned/i.test(src);
if (mode === 'check') {
  finding('T3  novelty grid signed at this gate', t3Signed);
}

/* ---------- concepts debt / open findings ---------- */

const openFindings = [...src.matchAll(/^### (FINDING-\d+) /gm)].map(m => m[1]);
if (openFindings.length) {
  warn.push(`${openFindings.length} open finding(s): ${openFindings.join(', ')}`);
}

/* ---------- score ---------- */

if (mode === 'score') {
  if (!existsSync(CIS_PATH)) {
    console.error(`NOT MEASURED  ${CIS_PATH} does not exist.`);
    console.error('CIS is computed from evidence (HC-003 at P2), never typed by hand.');
    process.exit(2);
  }
  const m = JSON.parse(readFileSync(CIS_PATH, 'utf8'));
  const total = cisComponents.reduce((a, c) => a + Number(m[c] ?? 0), 0);
  const missing = cisComponents.filter(c => typeof m[c] !== 'number');
  if (missing.length) {
    console.error(`NOT MEASURED  components missing: ${missing.join(', ')}`);
    process.exit(2);
  }
  console.log(`CIS = ${total}/100  (source: ${CIS_PATH}, measured ${m.measured_at ?? 'unknown'})`);
  process.exit(total >= 50 ? 0 : 1);
}

/* ---------- verdict ---------- */

for (const w of warn) console.log(`WARN  ${w}`);
for (const d of debt) console.log(`DEBT  ${d}`);
const blocking = mode === 'check' ? fail.length + debt.length : fail.length;
console.log(`\nmode=${mode}  invariant_failures=${fail.length}  recorded_debt=${debt.length}`);
if (mode === 'init' && debt.length) {
  console.log('NOTE  --init asserts structural completeness; findings stay open and block --check.');
}
process.exit(blocking === 0 ? 0 : 1);
