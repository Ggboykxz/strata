#!/usr/bin/env node
/**
 * validate-locks.mjs — CI enforcement of the writer-lock registry (WF-002, master §4.3).
 * Owner: orchestrator (A0002 accepted 2026-11-18; D-002 RESOLVED).
 *
 * `docs/state/LOCKS.yaml` on main is a read-only mirror of the registry on branch `state/locks`; git
 * itself is the mutex (a non-fast-forward push means someone moved first). This validator enforces the
 * *shape* of that contract, not a replacement for it:
 *   - schema: version, branch, ttl/heartbeat, rules, locks array
 *   - each lock names a real owner and a real blueprint task
 *   - an active lock has a parseable interval, expires after acquisition and has not expired
 *   - no two active locks claim the same path_glob
 *   - heartbeat < ttl, otherwise the watchdog can never renew in time
 *
 * Exit 0 clean · 1 on any violation · 2 if a required document cannot be read.
 */
import { existsSync, readFileSync } from 'node:fs';
import { parseYaml } from './lib/yaml.mjs';

const LOCKS = 'docs/state/LOCKS.yaml';
const OWNERSHIP = 'docs/state/OWNERSHIP.yaml';
const BLUEPRINT = 'docs/blueprint/BLUEPRINT.yaml';

const errors = [];
const fail = (m) => { console.log(`FAIL  ${m}`); errors.push(m); };
const ok = (m) => console.log(`OK    ${m}`);

function load(path) {
  if (!existsSync(path)) { console.error(`MISSING ${path}`); return null; }
  try { return parseYaml(readFileSync(path, 'utf8')); }
  catch (e) { console.error(`PARSE ${path}: ${e.message}`); return null; }
}

const locksDoc = load(LOCKS);
const own = load(OWNERSHIP);
const bp = load(BLUEPRINT);
if (!locksDoc || !own || !bp) {
  console.log('\nRESULT: FAIL — required documents missing or unreadable.');
  process.exit(2);
}

/* ---------- schema ---------- */
console.log('\nL1  registry schema');
if (locksDoc.version !== 1) fail(`L1 version must be 1, found ${JSON.stringify(locksDoc.version)}`);
if (locksDoc.branch !== 'state/locks') fail(`L1 branch must be state/locks, found ${JSON.stringify(locksDoc.branch)}`);
const ttl = locksDoc.ttl_minutes;
const hb = locksDoc.heartbeat_minutes;
if (!Number.isInteger(ttl) || ttl <= 0) fail(`L1 ttl_minutes must be a positive integer, found ${JSON.stringify(ttl)}`);
if (!Number.isInteger(hb) || hb <= 0) fail(`L1 heartbeat_minutes must be a positive integer, found ${JSON.stringify(hb)}`);
if (Number.isInteger(ttl) && Number.isInteger(hb) && hb >= ttl) {
  fail(`L1 heartbeat_minutes (${hb}) must be < ttl_minutes (${ttl})`);
}
if (!Array.isArray(locksDoc.rules) || !locksDoc.rules.length || locksDoc.rules.some(r => typeof r !== 'string')) {
  fail('L1 rules must be a non-empty list of strings');
}
if (!Array.isArray(locksDoc.locks)) fail('L1 locks must be a list (empty is valid)');
if (!errors.length) ok(`version 1 · branch ${locksDoc.branch} · ttl ${ttl}m · heartbeat ${hb}m · ${locksDoc.rules?.length ?? 0} rules`);

/* ---------- referenced identities ---------- */
const owners = new Set((own.owners ?? []).map(o => o.agent));
const tasks = new Set([...(bp.tasks ?? []).map(t => t.id), ...Object.keys(bp.gates ?? {})]);
const locks = Array.isArray(locksDoc.locks) ? locksDoc.locks : [];
const REQUIRED = ['path_glob', 'owner_agent', 'task_id', 'branch', 'acquired_at', 'expires_at', 'status'];
const ACTIVE = new Map();
const now = Date.now();

console.log(`\nL2  ${locks.length} lock entr${locks.length === 1 ? 'y' : 'ies'}`);
for (const [i, l] of locks.entries()) {
  const at = `L2 lock[${i}]`;
  if (!l || typeof l !== 'object') { fail(`${at} is not a mapping`); continue; }
  for (const f of REQUIRED) if (!(f in l)) fail(`${at} missing ${f}`);
  if (typeof l.path_glob !== 'string' || !l.path_glob) fail(`${at} path_glob must be a non-empty string`);
  if (!owners.has(l.owner_agent)) fail(`${at} owner_agent "${l.owner_agent}" is not in OWNERSHIP.yaml`);
  if (!tasks.has(l.task_id)) fail(`${at} task_id "${l.task_id}" is neither a blueprint task nor a gate`);
  if (typeof l.branch !== 'string' || !/^(session|state)\//.test(l.branch)) {
    fail(`${at} branch must start with session/ or state/ (found ${JSON.stringify(l.branch)})`);
  }
  if (l.status === 'active') {
    const a = Date.parse(l.acquired_at);
    const e = Date.parse(l.expires_at);
    if (!Number.isFinite(a)) fail(`${at} acquired_at is not a timestamp: ${JSON.stringify(l.acquired_at)}`);
    if (!Number.isFinite(e)) fail(`${at} expires_at is not a timestamp: ${JSON.stringify(l.expires_at)}`);
    if (Number.isFinite(a) && Number.isFinite(e) && e <= a) fail(`${at} expires_at <= acquired_at`);
    if (Number.isFinite(e) && e <= now) fail(`${at} is still active but expired at ${l.expires_at}; the watchdog must release it`);
    if (ACTIVE.has(l.path_glob)) {
      fail(`${at} duplicates active path_glob "${l.path_glob}" already held by ${ACTIVE.get(l.path_glob)}`);
    } else ACTIVE.set(l.path_glob, l.owner_agent);
  } else if (!['released', 'expired'].includes(l.status)) {
    fail(`${at} unknown status "${l.status}" (use active | released | expired)`);
  }
}
if (!errors.length) ok(`${locks.length} entr${locks.length === 1 ? 'y' : 'ies'} valid, ${ACTIVE.size} active lock(s), 0 collision(s)`);

console.log(`\n${errors.length ? 'RESULT: FAIL' : 'RESULT: PASS'} — registry structurally valid${locks.length ? `, ${ACTIVE.size} active lock(s)` : ', 0 active locks (empty registry is valid)'}`);
if (errors.length) {
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
