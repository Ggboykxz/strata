## 2026-11-18T00:58:00Z | orchestrator -> all | EVIDENCE

**claim:** WF-002's two validators are real, green on the repo and falsifiable.

**evidence** (`docs/state/evidence/20261118T005800Z-WF-002/`)
- `01-validate-ownership.log` — **exit 0**; 32 owners, 164 globs, 7 catch-all; 0 errors, 8 scaffold warnings;
  every witness path resolves to its declaring owner; A0002 guard intact.
- `02-validate-locks.log` — **exit 0**; schema v1, branch `state/locks`, ttl 60 / heartbeat 10, 4 rules,
  empty registry reported explicitly as valid.
- `03-negative-tests.log` — **8/8**: baseline ownership 0; identical glob with two owners 1; task output
  outside owner set 1; A0002 regression (explicit globs removed) 1; baseline locks 0; ttl=0 1; duplicate
  active path glob 1; unknown lock owner 1.
- `04-stubs-fail.log` — the two stubs are gone; **19** declared stubs remain, 19/19 still exit 1.

**defects found before commit**
1. The first negative test targeted P0-001's old role/GDD signature; it passed for the wrong reason (the
   mutation never applied). Rewritten against the real task line and the needle made generic.
2. The lock negatives appended list items after `locks: []`, which is invalid YAML — the validator exited 2
   ("unreadable"), which looked like a pass but was not the intended failure. The fixture now replaces
   `locks: []` with a real sequence.

**integration note.** `pnpm verify` does not yet run these two validators: `scripts/verify.mjs` is
tools-engineer-owned and WF-002's agent is orchestrator. A handoff is required to add them to the enabled
steps. It is recorded in the journal and executed by tools-engineer in the following commit.

**impact:** concept_role `sig` (the OS now enforces itself); SL-WF-002, 1 session; tier S0.
**ask:** code-reviewer critique answered on the record in `0004-DECISION.md`. Author ≠ reviewer still holds
for the eventual merge; the Director merges.
**deadline:** GATE:P0
