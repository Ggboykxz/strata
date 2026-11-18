#!/usr/bin/env node
/**
 * validate-netgate.mjs — validates the HONESTY and evidence completeness of the NET-GATE dossier (NG-001).
 * Owner: netcode-engineer. Replaced a declared P0-002 stub that exited 1 by design (I5/B7).
 *
 * Two distinct questions, deliberately separate:
 *   - `node scripts/validate-netgate.mjs`            -> dossier integrity, including an honest risk-accepted signature
 *   - `node scripts/validate-netgate.mjs --assert-ready` -> gate readiness (exit 1 while criteria are unmet today)
 *
 * A passing integrity check NEVER means NET-GATE passed. Only the Director can sign (D136). No assertion is
 * weakened to make readiness pass.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const DOSSIER = 'docs/qa/prototypes/NET_GATE.md';
const THREAT = 'docs/legal/THREAT_MODEL.md';
const METRICS_DIR = 'docs/state/metrics';

const EXPECTED = [
  'authoritative-server',
  'four-client-matrix',
  'soak-30min',
  'desync-correction',
  'server-tick-p95',
  'wire-budget',
  'reconnect-restore',
  'crash-restore-rpo',
  'ledger-fuzz',
  'threat-and-anticheat',
];
const STATUSES = new Set(['met', 'partial', 'not-measured', 'failing']);
const problems = [];
const fail = (message) => { problems.push(message); };
const unquote = (value) => value.replace(/^`|`$/g, '').trim();

if (!existsSync(DOSSIER)) {
  console.error('validate-netgate: dossier missing — fail closed');
  process.exit(1);
}
const dossier = readFileSync(DOSSIER, 'utf8');
const threat = existsSync(THREAT) ? readFileSync(THREAT, 'utf8') : '';

// 1. Header must say unsigned and not ready.
if (!dossier.includes('SIGNED — RISK ACCEPTED') || !dossier.includes('8/10 criteria unmet')) {
  fail('dossier header must state SIGNED — RISK ACCEPTED with 8/10 criteria unmet');
}
if (!dossier.includes('"je signe tout"')) {
  fail('Director statement must be transcribed verbatim');
}
if (!dossier.includes('does **not** mean NET-GATE passed')) {
  fail('dossier must warn that validator exit 0 is not a gate pass');
}

// 2. Every master §5.2 criterion is present with an honest status and a cited source.
const rows = [];
for (const line of dossier.split('\n')) {
  if (!line.startsWith('| ')) continue;
  const columns = line.slice(1, -1).split('|').map((value) => value.trim());
  if (EXPECTED.includes(columns[0])) {
    rows.push({
      id: columns[0],
      status: columns[1],
      command: unquote(columns[2] ?? ''),
      exit: columns[3],
      log: unquote(columns[4] ?? ''),
      note: columns[5] ?? '',
    });
  }
}
for (const id of EXPECTED) {
  const row = rows.find((candidate) => candidate.id === id);
  if (!row) { fail(`missing criterion: ${id}`); continue; }
  if (!STATUSES.has(row.status)) { fail(`${id}: unknown status ${row.status}`); continue; }
  if (row.status === 'not-measured') {
    if (row.command !== 'NOT COMPUTABLE' || row.log !== 'NOT COMPUTABLE') {
      fail(`${id}: not-measured must cite NOT COMPUTABLE, not a fabricated command or log`);
    }
    continue;
  }
  if (!existsSync(row.log)) { fail(`${id}: evidence log missing: ${row.log}`); continue; }
  const log = readFileSync(row.log, 'utf8');
  if (!log.includes(`EXIT=${row.exit}`)) fail(`${id}: log does not contain EXIT=${row.exit}`);
  if (row.command !== 'NOT COMPUTABLE' && !log.includes(row.command)) {
    fail(`${id}: log does not name the cited command`);
  }
}
if (rows.length !== EXPECTED.length) fail(`criteria table has ${rows.length} rows, expected ${EXPECTED.length}`);

// 3. The dossier must not present a failing budget as met.
const wire = rows.find((row) => row.id === 'wire-budget');
if (!wire || wire.status !== 'failing' || !wire.note.includes('3.79')) {
  fail('wire budget must be reported as failing at 3.79x, not averaged away');
}

// 4. All seven residual risks from the threat model must be carried verbatim.
const risks = [...threat.matchAll(/^\d+\. \*\*([^*]+?)\.\*\*/gm)].map((match) => match[1]);
if (risks.length !== 7) fail(`threat model has ${risks.length} risks, expected 7`);
for (const risk of risks) if (!dossier.includes(risk)) fail(`dossier omits residual risk: ${risk}`);

// 5. No agent may sign. The Director line must remain blank.
const signature = dossier.split('## 6. Signature')[1] ?? '';
for (const agent of [
  'orchestrator', 'producer', 'netcode-engineer', 'gameplay-engineer',
  'backend-engineer', 'security-auditor', 'qa-engineer', 'tools-engineer',
]) {
  if (signature.toLowerCase().includes(agent)) fail(`agent signature found in gate dossier: ${agent}`);
}
if (!signature.includes('status: SIGNED — RISK ACCEPTED')) fail('signature block must state status: SIGNED — RISK ACCEPTED');
if (!signature.includes('"je signe tout"')) fail('signature block must carry the Director statement verbatim');
if (!signature.includes('criteria_unmet: 8/10')) fail('signature block must restate the 8 unmet criteria');

// 6. Metrics must still say unpassed with art closed and no fake tick p95.
const metricFiles = readdirSync(METRICS_DIR).filter((file) => file.endsWith('.json')).sort();
if (!metricFiles.length) {
  fail('no metrics file');
} else {
  const metrics = JSON.parse(readFileSync(`${METRICS_DIR}/${metricFiles.at(-1)}`, 'utf8'));
  const gate = metrics.netgate ?? {};
  if (gate.status !== 'signed-with-risk') fail('metrics netgate.status must be signed-with-risk after the Director signature');
  if (gate.art_allowed !== true) fail('metrics art_allowed must reflect the Director signature');
  if (gate.risk_accepted !== true || gate.criteria_unmet !== 8) {
    fail('signature must be annotated with risk_accepted: true and criteria_unmet: 8');
  }
  const p95 = metrics.measured?.server_tick_p95_ms;
  if (p95 !== null && p95 !== undefined) fail('server_tick_p95_ms must stay NOT COMPUTABLE until measured under load');
}

if (problems.length) {
  console.error(`validate-netgate — FAIL (${problems.length})`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const notMet = rows.filter((row) => row.status !== 'met');
console.log('validate-netgate — PASS — dossier honest, evidence-complete, signature recorded as risk-accepted');
console.log(`NET-GATE readiness: NOT READY — ${notMet.length}/${rows.length} criteria not met`);
for (const row of notMet) console.log(`  - ${row.id}: ${row.status}`);

if (process.argv.includes('--assert-ready')) {
  console.error(`validate-netgate --assert-ready — FAIL — ${notMet.length} criteria unmet; the recorded signature is a risk acceptance, not evidence of readiness.`);
  process.exit(1);
}
