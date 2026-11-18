#!/usr/bin/env node
/**
 * validate-scene-budget.mjs — greybox scene budget validator (GB-001). Replaced a declared P0-002 stub.
 * Owner: level-designer. Fail closed: a missing manifest, illegal primitive or absent variant swap is an error.
 *
 * `--greybox` validates apps/game/levels/greybox/oakhollow/manifest.json. `--parity` is NOT implemented:
 * WG-001 owns collision/visual parity, and an unimplemented mode exits 1 rather than passing by omission (I5).
 */
import { existsSync, readFileSync } from 'node:fs';

const MANIFEST = 'apps/game/levels/greybox/oakhollow/manifest.json';
const ALLOWED_PRIMITIVE_KEYS = new Set([
  'id', 'kind', 'x', 'y', 'z', 'sx', 'sy', 'sz', 'variantId', 'factId',
]);
const PRIMITIVE_KINDS = new Set(['capsule', 'box']);
const MAX_PRIMITIVES_PER_STRATUM = 64; // borrowed from the NET-002 AoI cap; a greybox budget, not a measured scene limit
const WIRE_MAX_MM = 2_147_483_647;

function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function fail(problems) {
  console.error(`validate-scene-budget — FAIL (${problems.length})`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const mode = process.argv[2];
if (mode === '--parity') {
  console.error('validate-scene-budget — --parity is NOT IMPLEMENTED: WG-001 owns collision/visual parity. Fail closed.');
  process.exit(1);
}
if (mode !== '--greybox') {
  console.error('usage: node scripts/validate-scene-budget.mjs --greybox | --parity');
  process.exit(1);
}

if (!existsSync(MANIFEST)) fail([`manifest missing: ${MANIFEST}`]);
let data;
try {
  data = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch (error) {
  fail([`manifest is not valid JSON: ${String(error.message)}`]);
}

const problems = [];
if (data.version !== 1) problems.push('manifest.version must be 1');
if (data.mode !== 'greybox') problems.push('manifest.mode must be greybox');
if (data.level !== 'oakhollow') problems.push('manifest.level must be oakhollow');
if (data.kitGridMm !== 2000 || data.cellMm !== 64000) {
  problems.push('kit grid must be 2000 mm and cell 64000 mm (GDD-STRATA §5)');
}
if (!Array.isArray(data.strata) || data.strata.length !== 3) {
  problems.push('exactly 3 strata are required');
} else {
  const stratumIds = data.strata.map((stratum) => stratum.id);
  if (stratumIds.join(',') !== '1,2,3') problems.push(`stratum ids must be 1,2,3, got ${stratumIds.join(',')}`);
}

const seenIds = new Set();
let primitiveCount = 0;
let swaps = 0;
const canonical = [];

for (const stratum of data.strata ?? []) {
  if (!Array.isArray(stratum.primitives) || stratum.primitives.length === 0
    || stratum.primitives.length > MAX_PRIMITIVES_PER_STRATUM) {
    problems.push(`stratum ${String(stratum.id)} has ${stratum.primitives?.length ?? 0} primitives (1..${MAX_PRIMITIVES_PER_STRATUM})`);
    continue;
  }
  for (const primitive of stratum.primitives) {
    primitiveCount++;
    for (const key of Object.keys(primitive)) {
      if (!ALLOWED_PRIMITIVE_KEYS.has(key)) {
        problems.push(`primitive ${String(primitive.id)} carries forbidden field ${key} — meshes/textures/materials are not greybox`);
      }
    }
    if (typeof primitive.id !== 'string' || primitive.id.length === 0 || seenIds.has(primitive.id)) {
      problems.push(`primitive id ${String(primitive.id)} is missing or duplicated`);
    }
    seenIds.add(primitive.id);
    if (!PRIMITIVE_KINDS.has(primitive.kind)) {
      problems.push(`primitive ${String(primitive.id)} has kind ${String(primitive.kind)} — only capsule/box are legal`);
    }
    for (const key of ['x', 'y', 'z', 'sx', 'sy', 'sz', 'variantId']) {
      const value = primitive[key];
      if (!Number.isInteger(value)) problems.push(`primitive ${String(primitive.id)}.${key} is not an integer`);
    }
    for (const key of ['x', 'y', 'z']) {
      if (Math.abs(primitive[key]) > WIRE_MAX_MM) problems.push(`primitive ${String(primitive.id)}.${key} exceeds the wire bound`);
    }
    for (const key of ['sx', 'sy', 'sz']) {
      if (primitive[key] <= 0) problems.push(`primitive ${String(primitive.id)}.${key} must be positive`);
    }
    if (!Number.isInteger(primitive.variantId) || primitive.variantId < 0 || primitive.variantId > 4) {
      problems.push(`primitive ${String(primitive.id)}.variantId must be in 0..4`);
    }
    if (primitive.variantId > 0) swaps++;
    if (primitive.factId !== undefined && !/^f-[0-9a-f]{8}-\d+$/.test(primitive.factId)) {
      problems.push(`primitive ${String(primitive.id)}.factId does not match the PR-S2 fact id format`);
    }
    canonical.push(`${stratum.id}:${primitive.id}:${primitive.kind}:${primitive.x}:${primitive.y}:${primitive.z}:${primitive.sx}:${primitive.sy}:${primitive.sz}:${primitive.variantId}:${primitive.factId ?? ''}`);
  }
}
if (swaps === 0) problems.push('no physical variant swap — GDD-CONSEQUENCE §8.2 requires one');

if (problems.length) fail(problems);
const checksum = fnv1a32(canonical.join('|')).toString(16).padStart(8, '0');
console.log(`validate-scene-budget — PASS — ${data.strata.length} strata, ${primitiveCount} primitives, ${swaps} variant swaps, checksum ${checksum}`);
console.log('mode greybox — capsules/boxes only; no mesh, texture, lightmap or collision parity claim (WG-001)');
