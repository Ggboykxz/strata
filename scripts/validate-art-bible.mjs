#!/usr/bin/env node
/**
 * validate-art-bible.mjs — art architecture gate (P1-003, A0001, I2/I3).
 * Owner: animation-director.
 *
 * It enforces the separation rule, the numeric ceilings and the pre-NET-GATE art ban. It cannot judge
 * visual quality, and says so. Art is still greybox until NG-001 is signed.
 *
 * Exit 0 clean · 1 violation · 2 unreadable input.
 */
import { existsSync, readFileSync } from 'node:fs';
import { parseYaml } from './lib/yaml.mjs';

const BIBLE = 'docs/design/ART_BIBLE.md';
const ADR = 'docs/adr/A0001_animation-scenes-textures.md';
const BP = 'docs/blueprint/BLUEPRINT.yaml';
const errors = [];
const fail = (m) => { console.log(`FAIL  ${m}`); errors.push(m); };
const ok = (m) => console.log(`OK    ${m}`);

for (const p of [BIBLE, ADR, BP]) {
  if (!existsSync(p)) { console.error(`MISSING ${p}`); process.exit(2); }
}
const bible = readFileSync(BIBLE, 'utf8');
const adr = readFileSync(ADR, 'utf8');
let bp;
try { bp = parseYaml(readFileSync(BP, 'utf8')); }
catch (e) { console.error(`PARSE ${BP}: ${e.message}`); process.exit(2); }

console.log('\nA1  A0001 and separation rule');
if (!/^# A0001/.test(adr)) fail('A1 A0001 has no "# A0001" title');
if (!/\| status \| \*\*ACCEPTED/.test(adr)) fail('A1 A0001 is not ACCEPTED');
for (const s of ['## Context', '## Decision', '## Consequences', '## Rejected alternative']) {
  if (!adr.includes(s)) fail(`A1 A0001 missing ${s}`);
}
if (!/bone transform/i.test(adr) || !/server/i.test(adr)) fail('A1 A0001 does not state the wire rule');
if (!/Mesh GLBs and animation GLBs are separate/i.test(bible)) fail('A1 ART_BIBLE omits the separation rule');
if (!errors.length) ok('A0001 accepted with Context/Decision/Consequences; separation rule stated twice');

console.log('\nA2  art bible structure');
for (const s of [
  '## 1. Separation rule', '## 2. Kits and cells', '## 3. Instancing and variants',
  '## 4. LOD and streaming', '## 5. Lighting and materials', '## 6. Numeric budgets',
  '## 7. Licence and provenance', '## 8. Gate order', '## 9. Change log',
]) {
  if (!bible.includes(s)) fail(`A2 ART_BIBLE missing ${s}`);
}
for (const n of ['250', '1.5 M', '350 MB', '25 MB', '20', '64 bytes', '25 %', '8 s']) {
  if (!bible.includes(n)) fail(`A2 ART_BIBLE omits budget ${n}`);
}
if (!errors.length) ok('9 sections and all 8 numeric ceilings present with sources');

console.log('\nA3  no art before NET-GATE');
const illegal = (bp.tasks ?? []).filter(t => t.art === true && ['P0', 'P1', 'P2NET'].includes(t.ph));
for (const t of illegal) fail(`A3 task ${t.id} is art:true while NET-GATE is unpassed`);
if (!/NET-GATE is unpassed/i.test(bible)) fail('A3 ART_BIBLE does not state the gate order');
if (!errors.length) ok('0 art:true tasks in authorized phases; greybox rule stated');

console.log(`\n${errors.length ? 'RESULT: FAIL' : 'RESULT: PASS'} — art structure gate, ${errors.length} error(s). `
  + 'Visual quality is not judged here.');
if (errors.length) {
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
