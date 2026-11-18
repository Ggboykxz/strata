#!/usr/bin/env node
/**
 * gdd-coverage.mjs — GDD reference coverage (master §3.6).
 * Owner: game-designer.
 *
 * `--min <ratio>` compares the share of blueprint tasks whose gdd[] references all resolve to real
 * modules. Unreadable input prints NOT COMPUTABLE and exits 2 — never a guessed ratio (I5/I13).
 * GATE:P2 requires --min 0.80, P3+ requires 1.0.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parseYaml } from './lib/yaml.mjs';

const i = process.argv.indexOf('--min');
const min = i >= 0 ? Number(process.argv[i + 1]) : NaN;
if (!Number.isFinite(min) || min < 0 || min > 1) {
  console.error('usage: node scripts/gdd-coverage.mjs --min <0..1>');
  process.exit(64);
}
const BP = 'docs/blueprint/BLUEPRINT.yaml';
const MODULES = 'docs/design/gdd';
if (!existsSync(BP) || !existsSync(MODULES)) {
  console.log('NOT COMPUTABLE — blueprint or GDD module directory missing.');
  process.exit(2);
}
let bp;
try { bp = parseYaml(readFileSync(BP, 'utf8')); }
catch (e) { console.log(`NOT COMPUTABLE — ${e.message}`); process.exit(2); }

const available = new Set(readdirSync(MODULES).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3)));
const tasks = (bp.tasks ?? []).filter(t => Array.isArray(t.gdd) && t.gdd.length > 0);
if (!tasks.length) {
  console.log('NOT COMPUTABLE — no task carries a gdd[] reference.');
  process.exit(2);
}
const resolved = tasks.filter(t => t.gdd.every(r => available.has(String(r).split('#')[0])));
const ratio = resolved.length / tasks.length;
const pct = (ratio * 100).toFixed(1);

console.log(`gdd-coverage: ${resolved.length}/${tasks.length} tasks with fully resolved refs = ${pct}% (min ${(min * 100).toFixed(0)}%)`);
const unresolved = tasks.filter(t => !resolved.includes(t));
for (const t of unresolved.slice(0, 20)) {
  console.log(`  MISSING  ${t.id}: ${t.gdd.filter(r => !available.has(String(r).split('#')[0])).join(', ')}`);
}
console.log(`\nRESULT: ${ratio >= min ? 'PASS' : 'FAIL'} — ${pct}% >= ${(min * 100).toFixed(0)}%?`);
process.exit(ratio >= min ? 0 : 1);
