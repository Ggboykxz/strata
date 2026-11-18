#!/usr/bin/env node
/**
 * validate-workflows.mjs — static enforcement of P0-004's 27 GitHub Actions workflows.
 * Owner: release-engineer (WORKFLOW.md §4.2/§6 and OWNERSHIP.yaml; A0002 precedent for domain validators).
 *
 * GitHub Actions cannot be executed from the orchestrator sandbox. Acceptance is therefore STATIC:
 * the validator checks what can be proven on disk, and says so. It never claims a workflow ran.
 *
 * Enforced:
 *  - exactly 27 workflow files, unique names, explicit permissions/concurrency, job timeouts
 *  - every `uses:` pinned to a 40-hex commit SHA with a version comment; no tags, branches or `latest`
 *  - pull_request_target may never check out the PR head
 *  - every referenced local script exists; installs use --frozen-lockfile
 *  - a workflow that calls a declared stub is manual-only, never silently green on a PR
 *  - at least one workflow runs `pnpm verify`, one `pnpm tracer --assert`, one self-validation
 *
 * Exit 0 clean · 1 on any violation · 2 if the workflow directory is missing.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parseYaml } from './lib/yaml.mjs';

const DIR = '.github/workflows';
const EXPECTED = 27;
const errors = [];
const fail = (m) => { console.log(`FAIL  ${m}`); errors.push(m); };
const ok = (m) => console.log(`OK    ${m}`);

if (!existsSync(DIR)) {
  console.error(`MISSING ${DIR}`);
  process.exit(2);
}
const files = readdirSync(DIR).filter(f => /\.(yml|yaml)$/.test(f)).sort();
console.log(`\nW1  inventory: ${files.length} workflow file(s), expected ${EXPECTED}`);
if (files.length !== EXPECTED) fail(`W1 expected ${EXPECTED} workflow files, found ${files.length}`);

const parsed = new Map();
const names = new Set();
let runs = [];
let usesCount = 0;

for (const file of files) {
  const path = `${DIR}/${file}`;
  const raw = readFileSync(path, 'utf8');
  let doc;
  try { doc = parseYaml(raw); }
  catch (e) { fail(`W2 ${file} does not parse: ${e.message}`); continue; }
  parsed.set(file, { doc, raw });

  if (typeof doc.name !== 'string' || !doc.name) fail(`W2 ${file} has no name:`);
  else if (names.has(doc.name)) fail(`W2 duplicate workflow name "${doc.name}" in ${file}`);
  else names.add(doc.name);
  if (!doc.on) fail(`W2 ${file} has no triggers`);
  if (!doc.permissions || typeof doc.permissions !== 'object' || !('contents' in doc.permissions)) {
    fail(`W2 ${file} has no explicit permissions.contents`);
  }
  if (!doc.concurrency || typeof doc.concurrency !== 'object' || !doc.concurrency.group) {
    fail(`W2 ${file} has no concurrency group`);
  }
  if (!doc.jobs || typeof doc.jobs !== 'object' || !Object.keys(doc.jobs).length) {
    fail(`W2 ${file} has no jobs`);
  }

  for (const [jobId, job] of Object.entries(doc.jobs ?? {})) {
    if (!job || typeof job !== 'object') { fail(`W3 ${file}:${jobId} is not a mapping`); continue; }
    if (typeof job['runs-on'] !== 'string') fail(`W3 ${file}:${jobId} has no runs-on`);
    if (typeof job['timeout-minutes'] !== 'number' || job['timeout-minutes'] <= 0) {
      fail(`W3 ${file}:${jobId} has no positive timeout-minutes`);
    }
    if (!Array.isArray(job.steps) || !job.steps.length) fail(`W3 ${file}:${jobId} has no steps`);
  }

  /* ---- raw-line rules (comments are stripped by the YAML parser) ---- */
  raw.split('\n').forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    const ref = /\buses:\s*(\S+)/.exec(line);
    if (ref) {
      usesCount++;
      const pin = /^([^\s@]+)@([0-9a-f]{40})$/.exec(ref[1]);
      const version = /\s+#\s*(v[0-9][^\s]*)\s*$/.exec(line);
      if (!pin || !version) fail(`W4 ${at} uses is not pinned to a 40-hex SHA with a version comment: ${line.trim()}`);
      else if (/latest|main|master/i.test(version[1])) fail(`W4 ${at} uses a moving version "${version[1]}"`);
    }
    const r = /\brun:\s*(.+)$/.exec(line);
    if (r) {
      const cmd = r[1].trim();
      runs.push({ at, cmd });
      if (/\bcurl\b.*\|\s*(ba)?sh/.test(cmd)) fail(`W5 ${at} contains curl | bash from an unverified source`);
      if (/\blatest\b/.test(cmd)) fail(`W5 ${at} contains an unpinned "latest"`);
      if (/\bpnpm install\b/.test(cmd) && !/pnpm install --frozen-lockfile/.test(cmd)) {
        fail(`W5 ${at} installs without --frozen-lockfile: ${cmd}`);
      }
      for (const s of cmd.matchAll(/\bnode\s+(scripts\/[^\s]+\.mjs)/g)) {
        if (!existsSync(s[1])) fail(`W5 ${at} references missing local script ${s[1]}`);
      }
    }
  });

  /* ---- pull_request_target must never check out the PR head ---- */
  const trigger = doc.on;
  if (trigger && typeof trigger === 'object' && 'pull_request_target' in trigger) {
    const allSteps = Object.values(doc.jobs ?? {}).flatMap(j => (j && j.steps) || []);
    for (const step of allSteps) {
      const ref = step?.with?.ref;
      if (typeof ref === 'string' && /head\.sha|pull_request\.head/.test(ref)) {
        fail(`W6 ${file} checks out the PR head under pull_request_target`);
      }
    }
  }

  /* ---- a declared stub may not run on a PR as if it were green ---- */
  const stubCall = runs.some(({ at, cmd }) => {
    if (!at.startsWith(`${file}:`)) return false;
    const script = cmd.match(/node\s+(scripts\/[^\s]+\.mjs)/)?.[1];
    return Boolean(script && script !== 'scripts/validate-workflows.mjs' && existsSync(script)
      && readFileSync(script, 'utf8').includes("console.error('NOT IMPLEMENTED"));
  });
  if (stubCall) {
    const on = doc.on;
    const dispatchOnly = on && typeof on === 'object'
      && 'workflow_dispatch' in on
      && !('push' in on) && !('pull_request' in on) && !('pull_request_target' in on);
    if (!dispatchOnly) fail(`W7 ${file} calls a declared stub but is not manual-only`);
  }
}

