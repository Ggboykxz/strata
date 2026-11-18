#!/usr/bin/env node
/**
 * validate-prompt-drift.mjs — CI gate for master-prompt drift
 * Owner: orchestrator (P0-001). Acceptance: `node scripts/validate-prompt-drift.mjs`
 *
 * The Constitution is materialized from the archived master prompt. This validator answers one question:
 * "does the repo still match the prompt it claims to be built from?" It fails on:
 *   - a master prompt that is missing, truncated, oversized, or whose hash moved;
 *   - an archive that is not byte-identical to the master;
 *   - a PROMPT.lock that is missing, malformed, or whose hash disagrees;
 *   - an invariant (I1..I15) of §0.3 that the Constitution no longer quotes verbatim;
 *   - a locked decision (D79..D155) absent from the Constitution;
 *   - a Constitution that does not declare the sections it materialized.
 *
 * A check that cannot run FAILS (I5). Divergence is allowed only when declared in PROMPT.lock `amended:`
 * with a Director-signed ADR id, in which case that single invariant is exempted from the verbatim test.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const MASTER = 'tools/colab/prompts/SESSION_MASTER.md';
const ARCHIVE = 'docs/archive/SESSION_MASTER_v8.1.md';
const LOCK = 'docs/state/PROMPT.lock';
const CONSTITUTION = 'docs/CONSTITUTION.md';
const SENTINEL = '<<<STRATA_END v8.1>>>';
const SIZE_CAP = 100000;

const fail = [];
const pass = (m) => console.log(`PASS  ${m}`);
const bad = (m) => { console.log(`FAIL  ${m}`); fail.push(m); };

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* ---------- 1. PROMPT.lock ---------- */
if (!existsSync(LOCK)) {
  bad(`missing ${LOCK}`);
}
let lock = {};
if (existsSync(LOCK)) {
  const raw = readFileSync(LOCK, 'utf8');
  for (const line of raw.split('\n')) {
    if (/^\s*#/.test(line)) continue;
    const m = /^\s+([a-z0-9_]+):\s*(.+?)\s*$/.exec(line);
    if (m) lock[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  const top = /^version:\s*(\S+)/m.exec(raw);
  if (top) lock.version = top[1];
  for (const k of ['path', 'archive', 'sha256', 'sentinel', 'bytes']) {
    if (!lock[k]) bad(`${LOCK} missing field: ${k}`);
  }
  if (lock.sha256 && !/^[0-9a-f]{64}$/.test(lock.sha256)) bad(`${LOCK} sha256 is not 64 lowercase hex chars`);
  if (Object.keys(lock).length && !fail.length) pass(`${LOCK} parsed (version ${lock.version ?? '?'})`);

  // amended: [] or a list of ids
  const amendedBlock = /^amended:\s*\[(.*?)\]/m.exec(raw);
  const amended = amendedBlock && amendedBlock[1].trim()
    ? amendedBlock[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    : [];
  lock.amended = amended;
  if (amended.length) {
    if (!existsSync(CONSTITUTION) || !/^##\s*AMENDMENTS/m.test(readFileSync(CONSTITUTION, 'utf8'))) {
      bad(`${LOCK} declares amendments but ${CONSTITUTION} has no "## AMENDMENTS" section`);
    } else {
      for (const id of amended) {
        if (!/^ADR-/i.test(id) && !/^D\d+$/.test(id) && !/^I\d+$/.test(id)) bad(`amended entry is not an invariant/decision/ADR id: ${id}`);
      }
      pass(`amendments declared: ${amended.join(', ')}`);
    }
  }
}

/* ---------- 2. master prompt ---------- */
if (!existsSync(MASTER)) {
  bad(`missing ${MASTER} (the sealed prompt cannot be verified)`);
} else {
  const buf = readFileSync(MASTER);
  const text = buf.toString('utf8');
  const lines = text.split('\n');
  const last = lines[lines.length - 1] === '' ? lines[lines.length - 2] : lines[lines.length - 1];

  if (last?.trim() === SENTINEL) pass(`${MASTER} ends with the sentinel`);
  else bad(`${MASTER} last line is not ${SENTINEL} — prompt truncated or edited`);

  if (buf.length < SIZE_CAP) pass(`${MASTER} is ${buf.length} bytes (< ${SIZE_CAP})`);
  else bad(`${MASTER} is ${buf.length} bytes — over the ${SIZE_CAP}-byte argument cap`);

  if (lock.bytes && String(buf.length) === String(lock.bytes)) pass(`${MASTER} size matches PROMPT.lock`);
  else if (lock.bytes) bad(`${MASTER} size ${buf.length} != locked ${lock.bytes}`);

  const h = sha256(buf);
  if (lock.sha256 && h === lock.sha256) pass(`${MASTER} sha256 matches PROMPT.lock`);
  else if (lock.sha256) bad(`${MASTER} sha256 ${h} != locked ${lock.sha256}`);
}

/* ---------- 3. archive ---------- */
if (!existsSync(ARCHIVE)) {
  bad(`missing ${ARCHIVE}`);
} else {
  const h = sha256(readFileSync(ARCHIVE));
  if (lock.sha256 && h === lock.sha256) pass(`${ARCHIVE} is byte-identical to the sealed master`);
  else bad(`${ARCHIVE} sha256 ${h} != locked ${lock.sha256 ?? '(no lock)'}`);
}

/* ---------- 4. Constitution presence + declared provenance ---------- */
if (!existsSync(CONSTITUTION)) {
  bad(`missing ${CONSTITUTION}`);
} else {
  const constitution = readFileSync(CONSTITUTION, 'utf8');
  const cn = norm(constitution);

  for (const sec of ['0', '10', '13', '19', '20']) {
    const re = new RegExp(`§\\s*${sec}\\b|SECTION\\s+${sec}\\b`, 'i');
    if (re.test(constitution)) pass(`CONSTITUTION.md declares materialized section §${sec}`);
    else bad(`CONSTITUTION.md does not declare materialized section §${sec}`);
  }

  if (/(SESSION_MASTER_v8\.1\.md)/.test(constitution)) pass('CONSTITUTION.md cites the archived master');
  else bad('CONSTITUTION.md does not cite docs/archive/SESSION_MASTER_v8.1.md');

  if (/AUTHORITY ORDER/i.test(constitution)) pass('CONSTITUTION.md restates the authority order');
  else bad('CONSTITUTION.md does not restate the authority order');

  /* ---------- 5. invariants quoted verbatim ---------- */
  if (existsSync(ARCHIVE)) {
    const archive = readFileSync(ARCHIVE, 'utf8');
    const start = archive.indexOf('0.3 FIFTEEN INVARIANTS');
    const end = archive.indexOf('\n0.4 STOP WHEN');
    if (start < 0 || end < 0) {
      bad('cannot locate §0.3 in the archive — the invariant drift check cannot run');
    } else {
      const block = archive.slice(start, end);
      const inv = [];
      let cur = null;
      for (const line of block.split('\n')) {
        const head = /^ {2}I(\d+) +(.+)$/.exec(line);
        if (head) {
          if (cur) inv.push(cur);
          cur = { id: `I${head[1]}`, text: head[2] };
        } else if (cur && /^ {4,}\S/.test(line)) {
          cur.text += ` ${line.trim()}`;
        }
      }
      if (cur) inv.push(cur);

      if (inv.length === 15) pass('archive §0.3 contains 15 invariants');
      else bad(`archive §0.3 contains ${inv.length} invariants, expected 15`);

      let quoted = 0;
      for (const { id, text } of inv) {
        if ((lock.amended ?? []).includes(id)) { pass(`${id} exempted by a declared amendment`); continue; }
        if (cn.includes(norm(text))) quoted++;
        else bad(`${id} in CONSTITUTION.md is no longer verbatim (drift)`);
      }
      if (quoted === inv.length) pass(`all ${quoted} invariants are quoted verbatim in CONSTITUTION.md`);
    }

    /* ---------- 6. locked decisions quoted verbatim ---------- */
    const constStart = archive.indexOf('13. CONSTITUTION — LOCKED DECISIONS');
    const constEnd = archive.indexOf('\n14. NARRATIVE SEED');
    if (constStart < 0 || constEnd < 0) {
      bad('cannot locate §13 in the archive — the decision drift check cannot run');
    } else {
      const decisions = archive.slice(constStart, constEnd);
      // A definition is anchored at a line start or after a "|" separator: "D79 zero-sum ledger | D80 ...".
      const defAt = (n) => new RegExp(`(?:^|[\\n|])\\s*D${n}\\s`, 'm').exec(decisions);
      const ids = [...new Set([...decisions.matchAll(/(?:^|[\n|])\s*D(\d{1,3})\s/g)].map(m => Number(m[1])))]
        .filter(n => n >= 79)
        .sort((a, b) => a - b);

      if (ids.length < 70) {
        bad(`archive §13 exposes only ${ids.length} decision definitions (>= D79), expected >= 70`);
      } else {
        const missing = [];
        const altered = [];
        for (const n of ids) {
          if ((lock.amended ?? []).includes(`D${n}`)) continue;
          const m = defAt(n);
          if (!m) { missing.push(`D${n}`); continue; }
          const from = m.index + m[0].length;
          const rest = decisions.slice(from);
          const next = new RegExp(`(?:^|[\\n|])\\s*D${n + 1}\\s`, 'm').exec(rest);
          const body = (next ? rest.slice(0, next.index) : rest).replace(/\s+$/, '');
          if (body.length < 3) { missing.push(`D${n}`); continue; }
          if (!cn.includes(norm(`D${n} ${body}`))) altered.push(`D${n}`);
        }
        if (!defAt(79)) missing.push('D79');
        if (missing.length) bad(`CONSTITUTION.md omits locked decisions: ${missing.join(', ')}`);
        if (altered.length) bad(`CONSTITUTION.md alters locked decisions (drift): ${altered.join(', ')}`);
        if (!missing.length && !altered.length) {
          pass(`all ${ids.length} locked decisions (D${ids[0]}..D${ids[ids.length - 1]}) are quoted verbatim in CONSTITUTION.md`);
        }
      }
    }
  }
}

/* ---------- verdict ---------- */
if (fail.length) {
  console.error(`\nRESULT: FAIL (${fail.length} check${fail.length > 1 ? 's' : ''}) — prompt drift is a P1 defect (D139).`);
  process.exit(1);
}
console.log('\nRESULT: PASS — the repository matches its sealed master prompt.');
