#!/usr/bin/env node
/**
 * audit-dashboard-deps.mjs — I4 (constitution) licence + transitive-dependency
 * audit gate for the dashboard's Next.js / React / React-DOM stack.
 *
 * Dependency-free (Node built-ins only). Fail-closed by design:
 *   - If any of the three pinned packages is NOT INSTALLED at the exact pinned
 *     version, report NOT INSTALLED and exit 1. It can never silently pass.
 *   - Walk every installed package's package.json license metadata under
 *     node_modules/.pnpm and exit 1 if ANY forbidden licence class appears:
 *       NON-COMMERCIAL, RESEARCH-ONLY, UNLICENSED, GPL-family (incl. LGPL/AGPL/SSPL).
 *   - Exit 0 with a single summary line only when all pinned packages are
 *     installed at the pinned versions and zero forbidden licences are found.
 *
 * Usage: node tools/qa/audit-dashboard-deps.mjs [repoRoot]
 *   repoRoot defaults to process.cwd(). No network, no registry, no side effects.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Exact pinned versions established by AUDIT-2026-11-18-DASH-NEXT (registry metadata).
const PINNED = Object.freeze({
  next: '14.2.35',
  react: '18.3.1',
  'react-dom': '18.3.1',
});

// Forbidden licence classes (I4 + this audit's forbidden-class policy).
// Each entry: [human label, case-insensitive regular expression].
const FORBIDDEN = Object.freeze([
  ['NON-COMMERCIAL', /non[-\s_]?commercial/i],
  ['RESEARCH-ONLY', /research[-\s_]?only|research[-\s_]?use|\bresearch\b/i],
  ['UNLICENSED', /\bunlicensed\b|\bunlicenced\b|\bno\s+license\b/i],
  ['GPL-FAMILY', /\b(?:agpl|lgpl|gpl|sspl|gfdl)v?[-_0-9.]*/i],
  ['CC-NC', /cc[-\s]?by[-\s]?nc|(^|[-_\s])nc([-_\s]|$)/i],
  ['PROPRIETARY', /\bproprietary\b|\bcommercial\s+license\b/i],
]);

const root = resolve(process.argv[2] ?? process.cwd());
const pnpmDir = join(root, 'node_modules', '.pnpm');

// The gate must not pass if the manifest and the audit drift apart.
const appManifest = join(root, 'apps', 'dashboard-next', 'package.json');
if (!existsSync(appManifest)) fail(`missing app manifest: ${appManifest}`);
const declared = JSON.parse(readFileSync(appManifest, 'utf8')).dependencies ?? {};
for (const [name, version] of Object.entries(PINNED)) {
  if (declared[name] !== version) fail(`pin drift: ${name} manifest=${declared[name]} audit=${version}`);
}

function fail(msg) {
  console.error(`FORBIDDEN-LICENCE AUDIT: ${msg}`);
  process.exit(1);
}

// --- 1. Discovery: read license metadata from installed packages ---------------
function readLicense(file) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return { name: '?', version: '?', license: null, file };
  }
  let lic = pkg.license;
  if (Array.isArray(lic)) {
    lic = lic.map((x) => (typeof x === 'string' ? x : x?.type ?? '')).join(' OR ');
  } else if (lic && typeof lic === 'object') {
    lic = lic.type ?? '';
  }
  if ((!lic || String(lic).trim() === '') && Array.isArray(pkg.licenses)) {
    lic = pkg.licenses.map((x) => (typeof x === 'string' ? x : x?.type ?? '')).join(' OR ');
  }
  return {
    name: String(pkg.name ?? '?'),
    version: String(pkg.version ?? '?'),
    license: lic == null || String(lic).trim() === '' ? null : String(lic).trim(),
    file,
  };
}

function collectInstalled() {
  const found = new Map(); // key name@version -> record (dedup)
  if (!existsSync(pnpmDir)) return found;
  let entries;
  try {
    entries = readdirSync(pnpmDir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const nm = join(pnpmDir, entry.name, 'node_modules');
    if (!existsSync(nm)) continue;
    let children;
    try {
      children = readdirSync(nm, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const child of children) {
      if (!child.isDirectory()) continue;
      if (child.name.startsWith('@')) {
        let scoped;
        try {
          scoped = readdirSync(join(nm, child.name), { withFileTypes: true });
        } catch {
          continue;
        }
        for (const s of scoped) {
          if (!s.isDirectory()) continue;
          const pf = join(nm, child.name, s.name, 'package.json');
          if (existsSync(pf)) {
            const rec = readLicense(pf);
            found.set(`${rec.name}@${rec.version}`, rec);
          }
        }
      } else {
        const pf = join(nm, child.name, 'package.json');
        if (existsSync(pf)) {
          const rec = readLicense(pf);
          found.set(`${rec.name}@${rec.version}`, rec);
        }
      }
    }
  }
  return found;
}

const installed = collectInstalled();

// --- 2. Presence + exact-version check (fail-closed) ---------------------------
const missing = [];
const present = [];
for (const [name, version] of Object.entries(PINNED)) {
  const key = `${name}@${version}`;
  if (installed.has(key)) {
    present.push(key);
  } else {
    const anyVersion = [...installed.values()].filter((r) => r.name === name);
    missing.push({ name, version, anyVersion: anyVersion.map((r) => r.version) });
  }
}

if (missing.length > 0) {
  console.error('NOT INSTALLED: pinned dashboard dependencies are missing from node_modules/.pnpm.');
  for (const m of missing) {
    const detail = m.anyVersion.length
      ? `wrong version present: ${m.anyVersion.join(', ')}`
      : 'no installed copy found';
    console.error(`  - ${m.name}@${m.version}: ${detail}`);
  }
  console.error('RESULT=FAIL EXIT=1 REASON=NOT_INSTALLED');
  process.exit(1);
}

// --- 3. Forbidden-licence scan over ALL installed packages --------------------
const violations = [];
let noLicense = 0;
for (const rec of installed.values()) {
  if (rec.license == null) {
    noLicense += 1;
    violations.push({ ...rec, classes: ['UNLICENSED (missing license field)'] });
    continue;
  }
  const classes = [];
  for (const [label, re] of FORBIDDEN) {
    if (re.test(rec.license)) classes.push(label);
  }
  if (classes.length > 0) violations.push({ ...rec, classes });
}

// --- 4. Verdict ----------------------------------------------------------------
if (violations.length > 0) {
  console.error(`FORBIDDEN LICENCE(S) DETECTED: ${violations.length} package record(s).`);
  for (const v of violations) {
    console.error(`  - ${v.name}@${v.version} [${v.license ?? 'MISSING'}] -> ${v.classes.join(', ')} (${v.file})`);
  }
  console.error(`SUMMARY: scanned=${installed.size} pinned=${present.length}/${Object.keys(PINNED).length} forbidden=${violations.length}`);
  console.error('RESULT=FAIL EXIT=1 REASON=FORBIDDEN_LICENCE');
  process.exit(1);
}

console.log(
  `SUMMARY: PASS scanned=${installed.size} pinned=${present.join(',')} forbidden=0 missing_license=${noLicense}`
);
console.log('RESULT=PASS EXIT=0');
process.exit(0);
