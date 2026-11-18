# WORLD BIBLE — STRATA

| field | value |
|---|---|
| id | WORLD_BIBLE |
| version | 1.0 |
| owner | narrative |
| status | ACTIVE |
| valid language pairs | FR / EN |
| validated by | `node scripts/validate-lore.mjs` |

## 1. Source of truth

The locked HIGH_CONCEPT v1.3 is the only lore authority. VISION v1.0 and `GDD-STRATA` / `GDD-CONSEQUENCE`
derive the world shape from it. A fact in the world graph outranks any sentence in this bible: when a
recorded consequence renames a place, this document is updated in the same PR (I9).

> In STRATA, every deed rewrites history: burn a Stone Age forest, no medieval abbey exists, a future megacity is desert — and the world remembers forever.

## 2. The three strata

| stratum | place id | meaning |
|---|---|---|
| Stone Age | ashwood_basin | A river basin whose forest is the first causal anchor of the demo. |
| Abbey era | abbey_of_vauls | An abbey that exists only if the basin was not burned. |
| Megacity | neon_reach | A later city whose water comes from the same basin. |

The three are readings of one topology, not three maps. A fact swaps geometry or placement in at least two
of them (T2). No epoch transition is authored; epochs are computed from the fact graph (D5).

## 3. Naming rules per stratum

- **Stone Age**: names describe material and water — basin, ford, grove, quarry. No written institution.
- **Abbey era**: names describe institution and belief — abbey, cloister, scriptorium, pilgrim road.
- **Megacity**: names describe infrastructure and ownership — reach, stack, gate, meter, district.
- A name may be reused across strata only when the same location persists; the fact log decides.
- Proper nouns are original to STRATA. No name, title, faction or place from a commercial franchise is used.

## 4. Fact-driven renaming

A place changes name only when a recorded `fact_id` makes the change visible in another stratum. The new
name is added to the glossary with the fact id in the changelog. A rename with no fact id is a design
defect and is refused by `validate-lore.mjs`. A name that exists only in one stratum cannot be a shared id.

## 5. Glossary (FR / EN)

| id | EN | FR | translatable |
|---|---|---|---|
| ashwood_basin | Ashwood Basin | Bassin de Frêne | no |
| abbey_of_vauls | Abbey of Vauls | Abbaye de Vauls | no |
| neon_reach | Neon Reach | Réseau Néon | no |
| ford_of_thorns | Ford of Thorns | Gué des Épines | no |
| black_cinder | Black Cinder | Scorie Noire | no |
| glass_marsh | Glass Marsh | Marais de Verre | no |

Every proper noun used in quest and dialogue blueprints must appear here with both forms. Numeric and
temporal formats are locale-independent in logic; only presentation strings are localized.

## 6. Forbidden names

No commercial MMORPG, franchise, studio, actor, or asset pack name appears in this bible or in STRATA lore.
No borrowed node taxonomy, zone list, hero name or faction name. The validator rejects a fixed list and
reports the file and line.

## 7. Change log

| version | date | change | by |
|---|---|---|---|
| 1.0 | 2026-11-18 | three strata, naming rules, fact-driven renaming, 6 FR/EN glossary entries | narrative |
