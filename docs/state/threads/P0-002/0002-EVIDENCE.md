## 2026-11-18T00:36:00Z | tools-engineer -> all | EVIDENCE

**claim:** P0-002 passes its acceptance and the new validator is falsifiable, not decorative.

**evidence** (`docs/state/evidence/20261118T001004Z-P0-002/`)
- `01-stub-generation.log` — 21 stubs written; each line names the owner **from the map** and the task that
  references it. The two disputed files say `DISPUTED — map says orchestrator, task WF-002 says tools-engineer`.
- `02-stubs-fail.log` — 21 run, 21 exit 1 with `NOT IMPLEMENTED`, 0 broken.
- `03-validate-blueprint.log` — `RESULT: PASS — 63 tasks, 11 gates, 0 error(s), 13 warning(s)`, exit 0.
- `04-blueprint-negative-tests.log` — 6/6: baseline 0; B1 gate cycle 1; B2 foreign writer 1; B5 art while
  NET-GATE unpassed 1; B7 missing acceptance script 1; B8 oversized undeclared 1.
- `05-agents-skills.log` — 32 agents, 51 skill stubs.
- `06-opencode-tree.log` — 32/32 owners covered, no extra agent, 0 agent problems, 0 missing skills,
  51/51 skills carry a description.

**parser equality** — `scripts/lib/yaml.mjs` output equals PyYAML `safe_load` on `BLUEPRINT.yaml`,
`OWNERSHIP.yaml` and `SCOPE_LEDGER.yaml` (deep equality, exit 0). The parser refuses unknown syntax with a
line number rather than guessing.

**interpretations, recorded to be challenged**
1. **B1 is a cycle rule, not a rank rule.** A task may depend on a gate that does not require it. `NG-001`
   depends on `GATE:P2NET` by design; a rank rule would reject the master's own blueprint.
2. **B2 exemptions are printed.** 3 scaffold tasks (`P0-002`, `P0-003`, `TRACER-001`) write outside their
   agent's globs; §4.2 allows it, so it is a warning with the offending paths, never a silent pass.
3. **B2 append-only zones allow new files.** `docs/adr/**` resolves to `producer` by catch-all, but any agent
   may create a *new* file there. The validator checks `existsSync`: a new path passes, an overwrite does not.
4. **B3/B4/B5 are deferred, not skipped.** They depend on runtime state (ledger maturity, authorized tier,
   NET-GATE). They are enforced on P0 tasks now and listed as DEFERRED for the other 32.
5. **B7 treats a stub as a warning.** A missing script is an error; a declared failing stub means "not
   verifiable yet", which is honest. The 21 stubs are counted and printed.

**defects found before commit**
- The first glob compiler escaped `*` before translating it, so `docs/**` compiled to `^docs\/.[^/]*$` and
  matched almost nothing. Every ownership check was vacuous; the validator said PASS on a broken map.
  Fixed by compiling wildcards character by character. This is why the negative tests exist.
- The B8 negative test initially edited a task whose `out` list did not match the sed pattern, so the test
  passed for the wrong reason (no mutation). Rewritten to append to `SC-001`'s real line; it now fails when
  the validator does not catch it.

**measured**
- 63 tasks, 11 gates, 9 phases, 0 duplicate ids, 0 missing required field
- 13 warnings: 3 B2 scaffold, 1 B2 dispute D-002, 1 B3 deferral, 1 B4/B5 deferral (32 tasks), 7 B8 splits
- 32 agents for 32 owners; 51 skills; 21 failing stubs

**impact:** concept_role `sup`; SL-P0-002, 1 session; tier S0; no GDD module exists yet (P1).
**ask:** none for this task. **D-002 remains open** and blocks WF-002, not P0-002.
**deadline:** GATE:P0
