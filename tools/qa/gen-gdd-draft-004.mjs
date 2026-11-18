// One-off generator for GDD-004: four modules to DRAFT + machine-readable economy tables.
// Committed for reproduction. Run from the repository root.
import { mkdirSync, writeFileSync } from 'node:fs';
const ROOT = process.cwd();
const GDD = ROOT + '/docs/design/gdd';
const ECON = ROOT + '/packages/content/economy';
mkdirSync(ECON, { recursive: true });

const M = {
  'GDD-ECONOMY': {
    owner: 'economy-designer',
    outcome: 'A player can see where currency enters and leaves the world, and over-harvest in one era penalises a later one.',
    hc: 'N4 paradox as economic regulator; D4 optimal short-term play degrades a later stratum.',
    rules: [
      'Every currency unit is created by a named faucet and removed by a named sink; no implicit mint exists.',
      'Amounts are integer minor units; the ledger is double-entry and idempotent (GDD-PERSISTENCE).',
      'Over-harvest writes a fact that spawns Rouille and erases nodes in another era.',
    ],
    numbers: [
      'simulation: 1000 bots x 30 days | SOURCE: master §7 economy sim',
      'inflation target <= 5% over 30 simulated days | TUNABLE 0..15% | plan: ECON-001 measured run',
      'Gini coefficient recorded, not asserted | TUNABLE 0.20..0.60 | plan: ECON-001 report',
      'currency amounts are integer minor units | SOURCE: master §6 double-entry ledger',
    ],
    state: 'FAUCET_MINT → LEDGER_ENTRY → SINK_BURN → FACT_WRITTEN → ROUILLE_SPAWN → ERA_EFFECT → MEASURED.',
    contract: 'faucet v1 {id, amount_minor, actor_id, tick, fact_id}; sink v1 {id, amount_minor, fact_id}. Tables live in packages/content/economy/{faucets,sinks}.yaml. Migration: a changed rate creates a new id, never rewrites history.',
    edges: [
      'Two faucets fire in one tick: order is by (tick, faucet_id), both entries are kept.',
      'Sink exceeds available balance: transaction refused, reason code recorded.',
      'Rouille spawns in an era whose node was already erased: no second erase, one fact only.',
      'Simulated inflation above target: faucet rate is flagged TUNABLE, not silently changed.',
      'Ledger idempotency key replayed after restore: no second entry (GDD-PERSISTENCE).',
    ],
    failures: [
      'Ledger imbalance: shard refuses clients and names the entry id.',
      'Unnamed faucet: transaction refused; no currency enters the world.',
      'Simulation missing: inflation and Gini print NOT COMPUTABLE instead of a guess.',
    ],
    interaction: 'ECONOMY × CRAFT: craft is a sink. ECONOMY × TRADE: prices cross eras with integer minor units.',
    feedback: 'The HUD overlay shows faucet and sink names with amounts; no hidden mint is possible.',
    a11y: 'Currency deltas are textual with sign; colour is never the only indicator.',
    l10n: 'Faucet and sink names are keys; minor-unit formatting is locale-independent in the ledger.',
    telemetry: 'minted_minor, burned_minor, inflation_pct, gini, exploit_cycles. Success metric: zero ledger drift over 1000 bots x 30 days.',
    acceptance: [
      'GIVEN every mint in the ledger WHEN summed against sinks THEN drift is 0 minor units.',
      'GIVEN 1000 bots over 30 days WHEN the sim runs THEN inflation and Gini are reported with a source.',
      'GIVEN an over-harvest act WHEN it resolves THEN one Rouille fact affects another era.',
    ],
    perf: 'Ledger verification O(n) over entries; no economy work above 1 ms of the 4 ms tick budget.',
    out: 'No float currency, no implicit mint, no unmeasured inflation number, no commercial IP pricing model.',
    questions: [
      'Which faucets are active at P2? | economy-designer | before ECON-001',
      'How is Rouille removal measured? | game-designer | before ECON-001',
    ],
  },
  'GDD-TRADE': {
    owner: 'economy-designer',
    outcome: 'Players trade across eras, and short-term arbitrage exposes a delayed cost in the era it exploits.',
    hc: 'N4 paradox as regulator; D4 players antagonise their own future.',
    rules: [
      'All prices are integer minor units; listings reference a fact id for the goods provenance.',
      'A purchase moves units through the double-entry ledger with an idempotency key.',
      'Cross-era arbitrage is allowed only when the destination era carries the recorded consequence.',
    ],
    numbers: [
      'price unit = 1 minor unit; 100 minor = 1 currency unit | SOURCE: GDD-ECONOMY field 7',
      'listing TTL <= 600 s | TUNABLE 60..3600 s | plan: ECON-001 simulation',
      'trade fee 1% rounded down in minor units | TUNABLE 0..5% | plan: ECON-001 measured sink',
      'arbitrage cost delay >= 1 epoch | TUNABLE 1..3 epochs | plan: ECON-001 report',
    ],
    state: 'LISTED → MATCHED → LEDGER_COMMITTED → FACT_WRITTEN → COST_SCHEDULED → SETTLED → CANCELLED.',
    contract: 'trade_listing v1 {listing_id, seller_id, item_id, price_minor, fact_id, expires_tick}; trade_commit v1 {listing_id, buyer_id, idempotency_key, tick}. Migration: new fee schedule creates a new listing version; old listings remain readable.',
    edges: [
      'Two buyers match one listing in one tick: deterministic winner by (offer_tick, buyer_id).',
      'Listing expires during a commit: commit wins if it was accepted before the expiry tick.',
      'Fee rounds to 0 minor units: listing is still recorded, fee is 0, no implicit charge.',
      'Arbitrage into an era without the consequence: trade is refused with a reason code.',
      'Idempotency replay after restore: no second transfer (GDD-PERSISTENCE).',
    ],
    failures: [
      'Ledger commit fails: listing returns to LISTED and the buyer is refunded by the same key.',
      'Provenance fact missing: listing is refused; no item without a fact id can be sold.',
      'Fee overflow: trade refused and the amount is reported, never wrapped.',
    ],
    interaction: 'TRADE × ECONOMY: fee is a sink. TRADE × CRAFT: crafted items carry provenance facts.',
    feedback: 'The HUD shows price, fee and the delayed era cost before confirmation; no hidden fee.',
    a11y: 'Confirmation dialog exposes all amounts as text; numeric keys are keyboard reachable.',
    l10n: 'Listing labels are keys; minor-unit formatting is locale-independent in the ledger.',
    telemetry: 'trades_per_day, fee_minor, cancelled_listings, arbitrage_cost_epochs. Success metric: 0 duplicate transfers under 1000 idempotency replays.',
    acceptance: [
      'GIVEN one listing and two buyers WHEN both offer in one tick THEN exactly one commit succeeds.',
      'GIVEN an arbitrage trade WHEN the destination tick arrives THEN a delayed cost is recorded.',
      'GIVEN a replayed idempotency key WHEN the ledger restores THEN one transfer exists.',
    ],
    perf: 'Matching is O(listings in cell); ledger commit within the 4 ms tick budget.',
    out: 'No float price, no real-money transaction, no auction house without provenance, no NPC vendor for high-tier goods.',
    questions: [
      'Which items are tradable at P2? | economy-designer | before ECON-001',
      'How is a cancelled listing reflected in the fact log? | backend-engineer | before GATE:P2',
    ],
  },
  'GDD-CRAFT': {
    owner: 'economy-designer',
    outcome: 'High-tier goods are made by players from materials whose provenance names the fact that produced them.',
    hc: 'D3 traceability; D4 a crafted advantage carries a cross-stratum cost.',
    rules: [
      'Every crafted item carries the fact ids of its inputs, not just a recipe id.',
      'Craft consumes materials through a named sink and writes a new fact for the output.',
      'A recipe that produces an item with no delayed cost in another era is concept debt.',
    ],
    numbers: [
      'recipe input count 2..8 | TUNABLE 2..8 | plan: ECON-001 crafting sim',
      'craft duration <= 3 ticks at 30 Hz | TUNABLE 1..10 ticks | plan: PR-S2 prototype',
      'output tier <= 4 | SOURCE: master §2.3 capacity tiers S0..S4',
      'provenance fact ids per output >= 1 | SOURCE: GDD-CONSEQUENCE field 7',
    ],
    state: 'RECIPE_SELECTED → INPUTS_RESERVED → CRAFTING → OUTPUT_WRITTEN → FACT_WRITTEN → COST_SCHEDULED → OWNED.',
    contract: 'crafted_item v1 {item_id, recipe_id, input_fact_ids[], output_fact_id, tier}. Migration: a recipe change creates a new recipe id; old items keep their provenance.',
    edges: [
      'Input material was erased by an earlier fact: craft refuses and names the missing fact id.',
      'Two crafters reserve the same material in one tick: deterministic winner by (tick, actor_id).',
      'Output tier above the authorized tier: craft refused, no silent downgrade.',
      'Recipe produces no delayed cost: item is flagged concept debt and cannot be signed.',
      'Restore happens mid-craft: craft resumes from the reserved-input fact, not wall time.',
    ],
    failures: [
      'Missing input: reservation rolls back, no sink entry is written.',
      'Ledger write failure: output is not created, provenance is not written.',
      'Tier violation: recipe is disabled and the audit log records the actor.',
    ],
    interaction: 'CRAFT × ECONOMY: material consumption is a sink. CRAFT × TRADE: output carries provenance for listing.',
    feedback: 'The HUD names the input facts and the delayed cost before the craft is confirmed.',
    a11y: 'Recipe steps are textual; no essential prerequisite is shown by icon only.',
    l10n: 'Recipe and item names are keys; quantities use locale-independent formatting.',
    telemetry: 'crafts_per_day, inputs_per_output, tier_distribution, cost_scheduled_count. Success metric: 0 outputs without provenance fact ids.',
    acceptance: [
      'GIVEN a recipe and two inputs WHEN craft completes THEN the output names both input fact ids.',
      'GIVEN an erased input material WHEN craft is attempted THEN it is refused with the fact id.',
      'GIVEN the tier ledger WHEN an output is written THEN it is at or below the authorized tier.',
    ],
    perf: 'Craft resolution O(inputs); no work above 1 ms of the 4 ms tick budget.',
    out: 'No NPC vendor for high-tier goods, no untracked material, no item without a delayed cost.',
    questions: [
      'Which recipes exist at P2? | economy-designer | before ECON-001',
      'How is a crafted item restored after shard restart? | backend-engineer | before GATE:P2',
    ],
  },
  'GDD-AI-ASSETS': {
    owner: 'asset-pipeline',
    outcome: 'Every generated asset carries a licence id and a measured throughput, and unapproved models cannot be imported.',
    hc: 'I4 licence audit before use; D3 provenance for every asset.',
    rules: [
      'No model or tool is imported unless its id is APPROVED in tools/asset-pipeline/whitelist.yaml.',
      'Every asset manifest records the licence id, model revision, prompt hash and measured throughput.',
      'A tier bump or model version change requires a new audit entry before use.',
    ],
    numbers: [
      'approved entries = 9, blocked = 0, rejected = 11 | SOURCE: AUDIT-2026-11-18-P0-006',
      'measured device = Tesla T4, 15360 MiB reported, nominal 16 GB | SOURCE: tools/colab/detect_tier.py',
      'assets per session = NOT COMPUTABLE until AI-001 measures throughput | SOURCE: metrics.json',
      'one job at a time, chunk <= 60 min, checkpoint per asset | SOURCE: master §7 long-job rules',
    ],
    state: 'CANDIDATE → AUDITED → WHITELISTED → GENERATED → MANIFESTED → CHECKPOINTED → IMPORTED.',
    contract: 'asset_manifest v1 {asset_id, licence_id, model_revision, prompt_hash, tier, throughput, sha256}. The manifest cites AUDIT-2026-11-18-P0-006. Migration: a new model revision creates a new manifest, never overwrites an old one.',
    edges: [
      'Model licence is NON-COMMERCIAL: manifest refused by validate-manifest --audit.',
      'Tier detection reports NO_GPU: CPU-safe procedural fallback is selected, no model call.',
      'Two generations in one job: second is refused; one job at a time is enforced.',
      'Rejected entry has no fallback mapping: validator exits 1 before the task starts.',
      'Generated asset has no licence id: import is refused, asset is quarantined.',
    ],
    failures: [
      'Audit missing: model is not imported; NOT_FOUND is terminal, never guessed.',
      'Checkpoint lost: job resumes from the last asset manifest, not from scratch.',
      'Territory-restricted licence: blocked pending Director; agent cannot approve it.',
    ],
    interaction: 'AI-ASSETS × ANIM-ARCHITECTURE: generated clips require a retarget audit. AI-ASSETS × SECURITY: no token in logs or binaries.',
    feedback: 'Each generation emits one manifest line with licence id and measured throughput; no claim without a log.',
    a11y: 'Asset metadata is textual and keyboard accessible in the GM dashboard.',
    l10n: 'Licence ids and model revisions are tokens; no localized text in the manifest.',
    telemetry: 'assets_per_session, throughput_measured, licence_audit_id, checkpoint_count. Success metric: 0 unlicensed imports.',
    acceptance: [
      'GIVEN a rejected model id WHEN validate-manifest --audit runs THEN it exits 1 and names the id.',
      'GIVEN no GPU WHEN detect_tier runs THEN the policy prints NO_GPU and no model is called.',
      'GIVEN a generated asset WHEN imported THEN its manifest cites a licence id and a measured source.',
    ],
    perf: 'one job at a time; chunk <= 60 min; checkpoint per asset; GPU memory freed between jobs.',
    out: 'No NC or research-only model, no Mixamo asset, no binary in git, no model before NET-GATE for scene generation.',
    questions: [
      'What is the exact throughput baseline for AI-001? | asset-pipeline | before AI-001',
      'Are any territory-restricted Tencent models approved for FR/EN? | Director | ND-006 (rejected for now)',
    ],
  },
};

