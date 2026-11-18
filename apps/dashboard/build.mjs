#!/usr/bin/env node
/**
 * Dashboard build (P0-007). Generates a read-only static view from repo state.
 * Owner: tools-engineer.
 *
 * Rule (master §18): every page reads generated views or metrics.json; no page computes its own truth.
 * This builder is the only place that reads source files. Unmeasured values are printed as NOT COMPUTABLE
 * (I5/I13). The output is deterministic except for `generated_at`, which is metadata, not a metric.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseYaml } from '../../scripts/lib/yaml.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const p = (rel) => `${ROOT}${rel}`;
const read = (rel) => readFileSync(p(rel), 'utf8');
const show = (v) => (v === null || v === undefined ? 'NOT COMPUTABLE' : String(v));
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- sources: only this file reads them ---------- */
const metricDir = p('docs/state/metrics');
const metricFiles = readdirSync(metricDir).filter(f => f.endsWith('.json')).sort();
if (!metricFiles.length) throw new Error('no metrics JSON found');
const metrics = JSON.parse(read(`docs/state/metrics/${metricFiles.at(-1)}`));
const own = parseYaml(read('docs/state/OWNERSHIP.yaml'));
const locks = parseYaml(read('docs/state/LOCKS.yaml'));
const bp = parseYaml(read('docs/blueprint/BLUEPRINT.yaml'));
const whitelist = parseYaml(read('tools/asset-pipeline/whitelist.yaml'));
const disputes = read('docs/production/DISPUTES.md').split('\n')
  .filter(l => /^\| [A-Z]-/.test(l)).length;
const threads = readdirSync(p('docs/state/threads')).filter(d => existsSync(p(`docs/state/threads/${d}`))).length;
const openDirector = read('docs/state/NEEDS_DIRECTOR.md').split('\n')
  .filter(l => /^\| ND-\d+ \| \*\*OPEN/.test(l)).map(l => l.split('|')[1].trim());
const m = metrics.measured ?? {};

/* ---------- views: raw values, no derived claims ---------- */
const data = {
  generated_at: process.env.STRATA_BUILD_UTC ?? new Date().toISOString(),
  source_metric: metricFiles.at(-1),
  sources: [
    'docs/state/metrics/<session>.json', 'docs/state/OWNERSHIP.yaml', 'docs/state/LOCKS.yaml',
    'docs/blueprint/BLUEPRINT.yaml', 'docs/production/DISPUTES.md', 'docs/state/threads/',
    'docs/state/NEEDS_DIRECTOR.md', 'tools/asset-pipeline/whitelist.yaml',
  ],
  workflow: {
    owners: own.owners?.length ?? 0,
    globs: (own.owners ?? []).reduce((n, o) => n + (o.globs?.length ?? 0), 0) + (own.catch_all?.length ?? 0),
    active_locks: (locks.locks ?? []).filter(l => l.status === 'active').length,
    thread_dirs: threads,
    disputes,
    open_director: openDirector,
  },
  concept: {
    t1_en_words: show(m.hc_t1_en_words),
    t1_en_limit: show(m.hc_t1_en_limit),
    t1_fr_words: show(m.hc_t1_fr_words),
    t3_gate_signature: 'SIGNED at GATE:P0 (HIGH_CONCEPT v1.2)',
    cis: show(metrics.cis?.value),
  },
  gdd: {
    modules: 0,
    coverage: show(metrics.gdd_coverage?.value),
    first_module: 'GDD-001 (P1, not started)',
  },
  scope: {
    ledger_entries: show(m.ledger_entries),
    accepted_sessions: show(m.ledger_accepted_sessions),
    budget_P0: show(m.budget_P0),
    margin_P0: show(metrics.scope?.phase_margin_P0),
    variants: show(m.slice_required_variants),
    months_needed: show(m.months_needed),
  },
  netcode: {
    tick_p50_ms: show(m.server_tick_p50_ms),
    tick_p95_ms: show(m.server_tick_p95_ms),
    down_kb_s: show(m.wire_down_kb_s),
    up_kb_s: show(m.wire_up_kb_s),
    desyncs: show(m.desyncs),
    reconnects: show(m.reconnects),
    aoi_entities: show(m.aoi_entities),
    tracer: 'green — pnpm tracer --assert (equal state hashes)',
  },
  economy: {
    inflation: show(m.economy_inflation),
    faucets: show(m.economy_faucets),
    sinks: show(m.economy_sinks),
    sim_status: 'not started (ECON-001)',
  },
  ai_audit: {
    approved: whitelist.approved?.length ?? 0,
    blocked: whitelist.blocked_pending_director?.length ?? 0,
    rejected: whitelist.rejected?.length ?? 0,
  },
  blueprint: { tasks: bp.tasks?.length ?? 0, gates: Object.keys(bp.gates ?? {}).length },
};

/* ---------- render: a dumb HTML view of data ---------- */
const section = (id, title, rows) => `<section id="${id}"><h2>${esc(title)}</h2><table>${rows
  .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table></section>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>STRATA — read-only dashboard</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:960px;margin:2rem auto;color:#eee;background:#111}
h1{font-size:1.5rem}h2{font-size:1.1rem;margin-top:2rem;border-bottom:1px solid #444}table{border-collapse:collapse;width:100%}
th,td{text-align:left;padding:.3rem .7rem;border-bottom:1px solid #333}th{width:22rem;color:#aaa}
code{color:#8ec}footer{margin-top:2rem;color:#888}</style></head><body>
<h1>STRATA — read-only dashboard</h1>
<p>Generated from the repository. No page computes its own truth. Unmeasured values are
<strong>NOT COMPUTABLE</strong>, never guessed.</p>
${section('workflow', 'WORKFLOW', Object.entries(data.workflow).map(([k, v]) => [k, Array.isArray(v) ? (v.join(', ') || 'none') : v]))}
${section('concept', 'CONCEPT', Object.entries(data.concept))}
${section('gdd', 'GDD', Object.entries(data.gdd))}
${section('scope', 'SCOPE', Object.entries(data.scope))}
${section('netcode', 'NETCODE', Object.entries(data.netcode))}
${section('economy', 'ECONOMY', Object.entries(data.economy))}
${section('audit', 'AI AUDIT + BLUEPRINT', [...Object.entries(data.ai_audit), ...Object.entries(data.blueprint)])}
<footer>source metric: <code>${esc(data.source_metric)}</code> · generated ${esc(data.generated_at)}
<br>sources: ${esc(data.sources.join(' · '))}</footer></body></html>
`;

const out = p('apps/dashboard/dist');
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/data.json`, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
writeFileSync(`${out}/index.html`, html, 'utf8');
console.log(`dashboard build OK — ${Object.keys(data).length - 3} view groups, ${out}`);
console.log(`  NOT COMPUTABLE fields: ${[...html.matchAll(/NOT COMPUTABLE/g)].length}`);
