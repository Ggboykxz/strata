#!/usr/bin/env node
/**
 * scope-math.mjs — STRATA scope arithmetic and ledger balance
 * Owner: producer (P0-001 / SC-001)
 *
 * Modes
 *   --check                 validate the ledger (zero-sum, schema, phase budgets). Exit 1 on failure.
 *   --report                compute required_variants and months_needed for the slice.
 *   --tier <S0..S4> --report  print the tier's exit evidence and authorization status.
 *
 * Policy (I5, I13): a value that is not measured is printed as NOT COMPUTABLE, never estimated
 * silently. Exit codes: 0 ok · 1 ledger invalid · 2 not computable · 64 bad usage.
 */
import { readFileSync, existsSync } from 'node:fs';

const LEDGER = 'docs/production/SCOPE_LEDGER.yaml';
const MATH = 'docs/production/CONTENT_MATH.yaml';

/* ------------------------------------------------------------------ *
 * YAML subset parser — deliberately strict.
 * Supports exactly: scalars, one-level maps, block sequences of flat maps,
 * inline arrays. Anything else throws. Silent guessing is forbidden.
 * ------------------------------------------------------------------ */
const unquote = (v) => v.replace(/^["']|["']$/g, '');

/** Remove a trailing ` # comment`, but never inside quotes. */
function stripComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
  }
  return s;
}