const FIELDS = [
  'Identity, version, owner, status', 'Player-facing outcome', 'High Concept link',
  'Deterministic rules', 'Numbers with source', 'State machine', 'Data contract',
  'Edge cases', 'Failure states', 'Interaction matrix', 'Feedback per state change',
  'Accessibility', 'Localization', 'Telemetry and success metric', 'Acceptance tests',
  'Perf budget impact', 'Explicit out of scope', 'Open questions', 'Changelog',
];
for (const [id, d] of Object.entries(M)) {
  const values = [
    `ID ${id}, version 0.2, owner ${d.owner}, status **DRAFT**. Derived from VISION v1.0 and the locked HIGH_CONCEPT.`,
    d.outcome, d.hc,
    d.rules.map((r, i) => `${i + 1}. ${r}`).join('\n'),
    d.numbers.map(n => `- ${n}`).join('\n'),
    d.state, d.contract,
    d.edges.map((e, i) => `${i + 1}. ${e}`).join('\n'),
    d.failures.map((f, i) => `${i + 1}. ${f}`).join('\n'),
    d.interaction, d.feedback, d.a11y, d.l10n, d.telemetry,
    d.acceptance.map(a => `- ${a}`).join('\n'),
    d.perf, d.out,
    '| question | owner | deadline |\n|---|---|---|\n' + d.questions.map(q => `| ${q[0]} | ${q[1]} | ${q[2]} |`).join('\n'),
    '| version | date | change | by |\n|---|---|---|---|\n| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |\n| 0.2 | 2026-11-18 | DRAFT: all 19 fields and sourced economy numbers | GDD-004 |',
  ];
  const lines = [
    `# ${id} — DRAFT`, '', '| field | value |', '|---|---|',
    `| id | ${id} |`, '| version | 0.2 |', `| owner | ${d.owner} |`, '| status | DRAFT |', '',
    '> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships.', '',
  ];
  values.forEach((v, i) => lines.push(`## ${i + 1}. ${FIELDS[i]}`, '', v, ''));
  writeFileSync(`${GDD}/${id}.md`, lines.join('\n'), 'utf8');
}

writeFileSync(`${ECON}/faucets.yaml`, `version: 1
audit: AUDIT-2026-11-18-P0-006
# Every mint has a source or a tunable range. No implicit mint exists.
faucets:
  - {id: QUEST_REWARD, amount_minor: 500, source: GDD-ECONOMY-field-5, tier: S0}
  - {id: HARVEST, amount_minor: 25, tunable: 5..100, plan: ECON-001-simulation, tier: S0}
  - {id: TRADE_PAYOUT, amount_minor: 0, source: GDD-TRADE-field-7, tier: S1}
`, 'utf8');
writeFileSync(`${ECON}/sinks.yaml`, `version: 1
audit: AUDIT-2026-11-18-P0-006
# Every burn has a source or a tunable range. Integer minor units only.
sinks:
  - {id: CRAFT_MATERIAL, amount_minor: 200, source: GDD-CRAFT-field-5, tier: S0}
  - {id: TRADE_FEE, percent: 1, tunable: 0..5, plan: ECON-001-simulation, tier: S1}
  - {id: ROUILLE_REPAIR, amount_minor: 1000, tunable: 100..5000, plan: ECON-001-measured, tier: S2}
`, 'utf8');
console.log('wrote 4 DRAFT modules and 2 economy tables');
