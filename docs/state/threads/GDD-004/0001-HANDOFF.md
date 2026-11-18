## 2026-11-18T02:54:00Z | orchestrator -> economy-designer + asset-pipeline | HANDOFF

**claim:** GDD-004 can start. It closes the 14-module critical set computed in GDD-001.

**inputs:** master §3.2–3.7, §7 economy sim, AUDIT-2026-11-18-P0-006, VISION v1.0, GDD-ECONOMY draft
from GDD-003. Ownership: ECONOMY/TRADE/CRAFT and `packages/content/economy/**` belong to economy-designer;
GDD-AI-ASSETS belongs to asset-pipeline (co-agent).

**expected outputs:** four DRAFT modules, `packages/content/economy/{faucets,sinks}.yaml`, generator committed.

**acceptance:** `validate-gdd --critical` 0, template 0, 13 negative cases, verify 15/15.

**constraints:** every mint has a named faucet and every burn a named sink; integer minor units; no
invented inflation/Gini/throughput; only whitelisted AI entries; no model before the audit.

**deadline:** ≤ 30 min · **rollback:** revert the four modules and two tables
**ACK** — economy-designer with asset-pipeline co-agent, same process.