function parseValue(raw, where) {
  const v = raw.trim();
  if (v === '[]') return [];
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map(s => unquote(s.trim())).filter(s => s !== '');
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (/^".*"$/.test(v) || /^'.*'$/.test(v)) return unquote(v);
  if (/^https?:/.test(v)) return v;
  if (/\s#\s/.test(v) || /\s:/.test(v)) throw new Error(`ambiguous scalar at ${where}: ${JSON.stringify(raw)}`);
  return v;
}

export function parseYamlSubset(text) {
  const raw = text.split('\n');
  const lines = [];
  raw.forEach((l, i) => {
    const clean = stripComment(l).replace(/\s+$/, '');
    if (clean.trim() === '') return;
    lines.push({ text: clean, no: i + 1 });
  });

  const root = {};
  const stack = [{ indent: -1, node: root }];

  for (let i = 0; i < lines.length; i++) {
    const { text: line, no } = lines[i];
    const m = line.match(/^(\s*)(-\s+)?([A-Za-z0-9_.\/-]+):\s*(.*)$/);
    if (!m) throw new Error(`unsupported YAML at line ${no}: ${JSON.stringify(line)}`);
    const indent = m[1].length;
    const isItem = Boolean(m[2]);
    const key = m[3];
    const rest = m[4];

    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    if (!stack.length) throw new Error(`dedent under root at line ${no}`);
    const parent = stack[stack.length - 1].node;

    if (isItem) {
      if (!Array.isArray(parent)) throw new Error(`sequence item inside a map at line ${no}`);
      const obj = {};
      parent.push(obj);
      stack.push({ indent, node: obj });
      if (rest === '') throw new Error(`sequence item must start with key: value at line ${no}`);
      obj[key] = parseValue(rest, `line ${no}`);
      continue;
    }

    if (Array.isArray(parent)) throw new Error(`mapping key inside a sequence at line ${no}`);

    if (rest !== '') {
      parent[key] = parseValue(rest, `line ${no}`);
      continue;
    }

    // container: look ahead to decide map vs sequence
    const next = lines[i + 1];
    const nextIndent = next ? next.text.match(/^(\s*)/)[1].length : -1;
    const nextIsItem = next ? /^\s*-\s+/.test(next.text) : false;
    const node = nextIsItem && nextIndent > indent ? [] : {};
    parent[key] = node;
    stack.push({ indent, node });
  }
  return root;
}

const load = (path) => {
  if (!existsSync(path)) {
    console.error(`MISSING  ${path}`);
    process.exit(1);
  }
  try {
    return parseYamlSubset(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`PARSE ERROR  ${path}: ${e.message}`);
    process.exit(1);
  }
};

/* ------------------------------------------------------------------ */

const REQUIRED_FIELDS = [
  'id', 'title', 'phase', 'tier_required', 'dev_sessions', 'assets_count', 'gpu_hours',
  'server_cost_month', 'bandwidth_kbps_per_player', 'storage_mb', 'ops_burden_hours_month',
  'concept_role', 'gdd_ref', 'status', 'traded_against',
];

function check() {
  const L = load(LEDGER);
  const fail = [];
  const entries = L.entries ?? [];
  const budget = L.budget ?? {};
  const seen = new Set();
  const perPhase = {};

  for (const e of entries) {
    const at = `${e.id ?? '<no id>'}`;
    for (const f of REQUIRED_FIELDS) {
      if (!(f in e)) fail.push(`${at}: missing field "${f}"`);
    }
    if (seen.has(e.id)) fail.push(`${at}: duplicate id`);
    seen.add(e.id);
    if (!['sig', 'amp', 'sup'].includes(e.concept_role)) {
      fail.push(`${at}: concept_role "${e.concept_role}" — dilutive is refused (§1.7)`);
    }
    if (!['proposed', 'accepted', 'deferred', 'cut'].includes(e.status)) {
      fail.push(`${at}: status "${e.status}" not in proposed|accepted|deferred|cut`);
    }
    if (!(e.dev_sessions > 0)) fail.push(`${at}: dev_sessions must be > 0 (a free feature is an unestimated one)`);
    if (typeof e.gdd_ref !== 'string' || e.gdd_ref.trim() === '') fail.push(`${at}: empty gdd_ref`);
    if (e.status === 'accepted') {
      perPhase[e.phase] = (perPhase[e.phase] ?? 0) + Number(e.dev_sessions);
    }
  }

  console.log('phase     accepted   budget   margin');
  for (const p of Object.keys(budget)) {
    const used = perPhase[p] ?? 0;
    const over = used > budget[p];
    console.log(`${p.padEnd(9)} ${String(used).padEnd(10)} ${String(budget[p]).padEnd(8)} ${over ? 'OVER' : budget[p] - used}`);
    if (over) fail.push(`phase ${p}: ${used} sessions against a budget of ${budget[p]} (ledger not balanced)`);
  }
  for (const p of Object.keys(perPhase)) {
    if (!(p in budget)) fail.push(`phase ${p}: has accepted entries but no budget line`);
  }

  const total = Object.values(perPhase).reduce((a, b) => a + b, 0);

  console.log(`\nentries=${entries.length}  accepted_sessions=${total}`);

  // cross-check the published scope document is not lying about the total
  const scope = readFileSync('docs/SCOPE.md', 'utf8');
  const m = scope.match(/\|\s\*\*total to P4\*\*\s\|\s\*\*(\d+)\*\*/);
  if (!m) {
    fail.push('docs/SCOPE.md: total-to-P4 row not found — scope text and ledger can drift');
  } else {
    const declared = Number(m[1]);
    const ledgerTotal = Object.values(budget).reduce((a, b) => a + b, 0);
    if (declared !== ledgerTotal) {
      fail.push(`docs/SCOPE.md declares ${declared} sessions to P4 but the ledger budget sums to ${ledgerTotal}`);
    } else {
      console.log(`budget_to_P4=${ledgerTotal}  (matches docs/SCOPE.md)`);
    }
  }

  if (fail.length) {
    console.error('\nFAIL');
    for (const f of fail) console.error(`  - ${f}`);
    return 1;
  }
  console.log('\nPASS  ledger balanced, schema complete, scope text in sync');
  return 0;
}

function report(tier) {
  if (tier) {
    const TIERS = {
      S0: { players: '1', host: 'local/offline', exit: 'hc_demo_30s green' },
      S1: { players: '2-4', host: 'T0 dev + tunnel', exit: 'NET-GATE signed, 2-client hash equality' },
      S2: { players: '32-64', host: 'T1 free VM', exit: 'AoI + delta snapshots at 64 entities' },
      S3: { players: '200-500', host: 'T2 paid VPS + managed DB', exit: 'funding approval + human on-call' },
      S4: { players: '1000+', host: 'T3 multi-node', exit: 'business plan' },
    };
    const t = TIERS[tier];
    if (!t) {
      console.error(`unknown tier ${tier}`);
      return 64;
    }
    console.log(`tier=${tier}  players=${t.players}  host=${t.host}`);
    console.log(`exit_evidence=${t.exit}`);
    if (tier === 'S3') {
      console.log('status=NOT AUTHORIZED — requires Director funding approval and a human on-call rotation (D82)');
      console.log('cost_model=REFERENCE ONLY; no measured throughput exists, so no honest monthly number can be printed');
    }
    return 0;
  }

  const M = load(MATH);
  const i = M.inputs ?? {};
  const T = M.measured_throughput ?? {};

  const kitVariants = (i.zones ?? 0) * (i.strata ?? 0) * (i.kits ?? 0) * (i.pieces_per_kit ?? 0);
  const propVariants = (i.props ?? 0) * (i.prop_variants ?? 0) * (i.prop_lods ?? 0);
  const charVariants = (i.characters ?? 0) * 5;            // 1 mesh export + 4 textures
  const archVariants = (i.archetypes ?? 0) * 2;            // 1 rig + 1 shared animpack
  const uniquePacks = i.unique_anim_packs ?? 0;
  const total = kitVariants + propVariants + charVariants + archVariants + uniquePacks;

  console.log(`slice=${M.slice}`);
  console.log(`kits        ${kitVariants}`);
  console.log(`props       ${propVariants}`);
  console.log(`characters  ${charVariants}   (animations NOT charged per character, I3)`);
  console.log(`archetypes  ${archVariants}`);
  console.log(`unique      ${uniquePacks}`);
  console.log(`required_variants=${total}`);

  const aps = T.assets_per_session;
  const spw = T.sessions_per_week;
  if (typeof aps !== 'number' || typeof spw !== 'number') {
    console.log('sessions_needed=NOT COMPUTABLE  (assets_per_session is null — measured at AI-001, P3)');
    console.log('months_needed=NOT COMPUTABLE    (sessions_per_week is null)');
    console.log('SCENARIOS (not measurements):');
    for (const a of [6, 12, 24]) {
      const sessions = total / a;
      console.log(`  ${a} assets/session -> ${sessions.toFixed(1)} sessions -> ${(sessions / 3 / 4.3).toFixed(1)} months @ 3/wk`);
    }
    return 2;
  }

  const sessions = total / aps;
  const months = sessions / spw / 4.3;
  console.log(`sessions_needed=${sessions.toFixed(1)}`);
  console.log(`months_needed=${months.toFixed(2)}`);
  const max = M.thresholds?.max_months_to_ship ?? 12;
  if (months > max) {
    console.log(`VERDICT=OVER BUDGET (${months.toFixed(2)} > ${max}) — producer MUST propose cuts at this gate`);
    return 1;
  }
  console.log(`VERDICT=within ${max}-month envelope`);
  return 0;
}

/* ------------------------------------------------------------------ */

if (process.argv[1] && process.argv[1].endsWith('scope-math.mjs')) {
  const argv = process.argv.slice(2);
  const tierIdx = argv.indexOf('--tier');
  const tier = tierIdx >= 0 ? argv[tierIdx + 1] : null;

  if (argv.includes('--check')) process.exit(check());
  else if (argv.includes('--report')) process.exit(report(tier));
  else {
    console.error('usage: scope-math.mjs --check | --report [--tier S0..S4]');
    process.exit(64);
  }
}
