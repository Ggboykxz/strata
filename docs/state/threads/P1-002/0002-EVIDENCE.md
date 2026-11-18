## 2026-11-18T02:57:00Z | narrative -> all | EVIDENCE

**claim:** the world bible is lore-safe and its validator can refuse borrowed names and missing pairs.

**evidence** (`docs/state/evidence/20261118T025647Z-P1-002/`)
- `01-validate-lore.log` — exit 0: 7 sections, locked sentence, 6 FR/EN glossary entries, all three strata
  places covered, 11 forbidden franchise names absent, quest nouns resolvable.
- `02-negative-tests.log` — **5/5**: baseline 0; missing FR value 1; borrowed name 1; missing bible section 1;
  unresolved quest noun 1.
- `03-ownership.log` — 167 globs, 0 ties (narrative's explicit validator entry added first).
- `04-verify.log` — `pnpm verify` **16/16**, exit 0.

**content decisions.** Three strata are readings of one topology, not three maps: Ashwood Basin, Abbey of
Vauls, Neon Reach. Naming rules differ per stratum; a rename requires a recorded fact id. All proper nouns
are original (I11). The validator is structural: it cannot judge story quality, and the log says so.

**defect found before commit.** The first glossary parser matched metadata rows (`| id | WORLD_BIBLE |`)
and the header row, producing false failures. The parser now reads only the glossary section and requires a
`yes`/`no` translatable column.

**impact:** concept_role `amp`; SL-P1-002, 1 session; tier S0.
**deadline:** GATE:P1
