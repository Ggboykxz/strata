/**
 * Interim ownership check — vendored next to its evidence so the log is reproducible.
 * Replaced by scripts/validate-ownership.mjs at WF-002.
 *
 * Resolves all paths from its own location, so it runs from any cwd.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');
const { parseYamlSubset } = await import(pathToFileURL(resolve(ROOT, 'scripts/scope-math.mjs')).href);

const src = readFileSync(resolve(ROOT, 'docs/state/OWNERSHIP.yaml'), 'utf8');
const doc = parseYamlSubset(src);
const fail = [];
const ok = (m) => console.log(`PASS  ${m}`);
const bad = (m) => { console.log(`FAIL  ${m}`); fail.push(m); };

const owners = doc.owners ?? [];
ok(`owners parsed: ${owners.length}`);
if (owners.length !== 32) bad(`expected 32 owners (§16), got ${owners.length}`);

const seen = new Map();
for (const o of owners) {
  if (!o.agent) bad('owner without agent');
  if (!o.readonly && (!Array.isArray(o.globs) || o.globs.length === 0)) {
    bad(`${o.agent}: no globs and not readonly`);
  }
  for (const g of o.globs ?? []) {
    if (seen.has(g)) bad(`map tie: "${g}" owned by ${seen.get(g)} and ${o.agent}`);
    else seen.set(g, o.agent);
  }
}
ok(`glob ties checked (${seen.size} distinct globs)`);

const catchAll = doc.catch_all ?? [];
ok(`catch-all entries: ${catchAll.length}`);
if (catchAll.length !== 7) bad(`expected 7 catch-all entries, got ${catchAll.length}`);

const append = doc.append_only_zones ?? [];
ok(`append-only zones: ${append.length}`);
if (append.length !== 4) bad(`expected 4 append-only zones, got ${append.length}`);

const orch = owners.find(o => o.agent === 'orchestrator');
if (!orch?.globs?.includes('docs/state/**')) bad('orchestrator does not own docs/state/**');
else ok('orchestrator owns docs/state/**');

const reviewer = owners.find(o => o.agent === 'code-reviewer');
if (!reviewer?.readonly) bad('code-reviewer is not readonly');
else ok('code-reviewer is read-only');

console.log(`\n${fail.length === 0 ? 'PASS' : 'FAIL'}  ownership map  failures=${fail.length}`);
process.exit(fail.length === 0 ? 0 : 1);
