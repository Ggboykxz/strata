// One-off P0-004 reconciliation: regenerate 27 workflows with master §18 names. Not committed.
import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
const ROOT = process.cwd() + '/.github/workflows';
const SHA = {
  checkout: '11d5960a326750d5838078e36cf38b85af677262', // v4
  setupNode: '49933ea5288caeca8642d1e84afbd3f7d6820020', // v4
  pnpm: 'b906affcce14559ad1aafd4ab0e942779e9f58b1', // v4
  upload: 'ea165f8d65b6e75b540449e92b4886f43607fa02', // v4
  codeqlInit: '9418214df1f2c4b8128c770156c409013b07d6b9', // v3
};
const uses = {
  checkout: `      - uses: actions/checkout@${SHA.checkout} # v4`,
  setupNode: `      - uses: actions/setup-node@${SHA.setupNode} # v4`,
  pnpm: `      - uses: pnpm/action-setup@${SHA.pnpm} # v4`,
  upload: `      - uses: actions/upload-artifact@${SHA.upload} # v4`,
  codeqlInit: `      - uses: github/codeql-action/init@${SHA.codeqlInit} # v3`,
  codeqlAnalyze: `      - uses: github/codeql-action/analyze@${SHA.codeqlInit} # v3`,
};
const setup = [
  uses.checkout,
  uses.pnpm,
  `${uses.setupNode}\n        with:\n          node-version: 22.23.4\n          cache: pnpm`,
  '      - run: pnpm install --frozen-lockfile',
].join('\n');
const head = (name, trigger, note = '') => `${note ? `# ${note}\n` : ''}name: ${name}\non:${trigger}\npermissions: { contents: read }\nconcurrency:\n  group: ${name.replace(/[^A-Za-z0-9]+/g, '-')}-\${{ github.ref }}\n  cancel-in-progress: true\n`;
const job = (id, title, steps, timeout = 15) => `jobs:\n  ${id}:\n    name: ${title}\n    runs-on: ubuntu-latest\n    timeout-minutes: ${timeout}\n    steps:\n${steps}\n`;
const MAIN = ' { push: { branches: [main] }, pull_request: }';
const MANUAL = '\n  workflow_dispatch:';
const cmds = (...lines) => lines.map(l => `      - run: ${l}`).join('\n');

const files = new Map();
const add = (name, body) => {
  if (files.has(name)) throw new Error(`duplicate ${name}`);
  files.set(name, body);
};

// 1 CI: the single definition of green.
add('ci.yml', head('ci', MAIN, 'The single definition of green: pnpm verify runs every enabled gate step.')
  + job('verify', 'pnpm verify', `${setup}\n      - run: pnpm verify\n${uses.upload}\n        with:\n          name: verify-log\n          path: docs/state/evidence/\n`, 25));
// 2 OpenCode agent/skill tree.
add('opencode.yml', head('opencode', MAIN) + job('agents', '32 agents and 51 skills', `${uses.checkout}
${cmds('test -d .opencode/agents', 'test "$(ls .opencode/agents | wc -l)" -eq 32', 'test "$(ls .opencode/skills | wc -l)" -eq 51')}`));
// 3 Workflow OS self-enforcement.
add('workflow.yml', head('workflow', MAIN, 'Master §18: reject out-of-domain edits, missing locks, handoffs without acceptance, PRs without a distinct reviewer, unresolved VETO, >3 arbitration rounds, stub acc scripts.')
  + job('validate', 'workflow OS', `${setup}\n${cmds('node scripts/validate-workflows.mjs', 'node scripts/validate-ownership.mjs', 'node scripts/validate-locks.mjs')}`));
// 4 Concept and sealed prompt.
add('high-concept.yml', head('high-concept', MAIN) + job('concept', 'T1 T3 and prompt seal', `${setup}\n${cmds('node scripts/concept-integrity.mjs --check', 'node scripts/validate-prompt-drift.mjs')}`));
// 5 GDD stub.
add('gdd.yml', head('gdd', MANUAL, 'DECLARED STUB validate-gdd.mjs — manual until GDD-001 implements it.')
  + job('validate', 'GDD modules', `${setup}\n${cmds('node scripts/validate-gdd.mjs')}`, 20));
// 6 Scope.
add('scope.yml', head('scope', MAIN) + job('ledger', 'zero-sum ledger', `${setup}\n${cmds('node scripts/validate-scope.mjs', 'node scripts/scope-math.mjs --check')}`));
// 7 Netcode: the real hash-equality assert.
add('netcode.yml', head('netcode', MAIN, 'Replays the tracer on Node and requires equal hashes; no wall clock inside packages/core.')
  + job('tracer', 'equal state hashes', `${setup}\n${cmds('pnpm tracer --assert')}`, 25));
// 8 Economy — not started.
add('economy.yml', head('economy', MANUAL, 'ECON-001 not started; no validator to call.')
  + job('placeholder', 'no economy sim yet', `${uses.checkout}\n${cmds('echo "ECONOMY - NOT COMPUTABLE until ECON-001"')}`));
// 9 Prototype evidence — later gates.
add('prototype.yml', head('prototype', MANUAL, 'Prototype validators arrive with PR-S1..PR-S8.')
  + job('placeholder', 'no prototype validator yet', `${uses.checkout}\n${cmds('echo "PROTOTYPES - gated by P2SYS"')}`));
