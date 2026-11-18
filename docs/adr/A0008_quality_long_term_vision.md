# A0008 — long-term vision: benchmark quality, original IP, no shortcut

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18**, Director statement transcribed verbatim |
| accepted_by | Director (`2026-11-18-s02`) |
| date | 2026-11-18 |
| task | all remaining phases |
| supersedes | nothing — reinforces A0003 (full MMORPG via vertical slice) and A0006/A0007 (fix what is fixable, record the rest) |

## Context — Director statement

> on est entrain de faire un ashes of creations sur le long terme avec babylon js avec de qualité jamais vu ne l oublie pas que la qualité compte peut importe le temps qu il faudra donc ils te faut prendre les bonnes decisions

**Boundary (I11).** "Ashes of Creation" is named as a **quality benchmark**, not as content to copy. I11 requires
original IP and provenance for every asset; the GATE:P0 dossier explicitly records that copying that commercial
IP is forbidden. Factions, names, lore, meshes, textures, motion and UI must be original or CC0/audited — never
traced from that game.

## Decision — what quality means operationally here

1. **Server truth before visuals (I1/I14).** The deterministic core, tick, hash and wire are proven before art.
   NET-GATE is signed-with-risk with 8 unmet measurement criteria — visual work does not start because a Director
   signed under time pressure; it starts when the measurements exist.
2. **Evidence over adjectives (I13).** Every number comes from a command, exit code and log in
   `docs/state/evidence/`. A prototype report that says "feels good" is not evidence. Budgets in GDD-STRATA,
   GDD-ECONOMY and ART_BIBLE stay binding; a retune is recorded with before/after numbers.
3. **Audited stack (I4).** Babylon.js 9.37.0 is pinned and audited (Apache-2.0). New packages, editors or models
   need their own licence and transitive-dependency entry before use. A blog/video claim is research, not adoption.
4. **Vertical slice before scale (A0003).** Full MMORPG is the long-term target; the slice proves propagation,
   authority and economy first. Capacity tiers grow only after measurements.
5. **No silent bypass.** A gate signature is a risk acceptance with the unmet criteria attached; a review bypass
   is recorded with its reason; no CI is disabled, no assertion weakened, no metric fabricated to look green.
6. **Time is not an excuse.** "Quelle que soit le temps" means we keep the failing budget, the 7 264,78 % before
   value and the 8 unmet NET-GATE criteria in the record rather than hiding them to ship sooner.

## Consequences

Decisions are made against the constitution's authority order: INVARIANTS > DIRECTOR > HIGH CONCEPT > SCOPE LEDGER
> GDD > WORKFLOW OS > NETCODE/ENGINE CONTRACTS > PROTOTYPE EVIDENCE > ART PIPELINE > BLUEPRINT TASK > CODE.
The current sequence (P2-SYS → GATE:P2 → P3-ART with original, audited assets) is unchanged. This ADR suspends no
invariant. When hardware or Director actions are missing, the work is recorded as blocked, not faked.
