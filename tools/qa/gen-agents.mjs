// One-off generator for P0-002: 32 agent files + skill stubs from OWNERSHIP.yaml. Artifacts are committed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseYaml } from '../../scripts/lib/yaml.mjs';

const ROOT = process.cwd();
const own = parseYaml(readFileSync(`${ROOT}/docs/state/OWNERSHIP.yaml`, 'utf8'));

const ROLES = {
  orchestrator: ['Selects one task, guards the invariants, writes docs and state only, delegates the rest.', 'workflow-os'],
  producer: ['Owns scope, tiers, the zero-sum ledger, gates dossiers and the vertical slice spec.', 'evidence-capture'],
  'high-concept-guardian': ['Guards the signature: cross-stratum consequence propagation, novelty and CIS. Holds a VETO.', 'concept-guard'],
  'game-designer': ['Owns the GDD: 32 modules, 19 fields, coverage, drift detection.', 'gdd-authoring'],
  narrative: ['Owns the world bible, quests, dialogue, companions and endings; lore canon needs the Director.', 'lore-authoring'],
  'level-designer': ['Owns greybox play spaces, navigation affordances and scene budgets.', 'world-generation'],
  'ux-designer': ['Owns HUD, menus, onboarding and the accessibility-facing interaction model.', 'ux-spec'],
  'balance-analyst': ['Turns measured playtest and sim data into tuning proposals with ranges.', 'economy-sim'],
  'gameplay-engineer': ['Owns the isomorphic simulation, systems and the server-side sim loop.', 'gameplay-systems'],
  'graphics-engineer': ['Owns rendering, streaming, instancing and the look of the runtime.', 'render-pipeline'],
  'tools-engineer': ['Owns the monorepo, scripts, CI helpers, the dashboard shell and .opencode config.', 'tooling'],
  'asset-pipeline': ['Owns model audits, ComfyUI graphs, rig/LOD chain and asset manifests.', 'model-license-audit'],
  'audio-engineer': ['Owns spatialized audio, music integration and the audio budget.', 'audio-design'],
  'release-engineer': ['Owns GitHub Actions, runners, release gates and rollback.', 'release-engineering'],
  'qa-engineer': ['Owns test strategy, GDD-to-test translation, load harnesses and evidence.', 'qa-automation'],
  'perf-engineer': ['Owns perf budgets, soak tests and frame-time evidence.', 'perf-testing'],
  'a11y-auditor': ['Owns the accessibility checklist and its automated tests.', 'a11y-audit'],
  'code-reviewer': ['Read-only reviewer: correctness, regressions, missing tests. Writes comments only.', 'code-review'],
  'security-auditor': ['Owns the threat model, message validation, rate limits and anti-cheat plausibility.', 'netcode-security'],
  'localization-manager': ['Owns FR/EN parity, string extraction and locale-safe formatting.', 'l10n'],
  'tech-writer': ['Owns README, CONTRIBUTING, devlog and press-facing text.', 'tech-writing'],
  'animation-director': ['Acting art lead: separated animation architecture, packs, retarget audits, art bible.', 'anim-architecture'],
  'rigging-engineer': ['Owns rigs, retarget maps and skeleton conventions.', 'mesh2motion-rig'],
  'environment-artist': ['Owns kits, cells, final levels and fact-driven dressing.', 'environment-art'],
  'lighting-artist': ['Owns the three locked lighting presets, lightmaps and IBL.', 'lighting'],
  'texture-artist': ['Owns the four-channel texture sets, faction tints and the Rouille shader inputs.', 'texture-art'],
  'netcode-engineer': ['Owns protocol, prediction, reconciliation, desync triage and AoI.', 'netcode-prototype'],
  'backend-engineer': ['Owns rooms, persistence, the double-entry ledger, shard commits and moderation tooling.', 'ledger-prototype'],
  'economy-designer': ['Owns the economy model, faucets/sinks, trade and craft loops, and the 1000-bot sim.', 'economy-design'],
  'sre-engineer': ['Owns deployment, tunnels, monitoring, backups and the runbook.', 'liveops-runbook'],
  'moderation-designer': ['Owns the moderation policy, reports and GM tool requirements.', 'moderation-tools'],
  'prototype-engineer': ['Owns headless system prototypes: quests, factions and scenario harnesses.', 'prototype-harness'],
};

