#!/usr/bin/env node
/**
 * validate-blueprint.mjs — B1..B8 on docs/blueprint/BLUEPRINT.yaml
 * Owner: tools-engineer (P0-002). Acceptance: `node scripts/validate-blueprint.mjs`
 *                                Generator:  `node scripts/validate-blueprint.mjs --emit-gates`
 *
 * Plan-time vs selection-time (stated because it changes what "fail" means):
 *   - B1, B2, B6, B7, B8 are structural: evaluated on every task, always.
 *   - B3 (ledger entry, GDD maturity), B4 (tier), B5 (art gate) depend on runtime state. They are
 *     enforced on tasks of the only currently authorized phase (P0, because authorized_tier is S0)
 *     and reported as DEFERRED for later phases. A deferred check is not a pass: it is listed.
 *
 * Interpretations, recorded so they can be challenged:
 *   - B1 is a cycle rule, not a rank rule: a gate dependency is legal iff that gate does not require
 *     the task (directly or transitively). NG-001 legitimately depends on GATE:P2NET, which it documents
 *     and which does not require it. A task depending on a gate that requires it is a cycle and fails.
 *   - B2 exempts `scaffold: true` tasks, exactly as §4.2 says; the exemption is printed, never silent.
 *   - B3 accepts SL-<task-id> (the documented default) and also an explicit `ledger:` field.
 *   - B7 treats a `NOT IMPLEMENTED` stub as a warning (the task simply cannot be accepted yet); a
 *     missing script is an error.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseYaml } from './lib/yaml.mjs';

const BLUEPRINT = 'docs/blueprint/BLUEPRINT.yaml';
const OWNERSHIP = 'docs/state/OWNERSHIP.yaml';
const LEDGER = 'docs/production/SCOPE_LEDGER.yaml';
const GATES_OUT = 'docs/blueprint/GATES.yaml';

const errors = [];
const warns = [];
const ok = (m) => console.log(`OK    ${m}`);
const bad = (m) => { console.log(`FAIL  ${m}`); errors.push(m); };
const warn = (m) => { console.log(`WARN  ${m}`); warns.push(m); };

const read = (p) => {
  if (!existsSync(p)) { bad(`missing ${p}`); return null; }
  try { return parseYaml(readFileSync(p, 'utf8')); }
  catch (e) { bad(`cannot parse ${p}: ${e.message}`); return null; }
};

/* ---------- load ---------- */
const bp = read(BLUEPRINT);
const own = read(OWNERSHIP);
const ledger = read(LEDGER);
if (!bp || !own || !ledger) {
  console.error(`\nRESULT: FAIL — cannot validate without the three documents.`);
  process.exit(1);
}

const tasks = bp.tasks ?? [];
const gates = bp.gates ?? {};
const PHASES = ['P0', 'P1', 'P2NET', 'P2SYS', 'P2', 'P3ART', 'P4', 'P4N', 'P8'];
const rank = (ph) => PHASES.indexOf(ph);
const idIndex = new Map(tasks.map((t, i) => [t.id, i]));

/* ---------- ranges: NET-001..NET-006, P0-001..P0-007, GATE:P2NET ---------- */
function expandOne(id) {
  const m = /^(.*?)(\d+)\.\.(.*?)(\d+)$/.exec(id);
  if (!m) return [id];
  const [, p1, a, p2, b] = m;
  if (p1 !== p2) return [id];
  const out = [];
  for (let n = Number(a); n <= Number(b); n++) out.push(`${p1}${String(n).padStart(a.length, '0')}`);
  return out;
}
const expand = (list) => (list ?? []).flatMap(expandOne);

/* ---------- ownership ---------- */
const globEntries = [];
for (const e of own.catch_all ?? []) globEntries.push({ glob: e.glob, owner: e.owner });
for (const o of own.owners ?? []) for (const g of o.globs ?? []) globEntries.push({ glob: g, owner: o.agent });

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
function ownerOf(path) {
  let best = null;
  const ties = [];
  for (const e of globEntries) {
    if (!matches(e.glob, path)) continue;
    const s = literal(e.glob);
    if (!best || s > best.s) { best = { s, owner: e.owner, glob: e.glob }; ties.length = 0; }
    else if (s === best.s && e.owner !== best.owner) ties.push(e);
  }
  return { ...best, ties };
}

