## 2026-11-18T02:45:00Z | orchestrator -> game-designer + narrative | HANDOFF

**claim:** GDD-003 can start. GDD-002 advanced six critical modules; this task advances the five concept
modules that carry T2 and T4.

**inputs:** master §1.4 T2/T4, §3.2–3.7, `docs/design/GDD.md` 19 fields, VISION v1.0, GDD-CONSEQENCE draft
from GDD-002. Ownership: GDD-QUEST is narrative's (co-agent); the other four are game-designer's.

**expected outputs:** GDD-CORE, GDD-STRATA, GDD-CONSEQUENCE, GDD-COMBAT, GDD-QUEST advanced to DRAFT;
T2/T4 numbers enforced in `validate-gdd.mjs`; generator committed under `tools/qa/`.

**acceptance:** template 0, critical 0, coverage 0, 12 negative cases, verify 15/15.

**constraints:** one act → ≥3 facts in ≥2 strata within 900 ticks with ≥1 physical variant and 6 captures;
≥3 quest resolutions with cross-stratum and delayed effects; no scripted epoch, no text-only consequence,
no commercial IP. Every field-5 number has SOURCE or TUNABLE range + plan.

**deadline:** ≤ 30 min · **rollback:** revert the five modules and the validator check
**ACK** — game-designer with narrative co-agent, same process.
