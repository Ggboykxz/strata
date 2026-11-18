// One-off generator for GDD-003: five concept modules advanced to DRAFT. Committed for reproduction.
// Run from the repository root; it overwrites only the five module files listed in GDD-003.
import { writeFileSync } from 'node:fs';
const ROOT = process.cwd() + '/docs/design/gdd';

const M = {
  'GDD-CORE': {
    owner: 'game-designer',
    outcome: 'A player observes one deterministic rule system at 30 Hz across all three strata; no rule reads wall time.',
    hc: 'D1 time is a system: epoch state is computed from the fact graph, never scripted.',
    rules: [
      'The simulation advances only on an integer tick; the wall clock stays in apps/server/src/main.ts.',
      'State is integer fixed-point (milli-units); randomness comes from a seeded PRNG with an explicit seed.',
      'The only clock-dependent operations are outside packages/core, which I14 rejects by AST lint.',
    ],
    numbers: [
      '30 Hz tick, 33.333 ms per tick | SOURCE: packages/core/src/index.ts TICK_HZ',
      'tick budget <= 4 ms server-side | TUNABLE 2..8 ms | plan: measure in soak test NET-006',
      'state hash = FNV-1a 32-bit over 5 integer fields | SOURCE: packages/core/src/tracer.ts',
      'reachable states >= 200 before GATE:P2 | TUNABLE 200..2000 | plan: T4 reachability audit',
    ],
    state: 'TICK_IDLE → TICK_WITH_INPUT → FACTS_WRITTEN → EPOCH_RECOMPUTED → SNAPSHOT_HASHED → TICK_IDLE.',
    contract: 'core_state v1 {tick, x, z, vx, vz, seed} plus fact_graph v1 {fact_id, actor_id, tick, payload_hash}. Integer-only fields; wire encoding in GDD-NETCODE field 7. Migration requires a replay proof from the fact log.',
    edges: [
      'Two intents with the same seq in one tick: the lower (tick, seq, actor_id) wins deterministically.',
      'Fixed-point overflow at 2^31 milli-units: clamp and emit a bounds fact rather than wrap.',
      'Seed replay on Node and Chromium produces different hashes: package rejected until diagnosed.',
      'Epoch recomputation cost exceeds 4 ms: tick is still committed; telemetry records the overrun.',
      'A rule reads Math.random: lint exits 1 before the build, not at runtime.',
    ],
    failures: [
      'Non-deterministic call detected: AST lint fails the build and names the file/line.',
      'State hash mismatch across replicas: desync event with the last 60 ticks captured.',
      'Reachability below 200 states: T4 debt is recorded and GATE:P2 is blocked.',
    ],
    interaction: 'CORE × CONSEQUENCE: facts are the only history. CORE × NETCODE: the hash is the ack contract.',
    feedback: 'Each tick emits one hash and one fact-count delta to telemetry; no per-tick UI message.',
    a11y: 'No essential state is conveyed by motion alone; the HUD overlay exposes tick and fact count as text.',
    l10n: 'State names and rule ids are tokens; numeric formatting is locale-independent in core.',
    telemetry: 'tick_duration_ms (p95), state_hash, reachable_states, facts_per_tick. Success metric: 0 nondeterminism findings and equal hashes on Node and Chromium.',
    acceptance: [
      'GIVEN the core source WHEN pnpm lint runs THEN no banned clock/RNG/transcendental is reported.',
      'GIVEN two runtimes WHEN 1000 seeded ticks replay THEN the hash at each acked tick is equal.',
      'GIVEN the concept WHEN T4 is audited THEN at least 200 reachable states are proven.',
    ],
    perf: 'sim tick p95 <= 4 ms; no allocation per tick beyond the fact batch; memory bounded by the AoI set.',
    out: 'No wall clock, unseeded RNG, transcendental, DOM or Node API in packages/core; no gameplay content.',
    questions: [
      'Which seed is authoritative for a shard? | netcode-engineer | before NET-001',
      'How is the 200-state reachability proof stored? | qa-engineer | before GATE:P2',
    ],
  },
  'GDD-STRATA': {
    owner: 'game-designer',
    outcome: 'The player sees the same topology read three ways; a change in one era rewrites the others without a scripted transition.',
    hc: 'D2 consequences are spatial and D5 epochs are computed from world state, never hand-authored.',
    rules: [
      'Each stratum derives its epoch from the fact graph at the current tick; no epoch trigger is authored.',
      'A fact swaps geometry or placement in at least two other strata; a text-only change does not count.',
      'Stratum layout is a kit on a 2 m grid plus 64 m cells; generated backdrops are reference boards only.',
    ],
    numbers: [
      '3 strata, 64 m cells, 2 m kit grid | SOURCE: master §7 and §8.7',
      'geometry variant swap <= 1 tick after the fact is committed | TUNABLE 1..3 ticks | plan: T2 replay',
      'draw calls <= 250, tris <= 1.5 M per cell | SOURCE: master §6 budgets',
      'heightmap 1 m resolution, 16-bit, quantized | SOURCE: master §8.7',
    ],
    state: 'EPOCH_STONE → EPOCH_ABBEY → EPOCH_MEGACITY is derived, not sequential; any epoch may be recomputed from facts.',
    contract: 'stratum_view v1 {cell_id, stratum_id, epoch, variant_ids[], fact_ids[]}. Variant id is an instance buffer, not a separate material. Migration: new variant requires a new id and a before/after capture pair.',
    edges: [
      'Two facts affect one cell in the same tick: variant resolution is deterministic by fact_id order.',
      'Fact removes a node that another stratum uses as a route: navigation recomputes in the same tick.',
      'Backdrop contains a splat beyond 120 m: allowed as vista only, never collidable or server-referenced.',
      'Client and server heightmap samples differ by > 1 cm: parity test rejects the cell.',
      'A stratum has no affected variant for a fact: the fact is recorded but T2 does not count it.',
    ],
    failures: [
      'Parity mismatch: cell is rejected and the fact id is named.',
      'Missing variant asset: kit fallback is rendered and the gap is recorded as content debt.',
      'Epoch derivation loop: tick aborts with an explicit cycle error instead of hanging.',
    ],
    interaction: 'STRATA × NAVIGATION: routes change with variants. STRATA × CONSEQUENCE: variants are the visible proof.',
    feedback: 'A variant swap emits one capture pair and one fact id; the HUD names the era, not the implementation.',
    a11y: 'Era changes are announced as text and icon; no colour-only cue carries the change.',
    l10n: 'Era and stratum names are keys; no concatenated sentences in UI strings.',
    telemetry: 'variant_swaps_per_fact, parity_error_cm, draw_calls_per_cell, splat_share. Success metric: >=1 physical variant per affected stratum in the T2 replay.',
    acceptance: [
      'GIVEN one forest burn WHEN 900 ticks pass THEN at least two strata show a geometry variant swap.',
      'GIVEN a cell WHEN client and server sample 10k points THEN heights agree within 1 cm.',
      'GIVEN a scripted epoch trigger WHEN reviewed THEN no such trigger exists in the fact graph.',
    ],
    perf: 'draw calls <= 250, tris <= 1.5 M, load <= 25 MB compressed; splat share <= 25% of a cell GPU budget.',
    out: 'No monolithic generated zone, no scripted epoch, no gameplay splat, no server physics engine.',
    questions: [
      'Which strata are in the first T2 replay? | high-concept-guardian | before HC-003',
      'How are variant ids persisted across shard restore? | backend-engineer | before GATE:P2',
    ],
  },
  'GDD-CONSEQUENCE': {
    owner: 'game-designer',
    outcome: 'One player act lands at least three attributed facts in two strata within 900 ticks, and any observer can replay the chain.',
    hc: 'T2 is the blocking demo: 1 act, <=900 ticks, >=3 facts, >=2 strata, >=1 physical variant, 6 captures.',
    rules: [
      'A fact is immutable: fact_id, actor_id, tick and payload_hash are written once.',
      'Propagation is spatial and derived; a consequence that only changes text does not satisfy T2.',
      'The causal chain is replayable from the fact log by any client with the same epoch table.',
    ],
    numbers: [
      '900 ticks maximum = 30 s at 30 Hz | SOURCE: master §1.4 T2',
      '>= 3 facts, >= 2 strata, >= 1 variant swap | SOURCE: master T2',
      '6 before/after captures per replay | SOURCE: master T2',
      '2 clients must report identical fact_id, variant_id and epoch | SOURCE: master T2 / D137',
    ],
    state: 'ACT → FACTS_WRITTEN(3+) → PROPAGATED(2+ strata) → VARIANT_SWAPPED → CAPTURED(6) → VERDICT.',
    contract: 'fact v1 {fact_id, actor_id, tick, kind, payload_hash}; consequence v1 {fact_id, stratum_id, variant_id, epoch, capture_ids[]}. Migration: a changed payload_hash creates a new fact id, never rewrites an old one.',
    edges: [
      'One act produces only 2 facts: T2 fails and the verdict names the missing fact.',
      'A consequence lands in 3 strata but changes no geometry: T2 fails the variant requirement.',
      'A blind reviewer cannot infer the chain from captures: the demo is rejected even if hashes match.',
      'Two acts in one tick produce crossing chains: each chain keeps its own fact ids and captures.',
      'A fact is written after tick 900: it is recorded but not counted in this replay.',
    ],
    failures: [
      'Chain not replayable: verdict fails with the first fact id that cannot be resolved.',
      'Attribution missing: the fact is refused at write time, not repaired later.',
      'Capture files missing: the demo cannot be signed at GATE:P2.',
    ],
    interaction: 'CONSEQUENCE × STRATA: variants are the physical proof. CONSEQUENCE × QUEST: resolutions must create facts.',
    feedback: 'The demo emits six numbered captures and a verdict line; no adjective is used as evidence.',
    a11y: 'Captures carry textual alt descriptions of the physical change, not only images.',
    l10n: 'Capture labels are keys; fact and variant ids are locale-independent.',
    telemetry: 'facts_per_act, strata_affected, variant_swaps, capture_count, reviewer_inference_ok. Success metric: T2 passes with two equal-hash clients.',
    acceptance: [
      'GIVEN one act WHEN 900 ticks pass THEN >=3 facts land in >=2 strata with >=1 variant swap.',
      'GIVEN six captures WHEN a blind reviewer reads them THEN the causal chain is inferred.',
      'GIVEN two clients WHEN the replay runs THEN fact_id, variant_id and epoch are identical.',
    ],
    perf: 'Propagation completes within the 900-tick budget; no chain work on the render thread; captures are generated off the tick path.',
    out: 'No text-only consequence, no pre-authored epoch change, no single-client-only demo.',
    questions: [
      'Which act is the canonical T2 demo? | high-concept-guardian | before HC-003',
      'Who is the blind reviewer for the six captures? | qa-engineer | before HC-003',
    ],
  },
  'GDD-COMBAT': {
    owner: 'game-designer',
    outcome: 'A winning short-term combat strategy degrades a later stratum, so the player pays for every victory.',
    hc: 'D4 players antagonize their own future; a strategy with no cross-stratum cost fails the concept.',
    rules: [
      'The server owns hit frames and combat math; the client sends intent only.',
      'Every destructive act writes a fact whose consequence reaches at least one other stratum.',
      'A combat tactic that produces no delayed cost is a design defect, not a balance setting.',
    ],
    numbers: [
      'hit frame validated on server, 0 client-authoritative hits | SOURCE: GDD-NETCODE and I1',
      'cross-stratum cost delay >= 1 epoch | TUNABLE 1..3 epochs | plan: ECON-001 simulation',
      'combat math within the 4 ms core tick budget | SOURCE: master §6 sim tick <= 4 ms',
      'animation STATE payload <= 64 bytes per entity | SOURCE: master §6 and GDD-ANIM-ARCHITECTURE',
    ],
    state: 'IDLE → WINDUP → ACTIVE → RECOVERY → FACT_WRITTEN → COST_SCHEDULED → RESOLVED.',
    contract: 'combat_event v1 {actor_id, target_id, tick, intent_seq, hit_frame, fact_id}; hit_frame is server-generated. Migration: a new hit rule increments the event version and requires a replay proof.',
    edges: [
      'Client predicts a hit the server rejects: server frame wins and a desync telemetry event is emitted.',
      'Two hits land on the same node in one tick: deterministic order by (tick, actor_id).',
      'Destructive act has no downstream stratum: the act is refused as concept debt.',
      'Delay spans three epochs: cost is still attributed to the original fact id.',
      'Combat math exceeds tick budget: act is committed and overrun is recorded, never dropped.',
    ],
    failures: [
      'Unvalidated hit: event dropped, rate-limit counter incremented.',
      'Missing fact id: act is rolled back on the server, no consequence is written.',
      'Hit frame disagreement: server snapshot is authoritative, client reconciles.',
    ],
    interaction: 'COMBAT × CONSEQUENCE: every destructive act writes a fact. COMBAT × ECONOMY: repair cost is a sink.',
    feedback: 'The player sees the immediate result and a named future cost in the HUD overlay; no hidden penalty.',
    a11y: 'Hit and cost signals are text plus icon; no essential cue is carried by animation alone.',
    l10n: 'Ability names and cost labels are keys; numerics use locale-independent formatting.',
    telemetry: 'unvalidated_hits, cost_delay_epochs, facts_per_act, tick_overruns. Success metric: 0 client-authoritative hits and >=1 delayed cost per strategy.',
    acceptance: [
      'GIVEN a client-side hit WHEN the server ticks THEN the server frame is authoritative.',
      'GIVEN an optimal short-term strategy WHEN simulated THEN a later stratum is degraded.',
      'GIVEN a destructive act WHEN resolved THEN one attributed fact id is written.',
    ],
    perf: 'Combat step within 4 ms tick; no new allocation per hit; animation state only on the wire.',
    out: 'No client-authoritative hit, no unattributed destruction, no cosmetic-only consequence.',
    questions: [
      'What is the first measurable cross-stratum combat cost? | game-designer | before NET-001',
      'Which actor ids are visible in the fact log? | security-auditor | before GATE:P2',
    ],
  },
  'GDD-QUEST': {
    owner: 'narrative',
    outcome: 'A major quest offers at least three resolutions, each producing a cross-stratum effect and a delayed effect.',
    hc: 'T4 depth: every major quest has >=3 resolutions, each with a cross-stratum and a delayed effect.',
    rules: [
      'Quest state is derived from world facts; no quest uses an authored branch that bypasses the fact graph.',
      'Each resolution writes at least one fact and one delayed consequence in another stratum.',
      'Dialogue and companions read the same fact log; no private quest-only history.',
    ],
    numbers: [
      '>= 3 resolutions per major quest | SOURCE: master T4',
      '>= 1 cross-stratum effect and >= 1 delayed effect per resolution | SOURCE: master T4',
      '>= 200 reachable world states before GATE:P2 | SOURCE: master T4',
      'dialogue lines are FR/EN pairs with 0 untranslated keys | SOURCE: master §6 policy',
    ],
    state: 'AVAILABLE → ACCEPTED → RESOLVING(3 options) → FACT_WRITTEN → DELAYED_EFFECT_PENDING → RESOLVED → LOGGED.',
    contract: 'quest_resolution v1 {quest_id, option_id, actor_id, fact_id, delayed_tick, stratum_ids[]}. Migration: a new option gets a new id; old resolutions remain replayable.',
    edges: [
      'Two players choose different options for the same quest: both fact ids are retained, no global override.',
      'Delayed effect is due after shard restore: scheduled from the fact tick, not wall time.',
      'Resolution produces a text-only change: rejected as a T4 defect.',
      'Quest prerequisite fact is erased by an earlier act: quest re-derives from the new world state.',
      'Dialogue references a fact the player never authored: line is suppressed rather than invented.',
    ],
    failures: [
      'Missing delayed effect: resolution is recorded as concept debt and the quest cannot be signed.',
      'Untranslated key: localization gate fails the quest asset before merge.',
      'Fact log unavailable: quest stays AVAILABLE and refuses to resolve, no local fallback state.',
    ],
    interaction: 'QUEST × CONSEQUENCE: options write facts. QUEST × DIALOGUE/COMPANION: shared fact log (narrative co-agent).',
    feedback: 'The HUD names the authored fact and the expected delayed era; no hidden quest flag.',
    a11y: 'Resolutions are selectable by keyboard and screen reader; delayed effects are announced as text.',
    l10n: 'All lines are FR/EN key pairs; no concatenated sentences and no locale-dependent formatting in logic.',
    telemetry: 'resolutions_per_quest, delayed_effects_pending, untranslated_keys, reachable_states. Success metric: >=3 resolutions with both effects for every signed major quest.',
    acceptance: [
      'GIVEN a major quest WHEN all options are enumerated THEN at least 3 resolutions exist.',
      'GIVEN one resolution WHEN the delayed tick arrives THEN another stratum shows the recorded effect.',
      'GIVEN the FR/EN pair set WHEN validate-docs runs THEN 0 untranslated keys are reported.',
    ],
    perf: 'Quest derivation is O(facts in cell), not O(world facts); no extra tick cost above 4 ms.',
    out: 'No branching script that bypasses the fact graph, no private history, no commercial IP names or lore.',
    questions: [
      'Which quests count as major for T4? | narrative | before GDD-004',
      'How are delayed effects stored across restore? | backend-engineer | before GATE:P2',
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
    '| version | date | change | by |\n|---|---|---|---|\n| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |\n| 0.2 | 2026-11-18 | DRAFT: all 19 fields, T2/T4 numbers and sources | GDD-003 |',
  ];
  const lines = [
    `# ${id} — DRAFT`, '', '| field | value |', '|---|---|',
    `| id | ${id} |`, '| version | 0.2 |', `| owner | ${d.owner} |`, '| status | DRAFT |', '',
    '> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships.', '',
  ];
  values.forEach((v, i) => lines.push(`## ${i + 1}. ${FIELDS[i]}`, '', v, ''));
  writeFileSync(`${ROOT}/${id}.md`, lines.join('\n'), 'utf8');
}
console.log('wrote ' + Object.keys(M).length + ' DRAFT modules');
