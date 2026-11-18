#!/usr/bin/env node
/**
 * check-ownership-map.mjs — quick ownership-map inventory (P0-005 reproduction).
 * Owner: tools-engineer. Read-only; the authoritative gate is scripts/validate-ownership.mjs.
 */
import { readFileSync } from 'node:fs';
import { parseYaml } from '../../scripts/lib/yaml.mjs';

const doc = parseYaml(readFileSync('docs/state/OWNERSHIP.yaml', 'utf8'));
const owners = doc.owners ?? [];
const globs = owners.flatMap(o => (o.globs ?? []).map(g => [g, o.agent]));
const seen = new Map();
let ties = 0;
for (const [g, agent] of globs) {
  if (seen.has(g) && seen.get(g) !== agent) { ties++; continue; }
  seen.set(g, agent);
}
console.log(`owners=${owners.length} owner_globs=${globs.length} catch_all=${doc.catch_all?.length ?? 0} ties=${ties}`);
console.log(`RESULT: ${ties === 0 && owners.length === 32 ? 'PASS' : 'FAIL'} — 32 owners expected, 0 ties allowed.`);
process.exit(ties === 0 && owners.length === 32 ? 0 : 1);
