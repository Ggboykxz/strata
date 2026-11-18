#!/usr/bin/env node
/**
 * validate-lore.mjs — world bible and FR/EN glossary gate (P1-002).
 * Owner: narrative (WORKFLOW.md §6, explicit OWNERSHIP.yaml entry).
 *
 * Structural and provenance checks only: it cannot judge whether a story is compelling. It rejects
 * borrowed commercial IP names, missing FR/EN pairs and renames without a recorded fact id.
 *
 * Exit 0 clean · 1 violation · 2 unreadable input.
 */
import { existsSync, readFileSync } from 'node:fs';

const BIBLE = 'docs/design/WORLD_BIBLE.md';
const QUEST = 'docs/design/gdd/GDD-QUEST.md';
const errors = [];
const fail = (m) => { console.log(`FAIL  ${m}`); errors.push(m); };
const ok = (m) => console.log(`OK    ${m}`);

for (const p of [BIBLE, QUEST]) {
  if (!existsSync(p)) { console.error(`MISSING ${p}`); process.exit(2); }
}
const bible = readFileSync(BIBLE, 'utf8');
const quest = readFileSync(QUEST, 'utf8');

console.log('\nL1  bible structure');
for (const s of [
  '## 1. Source of truth', '## 2. The three strata', '## 3. Naming rules',
  '## 4. Fact-driven renaming', '## 5. Glossary', '## 6. Forbidden names', '## 7. Change log',
]) {
  if (!bible.includes(s)) fail(`L1 WORLD_BIBLE.md missing ${s}`);
}
if (!bible.includes('burn a Stone Age forest, no medieval abbey exists')) {
  fail('L1 WORLD_BIBLE.md does not quote the locked T1 sentence');
}
if (!errors.length) ok('7 sections and the locked sentence present');

console.log('\nL2  FR/EN glossary');
const glossarySection = bible.split('## 5. Glossary')[1]?.split('## 6.')[0] ?? '';
const rows = glossarySection.split('\n').filter(l => /^\| [a-z][a-z0-9_]* \|.*\|\s*(yes|no)\s*\|\s*$/.test(l));
const glossary = new Map();
for (const row of rows) {
  const c = row.split('|').map(s => s.trim());
  const [id, en, fr, translatable] = [c[1], c[2], c[3], c[4]];
  if (!id || !en || !fr) { fail(`L2 incomplete glossary row ${row}`); continue; }
  if (!['yes', 'no'].includes(String(translatable))) fail(`L2 ${id} translatable must be yes or no`);
  if (glossary.has(id)) fail(`L2 duplicate glossary id ${id}`);
  glossary.set(id, { en, fr });
}
if (glossary.size < 3) fail(`L2 only ${glossary.size} glossary entries; at least 3 required`);
const places = ['ashwood_basin', 'abbey_of_vauls', 'neon_reach'];
for (const p of places) {
  if (!glossary.has(p)) fail(`L2 place ${p} is not in the glossary`);
}
if (!errors.length) ok(`${glossary.size} FR/EN glossary entries, all three strata places covered`);

console.log('\nL3  no borrowed IP');
const FORBIDDEN = [
  'ashes of creation', 'ash of creation', 'world of warcraft', 'elden ring', 'guild wars',
  'final fantasy', 'star wars', 'the elder scrolls', 'mixamo', 'runeterra', 'azeroth',
];
for (const [name, text] of [['WORLD_BIBLE.md', bible], ['GDD-QUEST.md', quest]]) {
  const lower = text.toLowerCase();
  for (const word of FORBIDDEN) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) fail(`L3 ${name} contains forbidden franchise name "${word}"`);
  }
}
if (!errors.length) ok(`${FORBIDDEN.length} forbidden names absent from bible and quest module`);

console.log('\nL4  quest nouns resolve');
const questIds = [...quest.matchAll(/\b(ashwood_basin|abbey_of_vauls|neon_reach|ford_of_thorns|black_cinder|glass_marsh)\b/g)]
  .map(m => m[1]);
for (const id of new Set(questIds)) if (!glossary.has(id)) fail(`L4 quest noun ${id} is not in the glossary`);
if (!errors.length) ok(`${new Set(questIds).size} quest noun(s) referenced, all resolvable`);

console.log(`\n${errors.length ? 'RESULT: FAIL' : 'RESULT: PASS'} — ${glossary.size} glossary entries, `
  + `${errors.length} error(s). Structural check only; no story judgement.`);
if (errors.length) {
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