if (!errors.length) ok(`${files.length} files parse; unique names, permissions, concurrency and timeouts present`);
if (!errors.length) ok(`${usesCount} uses: entries pinned to SHA; 0 moving refs`);

/* ---- coverage: the workflows must use the repository's own gates ---- */
console.log('\nW8  coverage — no parallel definition of green');
const allRuns = runs.map(r => r.cmd).join('\n');
for (const needle of ['pnpm verify', 'pnpm tracer --assert', 'node scripts/validate-workflows.mjs']) {
  if (!allRuns.includes(needle)) fail(`W8 no workflow invokes "${needle}"`);
}
if (!errors.length) ok('verify, tracer assert and workflow self-validation are all invoked');

/* ---- stub inventory is printed, never hidden ---- */
const stubWorkflows = [...parsed.entries()].filter(([, { raw }]) => /DECLARED STUB/.test(raw)).map(([f]) => f);
console.log(`\nW9  ${stubWorkflows.length} workflow(s) call declared stubs and are manual-only: ${stubWorkflows.join(', ')}`);

console.log(`\n${errors.length ? 'RESULT: FAIL' : 'RESULT: PASS'} — ${files.length} workflows, ${usesCount} pinned uses, `
  + `${runs.length} run steps, ${errors.length} error(s). Static validation only; no workflow was executed.`);
if (errors.length) {
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
