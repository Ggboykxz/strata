# HIGH CONCEPT — STRATA

| field | value |
|---|---|
| id | HC |
| version | 1.0 (LOCKED) |
| owner | high-concept-guardian |
| status | LOCKED — amended only by Director-signed ADR (`concept-amendment`) |
| amended_by | none |
| last_validated | 2026-11-18T00:10Z |
| validator | `node scripts/concept-integrity.mjs --check` |

Authority: §1 of the STRATA master (v8.1). This document is the canonical concept source once
`docs/CONSTITUTION.md` exists. It outranks GDD, SCOPE, and every task.

---

## 1. THE SENTENCE (locked v1.0)

**EN — v1.0, locked, verbatim:**

> In STRATA, every act rewires history: burn a Stone Age forest and a medieval abbey never exists, while a future megacity becomes a wasteland — and the world remembers forever.

**FR — v1.0, locked, verbatim:**

> Dans STRATA, chaque geste réécrit l'histoire : brûler une forêt à l'âge de pierre efface une abbaye médiévale et change une métropole future en désert — et le monde s'en souvient pour toujours.

**Signature (one line, never paraphrased in marketing):**

> CROSS-STRATUM CONSEQUENCE PROPAGATION — visible, permanent, traceable, attributed.

---

## 2. WHAT IT IS / WHAT IT IS NOT

**It is** a browser-based, MMORPG-shaped systemic RPG in which the world's history is a
persistent, player-authored data structure, and every stratum visibly reads that structure.

**It is not** an open-world sandbox, a survival game, a roguelike with eras, or a narrative RPG
with a branching ending. Those can be built without the propagation graph; STRATA cannot.

| differentiator | one-line | falsifiable by |
|---|---|---|
| D1 time is a system | epoch state is computed, never scripted | deleting the epoch table and observing no gameplay change |
| D2 consequences are spatial | a fact swaps geometry in another stratum | a fact that only changes text |
| D3 permanent and traceable | the causal chain is replayable from the fact log | a consequence with no attributable fact id |
| D4 players antagonize their own future | optimal short-term play degrades a later stratum | a strategy with no cross-stratum cost |
| D5 epoch computed from the world | no hand-authored epoch transitions | a hardcoded epoch trigger |
| D6 collective authorship | consequences are shard-wide and named | an act that affects only its actor |

---

## 3. THE FOUR BLOCKING TESTS (§1.4)

### T1 — one sentence
EN ≤ 25 words · FR ≤ 35 words (translation amplification permitted).

**Measured 2026-11-18T00:10Z:**

| language | words | limit | verdict |
|---|---|---|---|
| EN | 29 | 25 | **FAIL — finding FINDING-001** |
| FR | 31 | 35 | pass |

### T2 — `hc_demo_30s` replay
One act · ≤ 900 ticks (30 s @ 30 Hz) · ≥ 3 facts landing in ≥ 2 other strata · ≥ 1 physical
variant swap per affected stratum · 6 before/after captures · a blind reviewer infers the causal
chain from the captures alone. From S1: **two** clients observe the same consequence — identical
`fact_id`, `variant_id`, `epoch` value, and equal state hash.

### T3 — novelty grid
≥ 3 uncombined properties, re-signed at every gate. See §5.

### T4 — depth
≥ 200 reachable world states · zero dead rules · zero orphan facts · every major quest ≥ 3
resolutions, each with a cross-stratum effect and a delayed effect.

---

## 4. CIS — CONCEPT INTEGRITY SCORE (0–100)

Blocking thresholds: **P2 ≥ 50 · P3 ≥ 80 · P4+ ≥ 85.**

| component | max | how it is measured (no self-report) |
|---|---|---|
| demo | 30 | `hc_demo_30s` replay passes T2, including the two-client equality check |
| propagation | 20 | count of reachable states and crossing facts from the PR-S2 propagation prototype |
| visible variants | 15 | geometry/lighting swap proven by capture diff, never text |
| wow density | 15 | beats per 10 min measured in a recorded playtest |
| traceability | 10 | every visible variant resolves to a fact id and an actor id |
| signed novelty | 10 | T3 grid signed by the guardian at the current gate |

`CIS` is computed by `scripts/concept-integrity.mjs --score` from
`docs/state/metrics/concept.json`. **No human types a CIS number into a report.**

---

## 5. NOVELTY GRID v1 (unsigned — P0)

Claim: the combination, not any single property, is the novelty.

| # | property | prior art pressure | our twist |
|---|---|---|---|
| N1 | persistent authored world facts | high (shared-world MMOs) | facts are the *only* history; no scripted epoch |
| N2 | cross-era propagation | low | the same topology is re-read by three strata; one act, three images |
| N3 | consequence attribution as politics | medium (reputation systems) | "who erased the abbey?" is answerable from the log, permanently |
| N4 | paradox as an economic regulator | low | over-harvest spawns Rouille, which erases nodes in *other* eras |

Uncombined properties: **N2 × N4** (spatial propagation driven by an economic regulator that
penalises the actor's own future) is the defensible core. Signing deferred to GATE:P1.

---

## 6. CONCEPT DEBT REGISTER

Debt blocks gates above P3 when open count > 5. Text-only consequences count as debt.

| id | debt | opened | owner | deadline | blocking |
|---|---|---|---|---|---|
| CD-001 | T1 EN sentence exceeds the 25-word limit by 4 words (FINDING-001) | 2026-11-18 | high-concept-guardian → Director | GATE:P0 | no (T1 is not gate-enforced at P0) |

---

## 7. FINDINGS

### FINDING-001 — locked EN sentence violates T1

Measured 29 words against a 25-word limit. The FR translation passes (31 ≤ 35), so this is not a
translation artefact: the source sentence is over budget.

Cause: the v1.0 sentence was written for rhythm and then a hard test was added around it.

Two legal resolutions, both `needs-director` (lore canon is never delegated):

**Option A — trim the EN sentence (recommended).** Preserves every claim, 25 words exactly:

> In STRATA, every deed rewrites history: burn a Stone Age forest, no medieval abbey exists, a future megacity is desert — and the world remembers forever.

Word count: In(1) STRATA(2) every(3) deed(4) rewrites(5) history(6) burn(7) a(8) Stone(9) Age(10)
forest(11) no(12) medieval(13) abbey(14) exists(15) a(16) future(17) megacity(18) is(19)
desert(20) and(21) the(22) world(23) remembers(24) forever(25) = **25**.

Cost: drops "while/becomes a wasteland" cadence; keeps burn → abbey → megacity → memory.
Risk: FR text must be re-reviewed for parallelism but stays within its own budget.

**Option B — raise the T1 EN limit to 30 words via ADR.** Cheaper, but weakens a test that exists
to stop the pitch from becoming a paragraph. Not recommended: T1 is the cheapest test we own.

**Until signed:** `concept-integrity.mjs --check` exits **1** on FINDING-001. This is intentional —
a green check must mean the concept obeys its own tests.

---

## 8. CHANGELOG

| version | date | change | by |
|---|---|---|---|
| 1.0 | 2026-11-18 | bootstrapped from master v8.1 §1; T1 measured; FINDING-001 opened | high-concept-guardian |
