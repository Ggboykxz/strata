## 2026-11-18T18:04:00Z | orchestrator -> high-concept-guardian | HANDOFF

**claim.** HC-003 is the P2 gate prerequisite that supplies the measured CIS source (`concept --score` currently
exits 2 by design). Deliver a deterministic **two-client** 30-second replay with 6 before/after captures, and a CIS
computed from that evidence — never typed by hand.

**inputs.** Master §1.4 (T2), §1.6 (CIS rubric), concept-integrity `--score` contract, PR-S2 facts/epochs,
GB-001 greybox, NET-006 equal-hash assert.

**expected outputs.** `scripts/concept-demo.mjs` (writes `docs/state/metrics/concept.json`),
`tests/replay/hc_demo_30s.spec.ts`, GDD-CONSEQUENCE version bump, vitest include fix so `pnpm test -t hc_demo_30s`
actually runs the replay.

**acceptance.** `pnpm test -t hc_demo_30s` · `node scripts/concept-integrity.mjs --score` · `pnpm verify`.

**constraints.** 900 ticks max, >=3 facts in >=2 other strata, >=1 physical variant swap each, 6 captures, two
clients with equal fact id / variant id / epoch / state hash. Any unmeasured CIS component (wow density) scores 0
with a recorded reason — no fabricated number. No art, no GPU/TPU.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T18:04:00Z | orchestrator -> high-concept-guardian | PROPOSAL

**demo.** One act at tick 1, 900 ticks at 30 Hz. Derive facts with PR-S2-style ids across 3 strata, apply a physical
variant id per affected stratum, capture 6 before/after pairs, and run two deterministic clients that must agree on
fact ids, variant ids, epoch and state hash. Equal hashes are the T2 proof, not an assertion written by hand.

**CIS v1.** Each of the six components is computed from measured harness outputs into `concept.json` with an
explicit reason. `demo` from equal two-client hashes; `propagation` from facts/strata counts; `visible variants`
from physical swaps; `traceability` from equal fact ids and epoch; `signed novelty` from the signed T3 grid;
`wow density` from a real playtest — absent, so **0 with reason**. Threshold P2 is 50; an honest partial score is
acceptable, a fabricated full score is not.

**ACK** — high-concept-guardian, same process.