/* ---------- structure ---------- */
console.log(`\nB0  structure (${tasks.length} tasks, ${Object.keys(gates).length} gates)`);
const seen = new Set();
for (const t of tasks) {
  if (seen.has(t.id)) bad(`B0 duplicate task id ${t.id}`);
  seen.add(t.id);
  for (const f of ['id', 'ph', 'tier', 't', 'agent', 'role', 'gdd', 'deps', 'out', 'acc']) {
    if (!(f in t)) bad(`B0 ${t.id} missing field ${f}`);
  }
  if (!PHASES.includes(t.ph)) bad(`B0 ${t.id} unknown phase ${t.ph}`);
  if (!['sig', 'amp', 'sup'].includes(t.role)) bad(`B0 ${t.id} unknown role ${t.role}`);
}
if (!errors.length) ok(`every task has the 10 required fields and a known phase/role`);

console.log(`\nB1  dependency order and cycles`);
for (const t of tasks) {
  for (const dep of t.deps ?? []) {
    for (const d of expandOne(dep)) {
      if (d.startsWith('GATE:')) {
        const g = gates[d];
        if (!g) { bad(`B1 ${t.id} depends on unknown ${d}`); continue; }
        const req = expand(g.requires);
        if (req.includes(t.id)) bad(`B1 ${t.id} depends on ${d}, which requires it (cycle)`);
        if (rank(t.ph) < 0) bad(`B1 ${t.id} has no readable phase`);
      } else {
        const i = idIndex.get(d);
        if (i === undefined) bad(`B1 ${t.id} depends on unknown task ${d}`);
        else if (i >= idIndex.get(t.id)) bad(`B1 ${t.id} depends on later task ${d}`);
      }
    }
  }
}
if (!errors.length) ok(`no unknown, later or cyclic dependency`);

console.log(`\nB2  ownership (agent ∪ co), append-only zones, scaffold exemption per §4.2`);
const appendOnly = own.append_only_zones ?? [];
const openDisputes = new Map();
if (existsSync('docs/production/DISPUTES.md')) {
  for (const line of readFileSync('docs/production/DISPUTES.md', 'utf8').split('\n')) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').map(s => s.trim());
    if (c.length < 9 || c[1] === 'id' || /^-+$/.test(c[1])) continue;
    if (/OPEN|refused/i.test(c[7] ?? '')) openDisputes.set(c[3], c[1]);
  }
}
for (const t of tasks) {
  const allowed = new Set([t.agent, ...(t.co ?? [])]);
  const badPaths = [];
  for (const p of t.out ?? []) {
    const o = ownerOf(p);
    const appendNew = appendOnly.some(g => matches(g, p)) && !existsSync(p);
    if (appendNew) continue;
    if (!o.owner) badPaths.push(`${p} (no owner)`);
    else if (!allowed.has(o.owner)) badPaths.push(`${p} (${o.owner})`);
  }
  if (!badPaths.length) continue;
  if (openDisputes.has(t.id)) {
    warn(`B2 ${t.id} refused_ownership — open dispute ${openDisputes.get(t.id)} (Director level)`);
  } else if (t.scaffold) {
    warn(`B2 ${t.id} scaffold exemption: ${badPaths.join(', ')}`);
  } else {
    bad(`B2 ${t.id} writes outside ${[...allowed].join('∪')}: ${badPaths.join(', ')}`);
  }
}
for (const e of globEntries) {
  if (e.glob === 'root files (no directory)') continue;
  const o = ownerOf(e.glob.replace(/\*\*?.*$/, '') || 'x');
  if (o.ties?.length) bad(`B2 ownership tie on ${e.glob}: ${e.owner} vs ${o.ties.map(x => x.owner).join(', ')}`);
}
if (!errors.length) ok(`every non-scaffold out path resolves to agent ∪ co; no glob tie`);

