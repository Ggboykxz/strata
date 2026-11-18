## 2026-11-18T02:56:00Z | orchestrator -> narrative | HANDOFF

**claim:** P1-002 can start. GDD-003 delivered GDD-QUEST, which this task's bible and glossary must serve.

**inputs:** HIGH_CONCEPT v1.3, GDD-STRATA, GDD-CONSEQUENCE, GDD-QUEST, master I11 original-IP rule.

**expected outputs:** `docs/design/WORLD_BIBLE.md` with a 6-entry FR/EN glossary, a real `validate-lore.mjs`
replacing the P0-002 stub, and a committed negative suite.

**acceptance:** validator 0, 5 negatives, ownership 0 ties, verify 16/16.

**constraints:** no commercial franchise name; every proper noun has FR and EN forms; a place rename must
carry a fact id; only narrative edits its own paths. The explicit `scripts/validate-lore.mjs` ownership
entry was added before the handoff (WORKFLOW.md §6).

**deadline:** ≤ 30 min · **rollback:** revert the commit
**ACK** — narrative, same process.
