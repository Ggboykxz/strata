# SCOPE — STRATA

| field | value |
|---|---|
| version | 1.0 |
| owner | producer |
| status | DRAFT (re-signed at every gate) |
| tier | current `S0` · authorized `S0` |
| validator | `node scripts/validate-scope.mjs` |

> A scope document that makes the project look affordable is a lie with a table of contents.
> This one is written to make the cost visible.

---

## 1. THE TRUTH ABOUT THE GENRE

An MMORPG is the most expensive shape a game can take. Public post-mortems and industry reporting
place conventional development in the **$50M–$200M** range and **300–1,000 person-years**, before
live operations, which never ends.

| item | reference range | confidence |
|---|---|---|
| development budget | $50M – $200M | REFERENCE — re-verify at each gate (D142) |
| person-years to launch | 300 – 1,000 | REFERENCE — same |
| live-ops | permanent staff, permanent cost | structural, not a range |

**STRATA has one human, no funding, and free-tier compute.** Therefore:

- We do not build a conventional MMORPG. We build an **MMO-shaped game**: authoritative,
  persistent, shared, shipped in capacity tiers, architected to scale when funded.
- Every gate states the tier, the measured exit evidence, and the honest cost.
- Any feature that silently assumes funded infrastructure (tier T3, §2.2 of the master) is a
  `needs-director` item, not an implementation detail.

This is the whole of §2.1. It does not change as the project progresses; only the numbers do.

---

## 2. COMPUTE REALITY

| environment | allowed | forbidden |
|---|---|---|
| Colab / Kaggle | GPU batch, headless sims, CI | hosting a game server (ephemeral, no stable inbound) |
| Director machine | dev server + Cloudflare Tunnel | 24/7 production |
| free VM | staging (T1) | scale |
| paid VPS | T2, ≤ ~€5/mo | anything requiring an on-call rotation |

Free-tier quotas and prices change. They are **read from current terms, never remembered** (D142),
and the reading is recorded in the gate dossier.

---

## 3. CAPACITY TIERS

`current_tier` = the tier whose *content* ships. `authorized_tier` = the highest tier whose
*engineering* is permitted (D136). A task above `authorized_tier` is refused.

| tier | what ships | players | exit evidence required | status |
|---|---|---|---|---|
| **S0** | offline slice, one player, full consequence chain | 1 | `hc_demo_30s` green | **current** |
| **S1** | co-op instance, two clients see one consequence | 2–4 | NET-GATE signed, two-client hash equality | authorized at GATE:P1 |
| **S2** | shared hub + instances | 32–64 | AoI + delta snapshots at 64 entities, wire ≤ 12 KB/s | not authorized |
| **S3** | zone shards | 200–500 | funding approval + human on-call | Director only |
| **S4** | true MMO | 1,000+ | business plan | out of scope |

**Why S1 is authorized before it is current:** NET-GATE requires four clients. A gate that cannot be
run cannot be signed; a gate that cannot be signed cannot raise the tier. D136 breaks that loop by
granting S1 *engineering* at GATE:P1 while content stays at S0.

---

## 4. WHAT THE VERTICAL SLICE COSTS (CONTENT MATH)

Formula is §2.5, implemented in `scripts/scope-math.mjs`, parameters in
`docs/production/CONTENT_MATH.yaml`. **Assumptions are labelled; nothing here is measured yet.**

| component | inputs (ASSUMPTION) | variants |
|---|---|---|
| kit pieces × strata | 1 zone × 3 strata × 2 kits × 22 pieces | 132 |
| props × fact variants × LODs | 40 × 4 × 3 | 480 |
| characters (mesh + 4 textures) | 3 × 5 | 15 |
| archetypes (rig + shared animpack) | 5 × 2 | 10 |
| unique anim packs | 1 | 1 |
| **required variants** | | **638** |

Animations are **never** charged per character — packs are shared per archetype (I3, D123).

### Throughput sensitivity (SCENARIO, not measurement)

`assets_per_session` is **unknown** until AI-001 measures it on the real GPU tier (P3). Until then
`months_needed` is reported as `NOT COMPUTABLE`, and these columns exist only to show the shape of
the risk:

| assets/session | sessions | months @ 3 sessions/week |
|---|---|---|
| 6 | 106.3 | 8.2 |
| 12 | 53.2 | 4.1 |
| 24 | 26.6 | 2.1 |

**Decision rule:** if measured `months_needed > 12`, the producer must propose cuts in the same
gate dossier. The cut order is fixed (§2.7). Cutting is the default response to a bad number, not
a last resort.

---

## 5. SESSION BUDGET TO GATE:P4

Planning envelope, revisable only by a ledger trade. One session = one agent work block ≤ 30 min.

| phase | budget (dev_sessions) | spent | remaining |
|---|---|---|---|
| P0 | 30 | 1 | 29 |
| P1 | 34 | 0 | 34 |
| P2NET | 40 | 0 | 40 |
| P2SYS | 32 | 0 | 32 |
| P3ART | 60 | 0 | 60 |
| **total to P4** | **196** | **1** | **195** |

At 3 sessions/week that is ≈ 15 months to GATE:P4 — **before** P4 content, which is expanded at
gate entry precisely because projecting it now would be fiction.

---

## 6. THE CUT ORDER (D85)

housing → economy depth → world events → craft tiers → 3rd companion → 2nd zone → extra difficulty
→ PvP → guilds → auction house → open zones → S3 capacity.

**NEVER CUT:** propagation · visible consequences · server authority · anti-dupe ledger ·
persistence integrity · GDD coverage · accessibility basics · FR/EN · license provenance ·
separated animation architecture.

---

## 7. WHAT THIS DOCUMENT REFUSES TO CLAIM

- that AI agents multiply throughput by an amount nobody measured;
- that a free tier is a hosting plan;
- that "MMO-scale" means anything without a player count next to it;
- that a vertical slice proves a game;
- that a schedule survives contact with the first unmeasured dependency.

Every number above is either REFERENCE (external, re-verified) or ASSUMPTION (internal, replaced by
measurement at the phase named). None is presented as measured.