// 10 Model audit.
add('model-audit.yml', head('model-audit', MAIN) + job('audit', 'license whitelist', `${setup}\n${cmds('node scripts/validate-manifest.mjs --audit')}`));
// 11 Animation separation stub.
add('anim-separation.yml', head('anim-separation', MANUAL, 'DECLARED STUB validate-anim-separation.mjs.')
  + job('validate', 'separated GLBs', `${setup}\n${cmds('node scripts/validate-anim-separation.mjs')}`, 20));
// 12 Retarget stub.
add('retarget.yml', head('retarget', MANUAL, 'DECLARED STUB validate-retarget.mjs.')
  + job('validate', 'bone coverage', `${setup}\n${cmds('node scripts/validate-retarget.mjs')}`, 20));
// 13 Perf.
add('perf.yml', head('perf', MANUAL, 'Perf budgets have no measured source before HC-003.')
  + job('placeholder', 'no perf data yet', `${uses.checkout}\n${cmds('echo "PERF - NOT COMPUTABLE until measured"')}`));
// 14 Visual.
add('visual.yml', head('visual', MANUAL, 'Visual checks arrive with lookdev.')
  + job('placeholder', 'no visual validator yet', `${uses.checkout}\n${cmds('echo "VISUAL - gated by GATE:P2"')}`));
// 15 Soak.
add('soak.yml', head('soak', MANUAL, 'Soak test arrives with NET-006 / QA harness.')
  + job('placeholder', 'no soak harness yet', `${uses.checkout}\n${cmds('echo "SOAK - not implemented"')}`));
// 16 Fuzz.
add('fuzz.yml', head('fuzz', MANUAL) + job('placeholder', 'no fuzz harness yet', `${uses.checkout}\n${cmds('echo "FUZZ - not implemented"')}`));
// 17 Compat.
add('compat.yml', head('compat', MANUAL) + job('placeholder', 'no compat matrix yet', `${uses.checkout}\n${cmds('echo "COMPAT - not implemented"')}`));
// 18 Balance.
add('balance.yml', head('balance', MANUAL) + job('placeholder', 'no balance data yet', `${uses.checkout}\n${cmds('echo "BALANCE - NOT COMPUTABLE until ECON-001"')}`));
// 19 Localization.
add('loc.yml', head('loc', MANUAL) + job('placeholder', 'no loc validator yet', `${uses.checkout}\n${cmds('echo "LOC - FR/EN parity checked in review"')}`));
// 20 Accessibility.
add('a11y.yml', head('a11y', MANUAL) + job('placeholder', 'no a11y validator yet', `${uses.checkout}\n${cmds('echo "A11Y - checklist arrives with P1-004"')}`));
// 21 Security: CodeQL. Dependency review is 403 and stays manual in its own note below.
add('security.yml', head('security', MAIN, 'dependency-review-action disabled: graph API returned 403 (run 44218555810).')
  + job('codeql', 'static analysis', `${uses.checkout}\n${uses.codeqlInit}\n        with:\n          languages: javascript-typescript\n          queries: security-extended\n${uses.codeqlAnalyze}`, 20));
// 22 Asset report stubs.
add('asset-report.yml', head('asset-report', MANUAL, 'DECLARED STUBs — manual until assets exist.')
  + job('validate', 'asset stubs', `${setup}\n${cmds('node scripts/validate-kit.mjs', 'node scripts/validate-lightmap.mjs', 'node scripts/validate-content-blueprints.mjs')}`, 20));
// 23 Release.
add('release.yml', head('release', MANUAL, 'Release gate waits for GATE:P0 and a Director merge.')
  + job('placeholder', 'no release job yet', `${uses.checkout}\n${cmds('echo "RELEASE - Director merges PR #1 first"')}`));
// 24 Anim stub.
add('anim.yml', head('anim', MANUAL, 'DECLARED STUB validate-anim.mjs.')
  + job('validate', 'animation clips', `${setup}\n${cmds('node scripts/validate-anim.mjs')}`, 20));
// 25 Scene budget stub.
add('scene-budget.yml', head('scene-budget', MANUAL, 'DECLARED STUB validate-scene-budget.mjs.')
  + job('validate', 'draw calls and parity', `${setup}\n${cmds('node scripts/validate-scene-budget.mjs')}`, 20));
// 26 Texture audit stub.
add('texture-audit.yml', head('texture-audit', MANUAL, 'DECLARED STUB validate-texture-set.mjs.')
  + job('validate', 'four-channel sets', `${setup}\n${cmds('node scripts/validate-texture-set.mjs')}`, 20));
// 27 Lookdev.
add('lookdev.yml', head('lookdev', MANUAL, 'Lookdev arrivals with P3ART; no generator before NET-GATE (I2).')
  + job('placeholder', 'no lookdev yet', `${uses.checkout}\n${cmds('echo "LOOKDEV - gated by NET-GATE"')}`));

const expected = ['ci','opencode','workflow','high-concept','gdd','scope','netcode','economy','prototype','model-audit','anim-separation','retarget','perf','visual','soak','fuzz','compat','balance','loc','a11y','security','asset-report','release','anim','scene-budget','texture-audit','lookdev'].map(n => `${n}.yml`);
if (files.size !== 27) throw new Error(`27 expected, got ${files.size}`);
for (const n of expected) if (!files.has(n)) throw new Error(`master name missing: ${n}`);
for (const n of files.keys()) if (!expected.includes(n)) throw new Error(`unexpected name: ${n}`);

rmSync(ROOT, { recursive: true, force: true });
mkdirSync(ROOT, { recursive: true });
for (const [name, body] of files) writeFileSync(`${ROOT}/${name}`, body, 'utf8');
console.log(`wrote ${files.size} workflows matching master §18 exactly`);
