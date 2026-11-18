#!/usr/bin/env node
/**
 * validate-docs.mjs — structural enforcement of authored design docs (P1-001).
 * Owner: producer (WORKFLOW.md §6, OWNERSHIP.yaml).
 *
 * P1-001 owns docs/VISION.md. Later tasks add GDD modules (GDD-001), TDDs and ADRs (P1-004); this
 * validator is the shared structural gate for all of them. It checks presence and required sections,
 * never the truth of a claim — truth stays in the locked concept, the ledger and the evidence logs.
 *
 * Exit 0 clean · 1 violation · 2 unreadable inputs · 64 bad usage.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const mode = process.argv[2] ?? '--check';
if (!['--check', '--vision'].includes(mode)) {
  console.error('usage: node scripts/validate-docs.mjs [--check|--vision]');
  process.exit(64);
}

const errors = [];
const fail = (m) => { console.log(`FAIL  ${m}`); errors.push(m); };
const ok = (m) => console.log(`OK    ${m}`);
const VISION = 'docs/VISION.md';

console.log(`\nD1  vision document (${mode})`);
if (!existsSync(VISION)) {
  console.error(`MISSING ${VISION}`);
  process.exit(2);
}
const vision = readFileSync(VISION, 'utf8');
for (const field of ['| id | VISION |', '| owner | producer |', '| status | ACTIVE', '| validated by |']) {
  if (!vision.includes(field)) fail(`D1 VISION.md is missing metadata: ${field}`);
}
for (const section of [
  '## 1. Product target', '## 2. Concept-first rule', '## 3. The world model',
  '## 4. Player agency and economy', '## 5. Technical shape',
  '## 6. Path from the slice', '## 7. Explicit non-goals', '## 8. Change log',
]) {
  if (!vision.includes(section)) fail(`D1 VISION.md is missing section "${section}"`);
}
if (!vision.includes('burn a Stone Age forest, no medieval abbey exists')) {
  fail('D1 VISION.md does not quote the locked T1 sentence');
}
if (!vision.includes('ADR-A0003')) fail('D1 VISION.md does not cite the full-MMORPG amendment');
if (!vision.includes('NOT COMPUTABLE')) fail('D1 VISION.md promises a date without measured throughput');
if (!/not a copy of any commercial mmorpg/i.test(vision)) fail('D1 VISION.md omits the I11 non-goal');
if (!errors.length) ok('VISION.md: metadata, 8 sections, locked sentence, amendment and non-goals present');

if (mode === '--vision') {
  console.log(`\nRESULT: ${errors.length ? 'FAIL' : 'PASS'} — vision-only check, ${errors.length} error(s).`);
  if (errors.length) process.exit(1);
  process.exit(0);
}

console.log('\nD2  ADR structure');
const adrDir = 'docs/adr';
const adrs = existsSync(adrDir) ? readdirSync(adrDir).filter(f => f.endsWith('.md')).sort() : [];
for (const f of adrs) {
  const text = readFileSync(`${adrDir}/${f}`, 'utf8');
  if (!/^# A\d+/.test(text)) fail(`D2 ${f} has no "# A<number>" title`);
  if (!/\| status \|/.test(text)) fail(`D2 ${f} has no status field`);
  if (!/## (Context|Decision)/.test(text)) fail(`D2 ${f} has no Context or Decision section`);
}
if (!errors.length) ok(`${adrs.length} ADR(s) have title, status and a Context/Decision section`);

console.log('\nD3  TDD structure');
const tddDir = 'docs/tdd';
const tdds = existsSync(tddDir) ? readdirSync(tddDir).filter(f => f.endsWith('.md')) : [];
for (const f of tdds) {
  const text = readFileSync(`${tddDir}/${f}`, 'utf8');
  if (!/^# /.test(text)) fail(`D3 ${f} has no title`);
}
if (!errors.length) ok(`${tdds.length} TDD file(s) checked (0 is valid before P1-004)`);

console.log(`\n${errors.length ? 'RESULT: FAIL' : 'RESULT: PASS'} — ${adrs.length} ADR(s), ${tdds.length} TDD(s), `
  + `${errors.length} error(s). Structural check only; no claim validated.`);
if (errors.length) {
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