const EXTRA_SKILLS = {
  'concept-guard': 'Check a change against the locked HC, the four tests and the CIS weights.',
  'gdd-authoring': 'Write and sign a GDD module with the 19 mandatory fields.',
  'lore-authoring': 'Write canon without contradiction; naming per stratum; no franchise references.',
  'ux-spec': 'Specify HUD/menus/onboarding above the canvas, with a11y from the start.',
  'gameplay-systems': 'Implement a deterministic system in packages/core and prove it headless.',
  'render-pipeline': 'Wire streaming, instancing and LODs without breaching the draw-call budget.',
  tooling: 'Build repo tooling that fails closed: validators, generators, CI helpers.',
  'audio-design': 'Spatialize impacts, harvests and footsteps within the audio budget.',
  'release-engineering': 'Pin actions by SHA, keep workflows blocking, never weaken a gate.',
  'qa-automation': 'Translate GDD acceptance criteria into deterministic tests.',
  'perf-testing': 'Measure p95/p99 against the client and server budgets; never average away a hitch.',
  'a11y-audit': 'Test every a11y v1 item: remap, subtitles, scale, contrast, motion, colorblind, flashing.',
  'code-review': 'Review for correctness, security, missing tests and GDD drift; comments only.',
  l10n: 'Keep FR/EN pairs complete, extract strings, forbid locale-dependent formatting in core.',
  'tech-writing': 'Write for the next session: a stranger with amnesia.',
  'environment-art': 'Assemble kits on a 2 m grid; fact variants must change geometry, not just text.',
  lighting: 'Apply the locked presets; bake lightmaps within the per-cell budget.',
  'texture-art': 'Produce the four-channel sets, tints and Roulette masks within the size budget.',
  'prototype-harness': 'Declare hypothesis, parameters, metrics, thresholds and verdict for every prototype.',
  'economy-design': 'Model faucets, sinks, cross-era arbitrage and paradox as a regulator; prove it with the 1000-bot sim.',
};

const S16 = ['workflow-os','ownership-audit','lock-manage','acp-thread','handoff-contract','arbitration','anim-architecture',
  'anim-net-state','text-to-motion','comfy-workflow','hunyuan-pipeline','assetfurnace-batch','mesh2motion-rig',
  'actionforge-polish','retarget-audit','ai-tier-select','model-license-audit','netcode-prototype','netcode-loadtest',
  'netcode-security','ledger-prototype','economy-sim','shard-commit','liveops-runbook','moderation-tools','desync-triage',
  'determinism-audit','evidence-capture','world-generation','long-job','context-budget'];

const DESC = {
  'workflow-os': 'Run the Workflow OS: ownership, locks, ACP threads, handoffs, arbitration, merge queue.',
  'ownership-audit': 'Resolve a path to its single writer; most-specific glob wins; a tie is a map error.',
  'lock-manage': 'Acquire and release locks as a git compare-and-swap on state/locks.',
  'acp-thread': 'Write PROPOSAL/CRITIQUE/COUNTER/EVIDENCE/DECISION entries in the task thread.',
  'handoff-contract': 'Write a handoff with inputs, outputs, acceptance commands, constraints, deadline, rollback.',
  arbitration: 'Apply the 5-level ladder; record a DECISION and a DISPUTES line.',
  'anim-architecture': 'Keep mesh and animation GLBs separated; skeleton-only packs per archetype.',
  'anim-net-state': 'Replicate animation STATE only; server-validated transitions; no bone transforms on the wire.',
  'text-to-motion': 'Generate clips with an audited text-to-motion model, then retarget to the STRATA skeleton.',
  'comfy-workflow': 'Version and pin ComfyUI graphs; audit every custom node.',
  'hunyuan-pipeline': 'Run the audited Hunyuan3D tier for the detected VRAM; checkpoint every asset.',
  'assetfurnace-batch': 'Batch retopo/LOD/export with the audited tool; Blender is always the fallback.',
  'mesh2motion-rig': 'Rig to the STRATA archetype and verify bone names and influences.',
  'actionforge-polish': 'Optional IK and prop attachment; never on the critical path.',
  'retarget-audit': 'Prove the retarget map covers every animated bone; foot-slide within 2 cm.',
  'ai-tier-select': 'Detect the VRAM tier and select the audited model set that fits.',
  'model-license-audit': 'Audit license, transitive dependencies, territory and output rights before first use.',
  'netcode-prototype': 'Prove prediction, reconciliation and interpolation at 30 Hz with greybox capsules.',
  'netcode-loadtest': 'Run the RTT/loss/jitter matrix and the 30-minute soak; report p95.',
  'netcode-security': 'Validate every message; rate limit; plausibility-check; write the threat model.',
  'ledger-prototype': 'Double-entry, integer minor units, idempotency, zero drift under retry storms.',
  'economy-sim': 'Run 1000 bots x 30 days and report inflation, sink/faucet, Gini and exploit cycles.',
  'shard-commit': 'Commit shard-wide consequences through a serialized, attributed, idempotent queue.',
  'liveops-runbook': 'Deploy, monitor, back up and roll back with an honest RPO.',
  'moderation-tools': 'Reports, GM actions with a reason and an audit trail, before public multiplayer.',
  'desync-triage': 'Compare the hash at the acked tick; capture the last 60 ticks and the full snapshot.',
  'determinism-audit': 'Ban clock, RNG and transcendentals in core; replay on Node and Chromium.',
  'evidence-capture': 'Every acceptance command writes a log with its exit code; every number has a source.',
  'world-generation': 'Scene generators propose layout; gameplay space is kits + heightmap cells with parity.',
  'long-job': 'Chunk, checkpoint, resume, cap wall-clock, state the reduction plan.',
  'context-budget': 'Read the index, grep the section, never load a corpus into the window.',
};

