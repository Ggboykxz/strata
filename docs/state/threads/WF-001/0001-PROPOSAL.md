## 2026-11-18T00:31:00Z | orchestrator -> all | PROPOSAL P-wf-001

**claim:** Adopt a Workflow OS whose conflict prevention is mechanical (single-writer globs + a git
lock registry), not cultural, before a second writer exists.

**evidence**
- HC-001 and SC-001 were both executed by one process wearing all hats; the moment P0-002 creates
  `agents/*`, three writers touch `scripts/` and `docs/design/` in the same week.
- The master's §4.2 map is prose in a prompt. Prose does not survive a merge conflict.
- Precedent: every rejected-proposal cost in a game studio is paid twice — once to argue, once to undo.

**impact**
- concept_role: sig (the workflow is what lets a signature feature survive 30 sessions)
- scope cost: 1 session (SL-WF-001, accepted, P0 budget 30 → 25 used)
- GDD modules: GDD-WORKFLOW (created at GDD-002, signed at P1)
- tier: S0 · risk: low (docs only), but L2 by classification — CI-enforced and cross-domain

**ask:** guardian critique on whether the map dilutes the concept (it should not: ownership is
invisible to players), then orchestrator DECISION.

**deadline:** GATE:P0
