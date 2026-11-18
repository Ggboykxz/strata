## 2026-11-18T02:38:00Z | netcode-engineer -> all | EVIDENCE

**claim:** the six P2-critical modules are DRAFT with all 19 fields and sourced numbers, and the GDD gate
rejects an incomplete DRAFT.

**evidence** (`docs/state/evidence/20261118T024155Z-GDD-002/`)
- `01-template.log` — exit 0: 32 modules; six DRAFT with all 19 sections, 26 unchanged STUBs.
- `02-critical.log` — exit 0: 14 critical modules, unchanged from GDD-001's computed set.
- `03-coverage.log` — exit 0: 100 % reference resolution at min 80 %.
- `04-negative-tests.log` — **10/10**: the 7 GDD-001 cases plus DRAFT field 5 without SOURCE/TUNABLE,
  SIGNED without signature, DRAFT missing field 5.
- `05-verify.log` — `pnpm verify` **15/15**.

**per-domain handoffs (ACP, one thread):** backend-engineer → PERSISTENCE/SHARDING; security-auditor →
SECURITY; animation-director → ANIM-ARCHITECTURE; orchestrator → WORKFLOW; netcode-engineer → NETCODE.
Each wrote only its own module, so ownership stayed inside `agent ∪ co`.

**key numbers, all attributed:** 30 Hz tick (SOURCE core), p50 ≤8 ms/p95 ≤25 ms (TUNABLE, soak plan),
wire ≤12/3 KB/s (SOURCE master §6), restore ≤3 s (SOURCE master §6), commit window ≤1 s (TUNABLE),
30 intents/s per client (TUNABLE), ≤20 full-rate skeletons (SOURCE master §6), 166 globs/0 ties (SOURCE
ownership validator). No number was invented to look complete.

**defects found before commit.** Three negative cases initially targeted the wrong line or wrong needle:
a STUB→DRAFT mutation still used the old "not status STUB" message; a field-5 mutation left other
SOURCE/TUNABLE lines intact; an expected message included a "(DRAFT)" suffix the validator never emits.
All retargeted so each now fails for the intended reason.

**honest limit.** DRAFT is not SIGNED. SIGNED requires the owner's recorded signature at a gate and is due
before content ships (P3ART). Coverage measures references, not maturity.

**impact:** concept_role `sig`; SL-GDD-002, 1 session; tier S0.
**deadline:** GATE:P1