const skillSet = new Map();
for (const s of S16) skillSet.set(s, DESC[s] ?? 'STRATA skill.');
for (const [s, d] of Object.entries(EXTRA_SKILLS)) skillSet.set(s, d);

/* ---- skills ---- */
let skills = 0;
for (const [id, desc] of [...skillSet].sort()) {
  const dir = `${ROOT}/.opencode/skills/${id}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/SKILL.md`, `---
name: ${id}
description: ${desc}
metadata:
  opencode/autoinvoke: false
---

# ${id}

**STATUS: STUB (P0-002).** This skill exists so no task is blocked by a missing skill (§16). It contains no
procedure yet: the weekly retro replaces it with an evidence-backed procedure (master §18).

Until it is real: read the binding document for your task, follow \`docs/WORKFLOW.md\`, and never invent a
procedure that contradicts \`docs/CONSTITUTION.md\`. A stub is hidden from automatic skill discovery on purpose;
load it explicitly by id.
`);
  skills++;
}

/* ---- agents ---- */
const globsByAgent = new Map();
for (const o of own.owners ?? []) globsByAgent.set(o.agent, o.globs ?? []);
const catchAll = (own.catch_all ?? []).map(e => `\`${e.glob}\` → ${e.owner}`).join(' · ');

let agents = 0;
const missing = [];
for (const [name, [role, skill]] of Object.entries(ROLES)) {
  const globs = globsByAgent.get(name);
  if (!globs) { missing.push(name); continue; }
  if (!skillSet.has(skill)) throw new Error(`agent ${name} declares unknown skill ${skill}`);
  const extra = name === 'code-reviewer'
    ? 'permissions:\n  - action: edit\n    resource: "*"\n    effect: deny\n'
    : '';
  const body = `---
description: ${role}
mode: all
${extra}---

# ${name}

**Role.** ${role}

**Ownership** — from \`docs/state/OWNERSHIP.yaml\` (most-specific glob wins; a tie is a CI failure):

${globs.map(g => `- \`${g}\``).join('\n')}

Catch-all stewards: ${catchAll}.

**Boundary.** Never write outside those globs. The orchestrator writes \`docs/state/**\` and the root contract files
only; every other agent receives its paths through a handoff. A contested path is a HANDOFF, never an edit (I6).

**Primary skill.** \`${skill}\` (a P0-002 stub until the retro writes it).

**Escalation.** Domain decision → you. Cross-domain → orchestrator, by the authority order. Scope, money, licensing,
art direction, lore canon, tier promotion, gate sign-off → Director (\`needs-director\`). Concept dilution →
high-concept-guardian VETO.

**ACP.** Post \`PROPOSAL\` before L1/L2 work; \`EVIDENCE\` with the acceptance log; \`HANDOFF\` when another agent must
write. Max 3 rounds, then the ladder (\`docs/WORKFLOW.md\` §4.6). Silence is not agreement.

**Done means.** Acceptance commands run and logged under \`docs/state/evidence/<utc>-<task>/\`; the GDD updated in the
same PR if behavior changed; commits carry \`Agent:\` and \`Task:\` trailers; the PR names a different reviewer.
`;
  mkdirSync(`${ROOT}/.opencode/agents`, { recursive: true });
  writeFileSync(`${ROOT}/.opencode/agents/${name}.md`, body);
  agents++;
}
console.log(`wrote ${agents} agent files, ${skills} skill stubs`);
if (missing.length) { console.log('MISSING FROM OWNERSHIP:', missing.join(', ')); process.exit(1); }
