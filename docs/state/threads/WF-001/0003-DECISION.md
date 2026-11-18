## 2026-11-18T00:41:00Z | orchestrator -> all | DECISION D-wf-001

**claim:** WF-001 is accepted with both guardian amendments. The Workflow OS is ACTIVE from this commit.

**decision**
1. `docs/WORKFLOW.md` is binding. `docs/state/OWNERSHIP.yaml` is the machine-readable map;
   `docs/state/LOCKS.yaml` is the registry; `docs/production/DISPUTES.md` is the arbitration record.
2. **Amendment 1 — commit attribution.** Every commit adds the trailer `Agent: <agent-name>`.
   Rationale (guardian CRITIQUE 0002): when one process wears every hat, the commit trailer is the
   only authorship record that cannot be edited by the next writer. Threads corroborate; they do not
   constitute. Applies forward from this commit; HC-001 and SC-001 predate the rule and keep their
   task-tagged messages.
3. **Amendment 2 — ties fail.** A glob owned by two agents is a CI failure (WF-002), never resolved
   by seniority or by the orchestrator's preference.
4. The known §4.2 ↔ WF-002 inconsistency (`scripts/validate-ownership.mjs` owned by orchestrator,
   task assigned to tools-engineer) is recorded, not silently resolved. P0-002 must produce an ADR
   pick: either WF-002 runs as orchestrator, or the map entry moves to tools-engineer.

**consequence**
- WF-002 is `refused_ownership` as currently written until that ADR lands. This is the OS working
  correctly on its first day, not a defect.
- No player-facing impact.

**evidence:** `docs/state/evidence/20261118T001004Z-WF-001/`
**tier:** S0 · **concept_role:** sig · **scope:** SL-WF-001, 1 session, P0 25/30 used
**deadline:** GATE:P0
