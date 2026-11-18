#!/usr/bin/env node
/**
 * validate-manifest.mjs — enforce the AI license audit (P0-006, master §8.1, I4).
 * Owner: asset-pipeline.
 *
 * `--audit` checks that the whitelist can only contain approved candidates with a recorded source,
 * revision and output rights, that no forbidden licence/class entered it, that every id is traceable to
 * the signed audit document, and that the tier probe reads real hardware instead of a hardcoded number.
 * It does NOT verify a model works or download anything: capability is a separate, later task.
 *
 * Exit 0 clean · 1 violation · 2 unreadable inputs · 64 bad usage.
 */
import { existsSync, readFileSync } from 'node:fs';
import { parseYaml } from './lib/yaml.mjs';

if (process.argv[2] !== '--audit') {
  console.error('usage: node scripts/validate-manifest.mjs --audit');
  process.exit(64);
}

const WHITELIST = 'tools/asset-pipeline/whitelist.yaml';
const AUDIT = 'docs/legal/AI_MODEL_AUDIT.md';
const TIER = 'tools/asset-pipeline/detect_tier.py';
const errors = [];
const fail = (m) => { console.log(`FAIL  ${m}`); errors.push(m); };
const ok = (m) => console.log(`OK    ${m}`);

for (const p of [WHITELIST, AUDIT, TIER]) {
  if (!existsSync(p)) { console.error(`MISSING ${p}`); process.exit(2); }
}

let list;
try { list = parseYaml(readFileSync(WHITELIST, 'utf8')); }
catch (e) { console.error(`PARSE ${WHITELIST}: ${e.message}`); process.exit(2); }
const auditText = readFileSync(AUDIT, 'utf8');
const tierText = readFileSync(TIER, 'utf8');

console.log('\nM1  audit document and whitelist identity');
const auditId = /AUDIT-\d{4}-\d{2}-\d{2}-P0-006/.exec(auditText)?.[0] ?? '';
if (!auditId) fail('M1 audit document has no AUDIT-<date>-P0-006 id');
if (list.audit !== auditId) fail(`M1 whitelist audit ${list.audit} != document ${auditId}`);
if (list.date !== '2026-11-18') fail(`M1 unexpected audit date ${JSON.stringify(list.date)}`);
if (!/^## Director decisions/m.test(auditText)) fail('M1 audit document has no Director decisions section');
if (!errors.length) ok(`${auditId} — whitelist and document agree`);

console.log('\nM2  approved entries');
const approved = list.approved ?? [];
const forbiddenClasses = new Set(['NON-COMMERCIAL', 'RESEARCH-ONLY', 'OUTPUT-RIGHTS-UNSTATED', 'NOT_FOUND', 'SUPPLY-CHAIN']);
const forbiddenLicenses = ['flux-1-dev', 'cc-by-nc', 'openrail++', 'non-commercial', 'research-only', 'all-rights-reserved'];
const required = list.policy?.require_fields ?? ['id', 'license', 'class', 'revision', 'source', 'output_rights', 'verdict'];
const seen = new Set();
for (const [i, m] of approved.entries()) {
  const at = `M2 approved[${i}] ${m.id ?? '(no id)'}`;
  for (const f of required) if (!(f in m) || m[f] === '' || m[f] === null) fail(`${at} missing ${f}`);
  if (seen.has(m.id)) fail(`${at} duplicate id ${m.id}`);
  seen.add(m.id);
  if (!String(m.verdict ?? '').startsWith('APPROVED')) fail(`${at} verdict is not APPROVED*`);
  if (forbiddenClasses.has(m.class)) fail(`${at} forbidden class ${m.class}`);
  const lic = String(m.license ?? '').toLowerCase();
  for (const bad of forbiddenLicenses) {
    if (lic.includes(bad)) fail(`${at} forbidden licence "${m.license}"`);
  }
  if (!/^[0-9a-f]{40}$|^[0-9a-f]{64}$/.test(String(m.revision ?? ''))) fail(`${at} revision is not a 40/64-hex pin`);
  if (!/^https:\/\//.test(String(m.source ?? ''))) fail(`${at} source is not an https URL`);
  if (!auditText.includes(m.id)) fail(`${at} id is not traceable to ${AUDIT}`);
}
if (approved.length < 5) fail(`M2 only ${approved.length} approved models; audit is not usable`);
if (!errors.length) ok(`${approved.length} approved entries: fields, pins, sources and licences valid`);

console.log('\nM3  blocked and rejected entries stay out of the whitelist');
const blocked = list.blocked_pending_director ?? [];
const rejected = list.rejected ?? [];
const fallbacks = list.fallbacks ?? [];
const fallbackFrom = new Set(fallbacks.map(f => f.from));
for (const group of [['blocked', blocked], ['rejected', rejected]]) {
  for (const [i, m] of group[1].entries()) {
    const at = `M3 ${group[0]}[${i}] ${m.id ?? '(no id)'}`;
    if (!m.reason) fail(`${at} has no reason`);
    if (!m.fallback) fail(`${at} has no fallback`);
    if (seen.has(m.id)) fail(`${at} duplicate id ${m.id}`);
    seen.add(m.id);
    if (!auditText.includes(m.id)) fail(`${at} id is not traceable to ${AUDIT}`);
    if (group[0] === 'rejected' && forbiddenClasses.has(m.class) === false
      && !String(m.reason).match(/noncommercial|non-commercial|not-found|forbidden|transitive|paper|director/i)) {
      fail(`${at} rejected without a recorded §8.1 reason`);
    }
  }
}
for (const f of fallbacks) {
  if (!f.from || !f.to || !f.kind) fail(`M3 incomplete fallback ${JSON.stringify(f)}`);
}
for (const m of rejected) {
  if (!fallbackFrom.has(m.id)) fail(`M3 rejected ${m.id} has no fallback mapping`);
}
if (!errors.length) ok(`${blocked.length} blocked, ${rejected.length} rejected, ${fallbacks.length} fallbacks — all traceable`);

console.log('\nM4  Director decisions are resolved on the record');
for (const d of list.director_decisions ?? []) {
  if (!d.id || !d.question || !d.recommendation || !d.decision) fail(`M4 incomplete Director decision ${JSON.stringify(d)}`);
  if (d.decision === 'OPEN' || d.status === 'OPEN') fail(`M4 ${d.id} is still OPEN — resolve it before shipping`);
  if (d.decision === 'ACCEPTED' && !d.evidence) fail(`M4 ${d.id} accepted without evidence`);
  if (!['ACCEPTED', 'REJECTED', 'REVERSED'].includes(d.decision)) fail(`M4 ${d.id} unknown decision ${d.decision}`);
  if (!d.evidence) fail(`M4 ${d.id} has no evidence reference`);
}
if (!errors.length) ok(`${(list.director_decisions ?? []).length} decision(s) resolved with evidence`);

console.log('\nM5  tier probe measures hardware');
if (!tierText.includes('nvidia-smi')) fail('M5 detect_tier.py does not query nvidia-smi');
if (!tierText.includes('NO_GPU')) fail('M5 detect_tier.py has no NO_GPU fallback');
if (/\b(15360|16384|24576|8192)\b/.test(tierText)) fail('M5 detect_tier.py hardcodes a VRAM number (I13)');
if (!errors.length) ok('tier probe reads the device and degrades to NO_GPU without inventing VRAM');

console.log(`\n${errors.length ? 'RESULT: FAIL' : 'RESULT: PASS'} — ${approved.length} approved, ${blocked.length} blocked, `
  + `${rejected.length} rejected, ${errors.length} error(s). No model was downloaded or run.`);
if (errors.length) {
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
