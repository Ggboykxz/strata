# DISPUTES — arbitration record (§4.6)

Every arbitration produces: a DECISION entry in the task thread, a line here, and an ADR if the
decision changes architecture or design.

Ladder: (1) domain owner → (2) orchestrator by authority order → (3) better prototype evidence, else
cheaper ≤30 min spike → (4) guardian VETO stands → (5) Director only (scope, money, licensing, art
direction, lore).

Agents never argue in code comments, commit messages or PR titles.

| id | date | task | parties | level | question | decision | evidence | adr |
|---|---|---|---|---|---|---|---|---|
| D-002 | 2026-11-18 | WF-002 | orchestrator vs tools-engineer | 5 | §4.2 assigns `validate-ownership.mjs` and `validate-locks.mjs` to the orchestrator; the WF-002 task assigns them to tools-engineer | **RESOLVED 2026-11-18 — option A** (Director instruction): WF-002 runs as orchestrator, the two validators are explicit map entries, and the §12 extraction carries a cited governance amendment. The refusal is lifted. | `docs/adr/A0002_workflow-validator-ownership.md` | A0002 |
