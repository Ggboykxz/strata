// One-off generator for P0-002 failing validator stubs. Not committed; the stubs are.
import { readFileSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { parseYaml } from '../../scripts/lib/yaml.mjs';

const ROOT = process.cwd();
const bp = parseYaml(readFileSync(`${ROOT}/docs/blueprint/BLUEPRINT.yaml`, 'utf8'));
const own = parseYaml(readFileSync(`${ROOT}/docs/state/OWNERSHIP.yaml`, 'utf8'));

const entries = [];
for (const e of own.catch_all ?? []) entries.push({ glob: e.glob, owner: e.owner });
for (const o of own.owners ?? []) for (const g of o.globs ?? []) entries.push({ glob: g, owner: o.agent });
const lit = (g) => g === 'root files (no directory)' ? 0 : (g.includes('*') ? g.indexOf('*') : g.length);
function rx(g) {
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
const ownerOf = (p) => {
  let best = null;
  for (const e of entries) {
    const path = p.endsWith('/') ? p + '_' : p;
    const m = e.glob === 'root files (no directory)' ? !path.includes('/') : rx(e.glob).test(path);
    if (!m) continue;
    const s = lit(e.glob);
    if (!best || s > best.s) best = { s, owner: e.owner, glob: e.glob };
  }
  return best;
};

const wanted = new Map();
for (const t of bp.tasks) {
  for (const p of t.out ?? []) {
    const m = /^(scripts\/[^\s]+\.mjs)$/.exec(p);
    if (m && (t.acc ?? []).some(c => c.includes(p))) wanted.set(p, { task: t.id, agent: t.agent });
  }
  for (const cmd of t.acc ?? []) {
    const m = /^node\s+(scripts\/[^\s]+\.mjs)/.exec(cmd);
    if (m && !wanted.has(m[1])) wanted.set(m[1], { task: t.id, agent: t.agent });
  }
}
wanted.set('scripts/gdd-to-tests.mjs', { task: 'GDD-005', agent: 'qa-engineer' });
wanted.set('scripts/session-result.mjs', { task: 'P0-002', agent: 'orchestrator' });

const written = [];
for (const [p, who] of [...wanted].sort()) {
  const abs = `${ROOT}/${p}`;
  const map = ownerOf(p);
  const disputed = (p === 'scripts/validate-ownership.mjs' || p === 'scripts/validate-locks.mjs');
  const ownerLine = disputed
    ? `DISPUTED — map says ${map?.owner}, task WF-002 says ${who.agent}; see dispute D-002`
    : `${map?.owner ?? who.agent} (map; referenced by ${who.task})`;
  const name = p.split('/').pop();
  const body = `#!/usr/bin/env node
/**
 * ${name} — DECLARED STUB, NOT IMPLEMENTED
 * Created by P0-002 (§4.2: every validator referenced by an \`acc\` exists as a stub THAT FAILS).
 * Owner: ${ownerLine}.
 *
 * Exits 1 on purpose. Acceptance can never pass by omission (I5, B7). Replace this file with the real
 * validator and delete this banner; until then, any task whose acceptance calls it is NOT verifiable.
 */
console.error('NOT IMPLEMENTED — ${name} is a declared stub (P0-002).');
console.error('Owner: ${ownerLine}. Implement it before any task relies on this acceptance command (I5).');
process.exit(1);
`;
  // Atomic exclusive create: no existsSync/writeFileSync race (CodeQL `js/file-system-race`).
  let fd;
  try {
    fd = openSync(abs, 'wx', 0o755);
  } catch (error) {
    if (error.code === 'EEXIST') continue; // already generated: never overwrite a real validator
    throw error;
  }
  try {
    writeFileSync(fd, body);
  } finally {
    closeSync(fd);
  }
  written.push(`${p}  <- ${ownerLine}`);
}
console.log(`wrote ${written.length} failing stubs:`);
for (const w of written) console.log('  ' + w);
