#!/usr/bin/env node
/**
 * scripts/drill-resume.mjs — replay the master §17 session-start protocol (P0-005).
 * Owner: tools-engineer.
 *
 * `pnpm`-free and read-only: it must be safe to run from a dead session's surviving shell. In --dry mode
 * it performs every prerequisite check and prints the resume plan; it writes nothing. An absent heartbeat
 * is a warning (the file is gitignored and legitimately missing on a fresh clone); a corrupt heartbeat is
 * an error, because a lying checkpoint is worse than none.
 *
 * Exit 0 all prerequisites readable · 1 any failure · 64 bad usage.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseYaml } from './lib/yaml.mjs';

if (!process.argv.includes('--dry')) {
  console.error('usage: node scripts/drill-resume.mjs --dry');
  process.exit(64);
}

const errors = [];
const warnings = [];
const check = (label, fn) => {
  try {
    const r = fn();
    if (r === true || r === undefined) console.log(`PASS  ${label}`);
    else if (typeof r === 'string') { console.log(`WARN  ${label} — ${r}`); warnings.push(label); }
    else { console.log(`FAIL  ${label} — ${r.reason}`); errors.push(label); }
  } catch (e) {
    console.log(`FAIL  ${label} — ${e.message}`);
    errors.push(label);
  }
};
const bad = (reason) => ({ reason });
const git = (args) => spawnSync('git', args, { encoding: 'utf8', shell: false });

console.log('RESUME DRILL (--dry, read-only)');
console.log('\n§17 session start');

check('repository root', () => {
  if (!existsSync('.git') || !existsSync('docs/CONSTITUTION.md')) return bad('not a STRATA repository root');
  return true;
});
check('pwd', () => console.log(`      ${process.cwd()}`));
check('git status --short', () => {
  const r = git(['status', '--short']);
  if (r.status !== 0) return bad(r.stderr?.trim() ?? 'git status failed');
  console.log(`      ${r.stdout.trim() ? `${r.stdout.trim().split('\n').length} change(s)` : 'clean'}`);
  return true;
});
let branch = '';
check('git branch --show-current', () => {
  const r = git(['branch', '--show-current']);
  if (r.status !== 0) return bad('cannot read branch');
  branch = r.stdout.trim();
  if (!branch && process.env.GITHUB_REF_NAME) {
    branch = process.env.GITHUB_REF_NAME;
    console.log(`      ${branch} (from GITHUB_REF_NAME; Actions uses a detached HEAD)`);
    return true;
  }
  if (!branch) return bad('detached HEAD — no branch to resume');
  console.log(`      ${branch}`);
  return true;
});
check('git log --oneline -15', () => {
  const r = git(['log', '--oneline', '-15']);
  if (r.status !== 0 || !r.stdout.trim()) return bad('no commit history');
  console.log(`      ${r.stdout.trim().split('\n').length} commit(s) visible`);
  return true;
});

console.log('\nstate files (I15)');
let sessionText = '';
let nextText = '';
let sessionId = '';
for (const file of ['docs/state/SESSION.md', 'docs/state/NEXT_SESSION.md', 'docs/state/NEEDS_DIRECTOR.md']) {
  check(`${file} present and non-empty`, () => {
    if (!existsSync(file)) return bad('missing');
    const text = readFileSync(file, 'utf8');
    if (!text.trim()) return bad('empty');
    if (file === 'docs/state/SESSION.md') sessionText = text;
    if (file === 'docs/state/NEXT_SESSION.md') nextText = text;
    return true;
  });
}
check('session metrics file', () => {
  sessionId = /`(\d{4}-\d{2}-\d{2}-s\d+)`/.exec(sessionText)?.[1] ?? '';
  if (!sessionId) return bad('SESSION.md has no session id');
  const p = `docs/state/metrics/${sessionId}.json`;
  if (!existsSync(p)) return bad(`missing ${p}`);
  JSON.parse(readFileSync(p, 'utf8'));
  console.log(`      ${p}`);
  return true;
});
check('heartbeat.json', () => {
  const p = 'docs/state/heartbeat.json';
  if (!existsSync(p)) return 'absent (gitignored; expected on a fresh clone)';
  const h = JSON.parse(readFileSync(p, 'utf8'));
  for (const k of ['utc', 'session', 'task', 'branch', 'locks']) {
    if (!(k in h)) return bad(`missing field ${k}`);
  }
  return true;
});
check('LOCKS.yaml schema and expiry', () => {
  const doc = parseYaml(readFileSync('docs/state/LOCKS.yaml', 'utf8'));
  const locks = Array.isArray(doc.locks) ? doc.locks : [];
  const now = Date.now();
  const expired = locks.filter(l => l.status === 'active' && Number.isFinite(Date.parse(l.expires_at))
    && Date.parse(l.expires_at) <= now);
  if (expired.length) return bad(`${expired.length} active lock(s) expired: ${expired.map(l => l.path_glob).join(', ')}`);
  console.log(`      ${locks.length} entr(y|ies), 0 expired active lock(s)`);
  return true;
});

console.log('\nresume plan');
const next = /\| next task \| \*\*(.+?)\*\*/.exec(nextText)?.[1] ?? '(unreadable)';
console.log(`  session   ${sessionId || '(unreadable)'}`);
console.log(`  branch    ${branch || '(detached)'}`);
console.log(`  next      ${next}`);
console.log('  open Director items:');
for (const line of readFileSync('docs/state/NEEDS_DIRECTOR.md', 'utf8').split('\n')) {
  if (/^\| ND-\d+ \| \*\*OPEN/.test(line)) console.log(`    ${line.split('|')[1].trim()}`);
}
console.log('  protocol: pwd → git status → branch → git log -15 → recover WIP →');
console.log('            pnpm install --frozen-lockfile → pnpm verify → pnpm tracer --assert → one handoff → one task');

console.log(`\nRESULT: ${errors.length ? 'FAIL' : 'PASS'} — ${errors.length} failure(s), ${warnings.length} warning(s). Read-only drill; nothing written.`);
if (errors.length) {
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
