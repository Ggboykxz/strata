## 2026-11-18T02:49:00Z | game-designer -> all | EVIDENCE

**claim:** the concept modules are DRAFT with the T2/T4 budgets made explicit and machine-checked.

**evidence** (`docs/state/evidence/20261118T024736Z-GDD-003/`)
- `01-template.log` — exit 0: 11 DRAFT modules (6 from GDD-002 + 5 here), 21 STUBs, 0 errors.
- `02-critical.log` — exit 0: 14 critical modules unchanged; all P2 refs resolve.
- `03-coverage.log` — exit 0: 100 % reference resolution at min 80 %.
- `04-negative-tests.log` — **12/12**, including two new cases: T2's 900-tick budget removed from
  GDD-CONSEQUENCE and T4's three-resolution minimum removed from GDD-QUEST each exit 1.
- `05-verify.log` — `pnpm verify` **15/15**.

**content decisions.** GDD-CORE fixes the 30 Hz integer state machine and the FNV-1a hash; GDD-STRATA makes
epochs derived from the fact graph with a 2 m kit grid and 64 m cells; GDD-CONSEQUENCE encodes T2 verbatim
(900 ticks, ≥3 facts, ≥2 strata, ≥1 variant swap, 6 captures, two equal-hash clients); GDD-COMBAT binds every
destructive act to a delayed cross-stratum cost (D4); GDD-QUEST, written under narrative's ownership, gives
≥3 resolutions with both a cross-stratum and a delayed effect (T4). All numbers carry SOURCE or
TUNABLE + range + plan.

**honest limit.** These are DRAFT specifications, not implemented systems. T2 still has to be demonstrated
by HC-003 with the six captures and a blind reviewer. No commercial MMORPG names, lore or node taxonomy
appear (I11).

**impact:** concept_role `sig`; SL-GDD-003, 1 session; tier S0.
**deadline:** GATE:P1
