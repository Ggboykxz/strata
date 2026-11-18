#!/usr/bin/env node
/**
 * validate-gdd.mjs — GDD-001 structural gate (master §3.2–3.6, D138).
 * Owner: game-designer.
 *
 * Modes:
 *   --template   (default) check the 32 STUB modules and the 19-field index
 *   --critical   print the modules P1 must sign, computed from BLUEPRINT.yaml P2NET/P2SYS/P2 gdd[] refs
 *
 * Exit 0 clean · 1 violation · 2 unreadable input · 64 bad usage.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parseYaml } from './lib/yaml.mjs';

const arg = process.argv[2] ?? '--template';
if (!['--template', '--critical'].includes(arg)) {
  console.error('usage: node scripts/validate-gdd.mjs [--template|--critical]');
  process.exit(64);
}
const GDD = 'docs/design';
const MODULES = `${GDD}/gdd`;
const INDEX = `${GDD}/GDD.md`;
const BP = 'docs/blueprint/BLUEPRINT.yaml';

const EXPECTED = [
  'GDD-CORE', 'GDD-STRATA', 'GDD-CONSEQUENCE', 'GDD-COMBAT', 'GDD-PROGRESSION', 'GDD-QUEST',
  'GDD-DIALOGUE', 'GDD-COMPANION', 'GDD-FACTION', 'GDD-ECONOMY', 'GDD-CRAFT', 'GDD-INVENTORY',
  'GDD-WORLD-SIM', 'GDD-NAVIGATION', 'GDD-SAVE', 'GDD-ONBOARDING', 'GDD-DIFFICULTY', 'GDD-FAILURE',
  'GDD-ENDINGS', 'GDD-CONTENT', 'GDD-NETCODE', 'GDD-PERSISTENCE', 'GDD-SHARDING', 'GDD-SOCIAL',
  'GDD-TRADE', 'GDD-MODERATION', 'GDD-LIVEOPS', 'GDD-SECURITY', 'GDD-SCOPE', 'GDD-AI-ASSETS',
  'GDD-WORKFLOW', 'GDD-ANIM-ARCHITECTURE',
];
const VAGUE = ['fun', 'deep', 'balanced', 'responsive', 'immersive', 'many', 'fast', 'smooth', 'scalable', 'mmo-scale'];
const errors = [];
const fail = (m) => { console.log(`FAIL  ${m}`); errors.push(m); };
const ok = (m) => console.log(`OK    ${m}`);

for (const p of [INDEX, MODULES, BP]) {
  if (!existsSync(p)) { console.error(`MISSING ${p}`); process.exit(2); }
}
let bp;
try { bp = parseYaml(readFileSync(BP, 'utf8')); }
catch (e) { console.error(`PARSE ${BP}: ${e.message}`); process.exit(2); }

const files = readdirSync(MODULES).filter(f => f.endsWith('.md')).sort();
const names = files.map(f => f.slice(0, -3));
console.log(`\nG1  module inventory: ${files.length} files, expected ${EXPECTED.length}`);
if (files.length !== EXPECTED.length) fail(`G1 expected ${EXPECTED.length} modules, found ${files.length}`);
for (const id of EXPECTED) if (!names.includes(id)) fail(`G1 missing module ${id}`);
for (const id of names) if (!EXPECTED.includes(id)) fail(`G1 unexpected module ${id}`);
if (!errors.length) ok('exactly the 32 modules named in master §3.2');

console.log('\nG2  STUB maturity and required fields (1, 2, 3, 17, 18)');
const STUB_SECTIONS = [
  '## 1. Identity', '## 2. Player-facing outcome', '## 3. High Concept link',
  '## 17. Explicit out of scope', '## 18. Open questions',
];
const ALL_SECTIONS = [
  '## 1. Identity', '## 2. Player-facing outcome', '## 3. High Concept link',
  '## 4. Deterministic rules', '## 5. Numbers with source', '## 6. State machine',
  '## 7. Data contract', '## 8. Edge cases', '## 9. Failure states',
  '## 10. Interaction matrix', '## 11. Feedback', '## 12. Accessibility',
  '## 13. Localization', '## 14. Telemetry', '## 15. Acceptance tests',
  '## 16. Perf budget impact', '## 17. Explicit out of scope',
  '## 18. Open questions', '## 19. Changelog',
];
for (const id of EXPECTED) {
  const p = `${MODULES}/${id}.md`;
  if (!existsSync(p)) continue;
  const text = readFileSync(p, 'utf8');
  const maturity = /\| status \| (STUB|DRAFT|SIGNED) \|/.exec(text)?.[1] ?? '';
  if (!maturity) fail(`G2 ${id} has no readable status`);
  if (!text.startsWith(`# ${id} — ${maturity}`)) fail(`G2 ${id} title does not match its status`);
  if (!/\| owner \| [a-z-]+ \|/.test(text)) fail(`G2 ${id} has no owner`);
  const sections = maturity === 'STUB' ? STUB_SECTIONS : ALL_SECTIONS;
  for (const s of sections) if (!text.includes(s)) fail(`G2 ${id} (${maturity}) missing ${s}`);
  if (maturity !== 'STUB') {
    const field5 = text.split('## 5. Numbers with source')[1]?.split('## 6.')[0] ?? '';
    if (!/SOURCE|TUNABLE/.test(field5)) fail(`G2 ${id} field 5 has no SOURCE or TUNABLE range`);
    if (id === 'GDD-CONSEQUENCE' && !/900/.test(field5)) {
      fail('G2 GDD-CONSEQUENCE field 5 omits the 900-tick T2 budget');
    }
    if (id === 'GDD-QUEST' && !/3 resolutions|>= 3/.test(field5)) {
      fail('G2 GDD-QUEST field 5 omits the T4 three-resolution minimum');
    }
    if (id === 'GDD-ECONOMY' && maturity !== 'STUB') {
      for (const table of ['packages/content/economy/faucets.yaml', 'packages/content/economy/sinks.yaml']) {
        if (!existsSync(table)) fail(`G2 ${id} DRAFT requires ${table}`);
        else {
          try { parseYaml(readFileSync(table, 'utf8')); }
          catch (e) { fail(`G2 ${table} does not parse: ${e.message}`); }
        }
      }
    }
    if (maturity === 'SIGNED' && !/\*\*Signature|\| signed \|/.test(text)) {
      fail(`G2 ${id} is SIGNED without a recorded signature`);
    }
  }
  const lower = text.toLowerCase();
  for (const word of VAGUE) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) fail(`G2 ${id} uses forbidden vague word "${word}" (§3.5)`);
  }
}
if (!errors.length) ok(`${EXPECTED.length} modules: STUB fields or all 19 for DRAFT/SIGNED, no forbidden adjectives`);

console.log('\nG3  index and 19-field template');
const index = readFileSync(INDEX, 'utf8');
for (let i = 1; i <= 19; i++) {
  if (!new RegExp(`\\| ${i} \\|`).test(index)) fail(`G3 index omits mandatory field ${i}`);
}
if (!index.includes('STUB → DRAFT → SIGNED')) fail('G3 index omits the D138 maturity rule');
for (const id of EXPECTED) if (!index.includes(id)) fail(`G3 index omits module ${id}`);
if (!errors.length) ok('index lists 19 fields, maturity rule and all 32 modules');

console.log(`\nG4  critical modules for P2NET / P2SYS / P2 (computed, not typed)`);
const phases = new Set(['P2NET', 'P2SYS', 'P2']);
const tasks = (bp.tasks ?? []).filter(t => phases.has(t.ph));
const refs = new Set(tasks.flatMap(t => (t.gdd ?? []).map(r => String(r).split('#')[0])));
for (const ref of refs) {
  if (!EXPECTED.includes(ref)) fail(`G4 task ref ${ref} is not one of the 32 modules`);
}
console.log(`      ${tasks.length} tasks, ${refs.size} distinct modules: ${[...refs].sort().join(', ')}`);
if (!errors.length) ok('every P2 gdd[] ref resolves to a real module');

if (arg === '--critical') {
  console.log(`\nRESULT: ${errors.length ? 'FAIL' : 'PASS'} — ${refs.size} critical module(s), ${errors.length} error(s).`);
  if (errors.length) { for (const e of errors) console.log(`  - ${e}`); process.exit(1); }
  process.exit(0);
}

console.log(`\nRESULT: ${errors.length ? 'FAIL' : 'PASS'} — ${files.length} modules, ${errors.length} error(s).`);
if (errors.length) {
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
