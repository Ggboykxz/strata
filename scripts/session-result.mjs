#!/usr/bin/env node
/**
 * session-result.mjs — generates the master §20 Session Result from metrics.json (D146).
 * Owner: orchestrator (A0002 code exception). No number is composed from memory: every value is read
 * from the chosen metrics file, including the structured `result` block. A missing source fails closed.
 *
 * Usage: node scripts/session-result.mjs [--metrics <path>] [--format short|full] [--out <path>]
 * Exit 0 generated · 1 source missing or invalid.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) fail(`${name} needs a value`);
  return value;
};

function fail(message) {
  console.error(`session-result: ${message}`);
  process.exit(1);
}

const format = option('--format', 'short');
if (format !== 'short' && format !== 'full') fail(`--format must be short or full, got ${format}`);

let metricsPath = option('--metrics', null);
if (!metricsPath) {
  const dir = 'docs/state/metrics';
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  if (!files.length) fail(`no metrics JSON in ${dir}`);
  metricsPath = `${dir}/${files.at(-1)}`;
}
if (!existsSync(metricsPath)) fail(`metrics file not found: ${metricsPath}`);

let metrics;
try {
  metrics = JSON.parse(readFileSync(metricsPath, 'utf8'));
} catch (e) {
  fail(`invalid JSON in ${metricsPath}: ${String(e.message)}`);
}

const where = `in ${metricsPath}`;
const text = (value, field) => {
  if (typeof value !== 'string' || value.length === 0) fail(`missing or empty ${field} ${where}`);
  return value;
};
const array = (value, field) => {
  if (!Array.isArray(value) || value.length === 0) fail(`missing or empty ${field} ${where}`);
  return value;
};
const numeric = (value, field) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`missing numeric ${field} ${where}`);
  return value;
};
const na = (value) => (value === null || value === undefined || value === '' ? 'NOT COMPUTABLE' : String(value));

const r = metrics.result;
if (!r || typeof r !== 'object') fail(`missing "result" block ${where}`);
text(metrics.session, 'session');
text(metrics.branch, 'branch');
const phase = text(r.phase, 'result.phase');
const status = text(r.status, 'result.status');
const tier = metrics.tier;
if (!tier) fail(`missing tier ${where}`);
text(tier.current, 'tier.current');
text(tier.authorized, 'tier.authorized');

const tasks = array(metrics.tasks, 'tasks').map((task) => task.id).join(', ');
const acceptance = array(metrics.acceptance, 'acceptance');
const green = acceptance.filter((a) => a.exit === 0).length;
const red = acceptance.length - green;
const redList = acceptance.filter((a) => a.exit !== 0)
  .map((a) => `${a.cmd}: ${a.exit}`).join('; ');

const evidenceDirs = array(r.evidence?.dirs, 'result.evidence.dirs');
const evidenceText = evidenceDirs
  .map((d) => `${d.dir} (${numeric(d.logs, 'result.evidence.dirs[].logs')} logs, ${text(d.branch, 'result.evidence.dirs[].branch')})`)
  .join(' + ');

const commits = array(r.commits, 'result.commits');
const prs = array(r.prs, 'result.prs')
  .map((pr) => `#${numeric(pr.number, 'result.prs[].number')} ${text(pr.url, 'result.prs[].url')} (${text(pr.role, 'result.prs[].role')})`)
  .join(' · ');
const reviewer = text(r.reviewer, 'result.reviewer');

const locks = r.locks;
if (!locks) fail(`missing result.locks ${where}`);
const lockText = `${numeric(locks.acquired, 'result.locks.acquired')} acquired / ${numeric(locks.released, 'result.locks.released')} released on ${text(locks.branch, 'result.locks.branch')}`;
const threads = array(r.threads, 'result.threads').join(', ');
const disputes = numeric(r.disputes, 'result.disputes');

const cis = metrics.cis;
if (!cis) fail(`missing cis ${where}`);
const cisText = cis.value === null ? `NOT COMPUTABLE (${text(cis.reason, 'cis.reason')})` : numeric(cis.value, 'cis.value');
const coverage = numeric(metrics.gdd_coverage?.value, 'gdd_coverage.value');
const scope = metrics.scope;
if (!scope) fail(`missing scope ${where}`);
const ledger = numeric(scope.ledger_entries, 'scope.ledger_entries');
const balanced = scope.balanced === true ? 'balanced' : 'UNBALANCED';

const netgate = metrics.netgate;
if (!netgate) fail(`missing netgate ${where}`);
const measured = metrics.measured;
if (!measured) fail(`missing measured ${where}`);

const lines = [
  '# Session Result',
  `- Branch / Task(s) / Phase / Tier (current, authorized): ${metrics.branch} · ${tasks} · ${phase} · ${tier.current}, ${tier.authorized}`,
  `- Status: ${status}`,
  `- Acceptance commands run + results (exit codes): ${acceptance.length} logged · ${green} exit 0 · ${red} non-zero (${redList})`,
  `- Evidence: ${evidenceText}; Metrics: ${metricsPath}`,
  `- Commits / PR / reviewer assigned: ${commits.join(', ')}; PR ${prs}; ${reviewer}`,
  `- Locks acquired/released; threads/decisions/disputes: ${lockText}; threads ${threads}; disputes ${disputes}`,
  `- CIS / GDD coverage / scope balance (before -> after): CIS ${cisText} · coverage ${Math.round(coverage * 100)}% · ledger ${ledger} ${balanced}`,
  `- NET-GATE status + netcode metrics (tick p95, bandwidth p95, desyncs, dupes): ${text(netgate.status, 'netgate.status')} / art_allowed ${String(netgate.art_allowed)} · p95 ${na(measured.server_tick_p95_ms)} · down ${na(measured.wire_down_kb_s)} KB/s · desyncs ${na(measured.desyncs)} · dupes ${na(measured.duplicate_intents)}`,
  `- Models/tools used + audit ids: ${text(r.models, 'result.models')} · ${array(r.audit_ids, 'result.audit_ids').join(', ')}`,
  `- What this enables in another era, for other players: ${text(r.enables, 'result.enables')}`,
  `- Next task / Blockers / Director questions (+ docs/state/NEXT_SESSION.md if written): ${text(r.next, 'result.next')}; blockers ${array(r.blockers, 'result.blockers').join(' | ')}; questions ${array(r.director_questions, 'result.director_questions').join(' | ')}; ${text(r.next_session_file, 'result.next_session_file')}`,
];

if (format === 'full') {
  const f = r.full;
  if (!f || typeof f !== 'object') fail(`missing result.full ${where}`);
  lines.push(
    `- Handoffs sent/received/accepted: ${text(f.handoffs, 'result.full.handoffs')}`,
    `- Concept roles executed + signature ratio: ${text(f.concept_roles, 'result.full.concept_roles')}`,
    `- GDD modules version-bumped: ${array(f.gdd_version_bumps, 'result.full.gdd_version_bumps').join(' · ')}`,
    `- Scope-ledger delta (cost / traded against): ${text(f.scope_ledger_delta, 'result.full.scope_ledger_delta')}`,
    `- Content math (needed / measured throughput / projected months): ${text(f.content_math, 'result.full.content_math')}`,
    `- Prototype reports produced: ${array(f.prototype_reports, 'result.full.prototype_reports').join(' · ')}`,
    `- Economy metrics: ${text(f.economy_metrics, 'result.full.economy_metrics')}`,
    `- Anim architecture checks: ${text(f.anim_checks, 'result.full.anim_checks')}`,
    `- World checks: ${text(f.world_checks, 'result.full.world_checks')}`,
    `- Files changed grouped by owner: ${text(f.files_by_owner, 'result.full.files_by_owner')}`,
  );
}

const output = `${lines.join('\n')}\n`;
const out = option('--out', null);
if (out) writeFileSync(out, output, 'utf8');
else process.stdout.write(output);
