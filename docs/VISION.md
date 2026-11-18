# VISION — STRATA

| field | value |
|---|---|
| id | VISION |
| version | 1.0 |
| owner | producer |
| status | ACTIVE — derives from the locked HIGH_CONCEPT and ADR-A0003 |
| authority | `docs/CONSTITUTION.md`, `docs/design/HIGH_CONCEPT.md` v1.3, `docs/adr/A0003_full-mmorpg-vision.md` |
| validated by | `node scripts/validate-docs.mjs` |

## 1. Product target

STRATA's long-term target is a **full MMORPG**: a persistent browser world whose history is a
player-authored data structure and whose strata visibly read that structure. P0 delivers a vertical slice
that proves the mechanism, not the final content volume. The full MMORPG is the S3/S4 target and requires
its own Director funding decision; the authorized tier remains what the ledger and `BLUEPRINT.yaml` say.

> In STRATA, every deed rewrites history: burn a Stone Age forest, no medieval abbey exists, a future megacity is desert — and the world remembers forever.

That locked sentence is the product. Everything below is a consequence of it. A feature that does not make
a visible, attributed, permanent consequence land in another era does not belong in STRATA.

## 2. Concept-first rule

The concept outranks GDD, scope, workflow and code (authority order §2 of `AGENTS.md`). Every system is
accepted only when it traces to one of the four blocking tests:

| test | what it proves | where it is checked |
|---|---|---|
| T1 | the whole game fits one sentence | `concept-integrity --check` |
| T2 | one act lands ≥3 facts in ≥2 strata within 900 ticks, with physical variants | `hc_demo_30s` (HC-003) |
| T3 | the novelty is the uncombined N2 × N4 properties, signed at each gate | `concept-integrity --check` |
| T4 | ≥200 reachable states, no dead rules or orphan facts | GDD validation + reachability audit |

A system that increases feature count without increasing cross-stratum consequence is scope debt and must
be traded against something else in the zero-sum `SCOPE_LEDGER.yaml`.

## 3. The world model, in original terms

The world is a **fact graph**, not a scripted timeline:

- a player act writes an immutable, attributed `fact_id` with an actor id and a tick;
- each stratum re-reads the graph and derives its epoch from world state — no hand-authored epoch triggers;
- a derived consequence changes **geometry, lighting or placement**, never only a text flag;
- any player can replay the causal chain from the fact log: "who erased the abbey?" has a permanent answer.

Cross-era propagation is spatial: the same topology is re-read by three strata, so one act produces three
images. Paradox is the economic regulator: over-harvest in one era spawns Rouille, which erases nodes in a
later era and penalises the actor's own future. These are STRATA's own mechanics — no commercial IP's names,
lore, node taxonomy, art or skeletons are copied (I11).

## 4. Player agency and economy

- **Collective authorship:** consequences are shard-wide and carry their author, not private to the actor.
- **Player-driven supply:** high-tier goods come from crafting and trade, not from NPC vendors; faucets and
  sinks are measured in a 1000-bot × 30-day simulation before content is built (ECON-001).
- **Antagonism with your own future:** optimal short-term play must degrade a later stratum. A strategy with
  no cross-stratum cost fails the concept test D4.
- **Moderation before public multiplayer:** reports, GM actions with reasons and an immutable audit log
  precede any open shard (D109).

## 5. Technical shape

| layer | rule | invariant |
|---|---|---|
| client | Babylon.js, HTML/CSS overlay for HUD/menus, WebGPU with WebGL2 fallback | no Unreal, no whole-HUD in WebGL |
| simulation | `packages/core`, fixed 30 Hz, integer/quantized state, seeded PRNG | I14: no clock, RNG, DOM/Node or transcendentals |
| server | authoritative tick, AoI, snapshots, double-entry ledger | I1: client sends intent only |
| wire | versioned binary protocol, server-validated transitions | animation **state** only, hit frames server-authoritative |
| render | 64 m cells, thin instances, LOD + impostors, one IBL, three locked presets | draw calls ≤250, tris ≤1.5 M |
| compute | Colab = GPU batch + CI; never a game server | I8 / D81 |

NET-GATE is unpassed: no hero asset, texture bake, motion generation or scene generation until NG-001 is
signed. The greybox capsule of TRACER-001 is the only rendered entity so far.

## 6. Path from the slice to the MMORPG

| tier | exit evidence | status |
|---|---|---|
| S0 | P0 dossier: concept, scope, workflow OS, tracer, dashboard | assembled, awaiting Director |
| S1 | GDD coverage, vision replay, first systems | not started |
| S2 | GATE:NET + GATE:P2SYS, CIS ≥50, GDD coverage ≥0.80 | not authorized |
| S3 | CIS ≥80, 5 playtesters, GDD coverage 1.0 | funding decision required |
| S4 | CIS ≥85, live-ops evidence | funding decision required |

Each tier is bought with the zero-sum ledger: features are traded, never absorbed. `scope-math --report`
prints `months_needed = NOT COMPUTABLE` while throughput is unmeasured — this vision does not promise a date.

## 7. Explicit non-goals

- Not a generic open-world sandbox, survival game, roguelike with eras, or branching-ending narrative RPG.
- Not a copy of any commercial MMORPG: no named nodes, zones, lore, art or proprietary systems.
- Not a P0-MMORPG: the full product requires the S3/S4 funding decision (ADR-A0003 option A).
- Not a marketing sentence without a test: every claim above has a validator, a prototype or a gate.

## 8. Change log

| version | date | change | by |
|---|---|---|---|
| 1.0 | 2026-11-18 | concept-first vision derived from HIGH_CONCEPT v1.3 and ADR-A0003 | producer |