console.log(`\nB3  gdd[], role, ledger entry, GDD maturity`);
const ledgerIds = new Set((ledger.entries ?? []).map(e => e.id));
for (const t of tasks) {
  if (!Array.isArray(t.gdd) || t.gdd.length === 0) bad(`B3 ${t.id} has no gdd[]`);
  if (!t.role) bad(`B3 ${t.id} has no role`);
  if (t.ph !== 'P0') continue;
  const ref = t.ledger ?? `SL-${t.id.replace(/\.[a-z]$/, '')}`;
  if (!ledgerIds.has(ref)) bad(`B3 ${t.id} has no ledger entry ${ref}`);
}
warn(`B3 GDD maturity is DEFERRED: no module exists before GDD-001 (P1), and P1 is not authorized yet`);
if (!errors.length) ok(`P0 tasks carry gdd[], role and a ledger entry; later phases deferred`);

console.log(`\nB4/B5  tier and art gate (selection-time, enforced on the authorized phase)`);
const tierOk = ['S0', 'S1', 'S2', 'S3', 'S4'];
const cur = tierOk.indexOf(bp.current_tier);
const auth = tierOk.indexOf(bp.authorized_tier);
if (cur < 0 || auth < 0) bad(`B4 unreadable tiers: current=${bp.current_tier} authorized=${bp.authorized_tier}`);
else if (cur > auth) bad(`B4 current_tier ${bp.current_tier} > authorized ${bp.authorized_tier}`);
for (const t of tasks) {
  if (!tierOk.includes(t.tier)) bad(`B4 ${t.id} unknown tier ${t.tier}`);
  if (t.ph === 'P0' && tierOk.indexOf(t.tier) > auth) bad(`B4 ${t.id} tier ${t.tier} > authorized ${bp.authorized_tier}`);
  if (t.ph === 'P0' && t.art) bad(`B5 ${t.id} is art:true while NET-GATE is unpassed`);
  if (t.tier !== 'S0' && t.ph === 'P0') bad(`B4 ${t.id} is P0 but tier ${t.tier}`);
}
const deferred = tasks.filter(t => t.ph !== 'P0' && (tierOk.indexOf(t.tier) > auth || t.art));
if (deferred.length) warn(`B4/B5 deferred for ${deferred.length} non-P0 tasks (tier > ${bp.authorized_tier} or art): ${deferred.map(t => t.id).join(', ')}`);
if (!errors.length) ok(`P0 is within authorized_tier ${bp.authorized_tier}; 0 art task in an authorized phase`);

console.log(`\nB6  only a gate grants a tier`);
const ladder = ['S0', 'S1', 'S2', 'S3', 'S4'];
for (const [id, g] of Object.entries(gates)) {
  if (!g || typeof g !== 'object') { bad(`B6 ${id} is not a mapping`); continue; }
  if (g.grants_tier) {
    const from = ladder.indexOf(g.tier ?? bp.current_tier);
    const to = ladder.indexOf(g.grants_tier);
    if (to !== from + 1) bad(`B6 ${id} grants ${g.grants_tier} from ${g.tier ?? bp.current_tier}: must be exactly one step`);
  }
}
for (const t of tasks) if (t.grants_tier) bad(`B6 task ${t.id} grants a tier`);
if (!errors.length) ok(`no task grants a tier; every gate grant is exactly one step`);

console.log(`\nB7  acceptance commands exist; stubs fail`);
const b7Before = errors.length;
let stubCount = 0;
for (const t of tasks) {
  for (const cmd of t.acc ?? []) {
    const m = /^node\s+(scripts\/[^\s]+|[^\s]+\.mjs)/.exec(cmd);
    if (m) {
      const p = m[1];
      if (!existsSync(p)) bad(`B7 ${t.id} acceptance references missing ${p}`);
      else if (readFileSync(p, 'utf8').includes('NOT IMPLEMENTED')) stubCount++;
      continue;
    }
    if (/^(pnpm|bash -n|python3?|test|node -e)\b/.test(cmd)) continue;
    warn(`B7 ${t.id} acceptance is not statically checkable: ${cmd}`);
  }
}
if (errors.length === b7Before) ok(`every acc script exists; ${stubCount} are declared stubs (they exit 1 until implemented)`);

