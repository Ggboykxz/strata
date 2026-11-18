# HIGH CONCEPT — STRATA

| field | value |
|---|---|
| id | HC |
| version | 1.3 (LOCKED — Director-signed amendments of 2026-11-18) |
| owner | high-concept-guardian |
| status | LOCKED — amended only by Director-signed ADR (`concept-amendment`) |
| amended_by | ND-001 / FINDING-001 — Option A, Director instruction 2026-11-18 (scope of the 25-word T1 limit unchanged); T3 signed at GATE:P0 per §1.4 |
| last_validated | 2026-11-18T00:52Z |
| validator | `node scripts/concept-integrity.mjs --check` |

Authority: §1 of the STRATA master (v8.1). This document is the canonical concept source once
`docs/CONSTITUTION.md` exists. It outranks GDD, SCOPE, and every task.

---

## 1. THE SENTENCE (locked v1.0)

**EN — v1.1, locked, verbatim:**

> In STRATA, every deed rewrites history: burn a Stone Age forest, no medieval abbey exists, a future megacity is desert — and the world remembers forever.

**FR — v1.1, locked, verbatim:**

> Dans STRATA, chaque geste réécrit l'histoire : brûler une forêt de l'âge de pierre, aucune abbaye médiévale n'existe, une métropole future devient un désert — et le monde s'en souvient pour toujours.

**Signature (one line, never paraphrased in marketing):**

> CROSS-STRATUM CONSEQUENCE PROPAGATION — visible, permanent, traceable, attributed.

---

## 2. WHAT IT IS / WHAT IT IS NOT

**It is** a browser-based full MMORPG, delivered through a vertical slice, in which the world's history is a
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
| EN | 25 | 25 | pass (was 29; FINDING-001 resolved 2026-11-18) |
| FR | 30 | 35 | pass |

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

## 5. NOVELTY GRID v1 (SIGNED — GATE:P0, 2026-11-18)

Claim: the combination, not any single property, is the novelty.

| # | property | prior art pressure | our twist |
|---|---|---|---|
| N1 | persistent authored world facts | high (shared-world MMOs) | facts are the *only* history; no scripted epoch |
| N2 | cross-era propagation | low | the same topology is re-read by three strata; one act, three images |
| N3 | consequence attribution as politics | medium (reputation systems) | "who erased the abbey?" is answerable from the log, permanently |
| N4 | paradox as an economic regulator | low | over-harvest spawns Rouille, which erases nodes in *other* eras |

Uncombined properties: **N2 × N4** (spatial propagation driven by an economic regulator that
penalises the actor's own future) is the defensible core.

**Signature — GATE:P0, 2026-11-18 — high-concept-guardian.**
Basis for the signature, not a self-report: the table above records prior-art pressure for each property
(high / low / medium / low); N1 and N3 are well-covered individually, while **N2 × N4** is the combination
that is not. The claim is therefore about the *combination*, exactly as T3 requires, and the grid holds
four properties against a minimum of three. Re-sign at each subsequent gate with the prototype evidence
available at that gate (§1.4: "re-signed at each gate"); a signature at P0 is not a permanent certificate.

---

## 6. CONCEPT DEBT REGISTER

Debt blocks gates above P3 when open count > 5. Text-only consequences count as debt.

| id | debt | opened | owner | deadline | blocking |
|---|---|---|---|---|---|
| CD-001 | T1 EN sentence exceeded the 25-word limit by 4 words (FINDING-001) — **CLOSED 2026-11-18**, EN now 25 words, FR re-reviewed at 30 | 2026-11-18 | high-concept-guardian → Director | closed | no |

---

## 7. FINDINGS

### RESOLVED FINDING-001 — locked EN sentence violated T1 (closed 2026-11-18)

**Status: CLOSED — Option A adopted.** Authority: the Director's session instruction of 2026-11-18 to
resolve the open Director blockers. The exact 25-word candidate was already written in this section and was
the published recommendation; no new lore was invented while closing the finding. The T1 limit itself is
unchanged at 25 words — the sentence was brought to the limit, not the limit raised to the sentence.

Measured 29 words against a 25-word limit before the amendment. The FR translation passed (31 ≤ 35), so
this was not a translation artefact: the source sentence was over budget.

Cause: the v1.0 sentence was written for rhythm and then a hard test was added around it.

**Resolution applied — Option A.** Preserves every claim; exactly 25 words:

> In STRATA, every deed rewrites history: burn a Stone Age forest, no medieval abbey exists, a future megacity is desert — and the world remembers forever.

Word count: In(1) STRATA(2) every(3) deed(4) rewrites(5) history(6) burn(7) a(8) Stone(9) Age(10)
forest(11) no(12) medieval(13) abbey(14) exists(15) a(16) future(17) megacity(18) is(19)
desert(20) and(21) the(22) world(23) remembers(24) forever(25) = **25**.

FR re-reviewed 2026-11-18 for parallelism and locked at 30 words:

> Dans STRATA, chaque geste réécrit l'histoire : brûler une forêt de l'âge de pierre, aucune abbaye médiévale n'existe, une métropole future devient un désert — et le monde s'en souvient pour toujours.

Cost: drops "while/becomes a wasteland" cadence; keeps burn → abbey → megacity → memory.
Option B (raise the T1 EN limit to 30) was rejected: it would weaken the cheapest test we own.

**Verification:** `node scripts/concept-integrity.mjs --check` now passes T1 and T3 at GATE:P0
(EN 25, FR 30, grid signed with the N2 × N4 basis above). The signature is gate-scoped: §1.4 requires a
re-signature with fresh evidence at each later gate.

---

## 8. CHANGELOG

| version | date | change | by |
|---|---|---|---|
| 1.0 | 2026-11-18 | bootstrapped from master v8.1 §1; T1 measured; FINDING-001 opened | high-concept-guardian |
| 1.1 | 2026-11-18 | ND-001 resolved: EN trimmed to 25 words, FR re-locked at 30; finding closed (limit unchanged) | Director instruction → high-concept-guardian |
| 1.2 | 2026-11-18 | T3 novelty grid signed at GATE:P0 per master §1.4 ("re-signed at each gate"); basis N2 × N4 recorded | high-concept-guardian |
| 1.3 | 2026-11-18 | ADR-A0003 (ND-009): vision wording becomes "full MMORPG, delivered through a vertical slice"; locked sentence, T1 and T3 unchanged | Director instruction → high-concept-guardian |
