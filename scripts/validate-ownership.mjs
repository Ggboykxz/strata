#!/usr/bin/env node
/**
 * validate-ownership.mjs — the single-writer map validator (WF-002, master §4.2/§4.6).
 * Owner: orchestrator (A0002 accepted 2026-11-18; D-002 RESOLVED).
 *
 * Enforces, on the real map and the real blueprint:
 *   - every glob compiles and resolves to exactly one owner (a tie is a map error, never a judgement call)
 *   - each glob's own witness path resolves back to the declaring owner (catches silent shadowing)
 *   - every agent in the map is a real agent
 *   - every non-scaffold task output lies in owner(task.agent) ∪ owner(co[]); append-only new files excepted
 *   - A0002's two validators are still owned by orchestrator (regression guard)
 *
 * The glob compiler mirrors `validate-blueprint.mjs` B2 by design. Consolidating the two into a shared
 * library is a tools-engineer handoff: `scripts/lib/**` is not orchestrator-owned (I6).
 *
 * Exit 0 clean · 1 on any violation · 2 if a required document cannot be read.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parseYaml } from './lib/yaml.mjs';

const OWNERSHIP = 'docs/state/OWNERSHIP.yaml';
const BLUEPRINT = 'docs/blueprint/BLUEPRINT.yaml';

const errors = [];
let warns = 0;
const fail = (m) => { console.log(`FAIL  ${m}`); errors.push(m); };
const warn = (m) => { console.log(`WARN  ${m}`); warns++; };
const ok = (m) => console.log(`OK    ${m}`);

function load(path) {
  if (!existsSync(path)) { console.error(`MISSING ${path}`); return null; }
  try { return parseYaml(readFileSync(path, 'utf8')); }
  catch (e) { console.error(`PARSE ${path}: ${e.message}`); return null; }
}

const own = load(OWNERSHIP);
const bp = load(BLUEPRINT);
if (!own || !bp) {
  console.log('\nRESULT: FAIL — required documents missing or unreadable.');
  process.exit(2);
}

/* ---------- glob engine (mirrors validate-blueprint.mjs) ---------- */
const literal = (g) => g === 'root files (no directory)' ? 0 : (g.indexOf('*') < 0 ? g.length : g.indexOf('*'));
function globRegex(g) {
  if (g === 'root files (no directory)') return null;
  let s = '';
  for (let i = 0; i < g.length; i++) {
    if (g.startsWith('**/', i)) { s += '(?:.*/)?'; i += 2; continue; }
    if (g.startsWith('**', i)) { s += '.*'; i++; continue; }
    if (g[i] === '*') { s += '[^/]*'; continue; }
    s += g[i].replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${s}$`);
}
function matches(glob, path) {
  if (glob === 'root files (no directory)') return !path.includes('/');
  const p = path.endsWith('/') ? `${path}_` : path;
  const re = globRegex(glob);
  if (re && re.test(p)) return true;
  if (!glob.includes('*')) {
    const base = glob.replace(/\/$/, '');
    return p === base || p.startsWith(`${base}/`);
  }
  return false;
}
function witness(g) {
  if (g === 'root files (no directory)') return 'ROOTFILE';
  if (g.endsWith('/**')) return `${g.slice(0, -3)}/x`;
  if (g.endsWith('/*')) return `${g.slice(0, -2)}/x`;
  return g.replace(/\*/g, 'x');
}

const globEntries = [];
for (const e of own.catch_all ?? []) {
  if (!e.glob || !e.owner) fail(`catch_all entry without glob or owner: ${JSON.stringify(e)}`);
  globEntries.push({ glob: e.glob, owner: e.owner, source: 'catch_all' });
}
for (const o of own.owners ?? []) {
  if (!o.agent || !Array.isArray(o.globs)) fail(`owner without agent or globs: ${JSON.stringify(o)}`);
  for (const g of o.globs ?? []) globEntries.push({ glob: g, owner: o.agent, source: o.agent });
}
function ownerOf(path) {
  let best = null;
  const ties = [];
  for (const e of globEntries) {
    if (!matches(e.glob, path)) continue;
    const s = literal(e.glob);
    if (!best || s > best.s) { best = { ...e, s }; ties.length = 0; }
    else if (s === best.s && e.owner !== best.owner) ties.push(e);
  }
  return { ...best, ties };
}

/* ---------- map structure ---------- */
console.log(`\nO1  structure: ${own.owners?.length ?? 0} owners, ${globEntries.length} globs, ${own.catch_all?.length ?? 0} catch-all`);
if (!own.version) fail('O1 OWNERSHIP.yaml has no version');
if (!own.specificity_rule) fail('O1 OWNERSHIP.yaml has no specificity_rule');
if ((own.owners?.length ?? 0) !== 32) fail(`O1 expected 32 owners (§16), found ${own.owners?.length ?? 0}`);
if ((own.catch_all?.length ?? 0) !== 7) fail(`O1 expected 7 catch-all stewards, found ${own.catch_all?.length ?? 0}`);

const agentsDir = '.opencode/agents';
const declaredAgents = new Set(existsSync(agentsDir)
  ? readdirSync(agentsDir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)) : []);
const tasks = bp.tasks ?? [];
const taskAgents = new Set(tasks.flatMap((t) => [t.agent, ...(t.co ?? [])]));
const known = new Set([...declaredAgents, ...taskAgents]);
for (const o of own.owners ?? []) {
  if (!known.has(o.agent)) fail(`O1 owner "${o.agent}" is not a real agent (no agent file, no task reference)`);
}
if (!errors.length) ok('version, specificity rule, owner count, catch-all count and agent names are valid');

/* ---------- glob integrity ---------- */
console.log('\nO2  glob compilation, ties and self-resolution');
const byGlob = new Map();
for (const e of globEntries) {
  try { globRegex(e.glob); }
  catch (err) { fail(`O2 glob ${JSON.stringify(e.glob)} does not compile: ${err.message}`); }
  if (byGlob.has(e.glob) && byGlob.get(e.glob).owner !== e.owner) {
    fail(`O2 identical glob ${e.glob} owned by ${byGlob.get(e.glob).owner} and ${e.owner}`);
  }
  byGlob.set(e.glob, e);
  const w = witness(e.glob);
  const resolved = ownerOf(w);
  if (!resolved.owner) fail(`O2 ${e.glob} resolves to nobody at its witness path ${w}`);
  else if (resolved.ties.length) fail(`O2 tie at witness ${w}: ${resolved.owner} vs ${resolved.ties.map(t => t.owner).join(', ')}`);
  else if (resolved.owner !== e.owner) {
    fail(`O2 ${e.glob} (${e.owner}) is shadowed at ${w} by ${resolved.owner} (${resolved.glob})`);
  }
}
if (!errors.length) ok(`${globEntries.length} globs compile, no tie, every witness resolves to its declaring owner`);

/* ---------- task outputs ---------- */
console.log('\nO3  task outputs inside owner ∪ co (scaffold exemptions printed)');
const appendOnly = own.append_only_zones ?? [];
for (const t of tasks) {
  const allowed = new Set([t.agent, ...(t.co ?? [])]);
  for (const p of t.out ?? []) {
    if (appendOnly.some(g => matches(g, p)) && !existsSync(p)) continue;
    const r = ownerOf(p);
    if (!r.owner) { fail(`O3 ${t.id} writes to ${p}, which has no owner`); continue; }
    if (r.ties.length) { fail(`O3 tie on ${p}: ${r.owner} vs ${r.ties.map(x => x.owner).join(', ')}`); continue; }
    if (allowed.has(r.owner)) continue;
    if (t.scaffold) warn(`O3 ${t.id} scaffold exemption: ${p} (${r.owner})`);
    else fail(`O3 ${t.id} writes ${p} owned by ${r.owner}, outside ${[...allowed].join('∪')}`);
  }
}
if (!errors.length) ok(`every non-scaffold output resolves inside its task's owner set; ${warns} scaffold warning(s)`);

/* ---------- governance regressions ---------- */
console.log('\nO4  A0002 regression guard and scaffold declarations');
for (const p of ['scripts/validate-ownership.mjs', 'scripts/validate-locks.mjs']) {
  const r = ownerOf(p);
  if (r.owner !== 'orchestrator') fail(`O4 ${p} must be orchestrator-owned (A0002), found ${r.owner ?? 'nobody'}`);
}
for (const id of own.scaffold_exempt_tasks ?? []) {
  const t = tasks.find(x => x.id === id);
  if (!t) fail(`O4 scaffold_exempt_tasks contains unknown task ${id}`);
  else if (!t.scaffold) fail(`O4 ${id} is declared scaffold-exempt but the blueprint has no scaffold:true`);
}
if (!errors.length) ok('A0002 ownership intact; every scaffold exemption is declared in the blueprint');

console.log(`\n${errors.length ? 'RESULT: FAIL' : 'RESULT: PASS'} — ${globEntries.length} globs, ${tasks.length} tasks, `
  + `${errors.length} error(s), ${warns} warning(s)`);
if (errors.length) {
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