console.log(`\nB9  acceptance commands must not be false-pass forms`);
const LEGACY_FALSE_PASS = new Set([
  'PR-N2::pnpm sim prn2 --assert',
  'PR-S3::pnpm sim prs3 --assert',
  'PR-S6::pnpm sim prs6 --assert',
  'PR-S7::pnpm sim prs7 --assert',
  'PR-S8::pnpm sim prs8 --assert',
  'AN-002::pnpm test --filter @strata/anim',
  'P3-005::pnpm test --filter @strata/a11y',
  'P3-006::pnpm test --filter @strata/perf',
  'NET-101::pnpm sim prn1 --tier S2 --assert',
  'NET-102::pnpm test --filter @strata/persistence',
  'NET-103::pnpm test --filter @strata/server -t commitqueue',
  'MOD-001::pnpm test --filter @strata/moderation',
]);
const falsePass = (cmd) => /^pnpm test --filter\b/.test(cmd)
  || /^pnpm --filter \S+ test\b/.test(cmd)
  || /^pnpm vitest run .+ -t \S/.test(cmd)
  || /^pnpm sim \S+ --assert/.test(cmd);
let legacyCount = 0;
for (const t of tasks) {
  for (const cmd of t.acc ?? []) {
    if (!falsePass(cmd)) continue;
    if (LEGACY_FALSE_PASS.has(`${t.id}::${cmd}`)) {
      legacyCount++;
      warn(`B9 ${t.id} legacy false-pass acc "${cmd}" — repair when the task is implemented`);
    } else {
      bad(`B9 ${t.id} new false-pass acc "${cmd}" — name a real test file or command`);
    }
  }
}
ok(`${legacyCount} declared legacy false-pass accs; no new ones accepted`);

console.log(`\nB8  split heuristic (acc > 3 or out > 4)`);
for (const t of tasks) {
  const acc = (t.acc ?? []).length;
  const out = (t.out ?? []).length;
  if ((acc > 3 || out > 4) && !t.split) bad(`B8 ${t.id} has ${acc} acc / ${out} out and is not split`);
  if ((acc > 3 || out > 4) && t.split) warn(`B8 ${t.id} split required and declared (${acc} acc, ${out} out)`);
}
if (!errors.length) ok(`no oversized, undeclared task`);

/* ---------- gates file ---------- */
function emit(v, ind = 0) {
  const pad = ' '.repeat(ind);
  if (Array.isArray(v)) return `[${v.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(', ')}]`;
  if (v === null) return 'null';
  return String(v);
}
function emitMap(obj, ind) {
  const pad = ' '.repeat(ind);
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) out += `${pad}${k}:\n${emitMap(v, ind + 2)}`;
    else out += `${pad}${k}: ${emit(v)}\n`;
  }
  return out;
}
if (process.argv.includes('--emit-gates')) {
  const sha = createHash('sha256').update(readFileSync(BLUEPRINT)).digest('hex');
  const body = `# GENERATED by \`node scripts/validate-blueprint.mjs --emit-gates\` — do not edit.\n`
    + `# Source: ${BLUEPRINT}\n# sha256: ${sha}\n# Gates: ${Object.keys(gates).length}\n\n`
    + `version: ${bp.version}\ngates:\n${emitMap(gates, 2)}`;
  writeFileSync(GATES_OUT, body);
  console.log(`\nWROTE ${GATES_OUT} (${Object.keys(gates).length} gates)`);
}

/* ---------- verdict ---------- */
console.log(`\n${errors.length ? 'RESULT: FAIL' : 'RESULT: PASS'} — ${tasks.length} tasks, ${Object.keys(gates).length} gates, `
  + `${errors.length} error(s), ${warns.length} warning(s)`);
if (errors.length) {
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
