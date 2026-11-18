## 2026-11-18T09:52:00Z | orchestrator -> qa-engineer | HANDOFF

**claim.** A0005 folds the NET-004 measurement deferral into PR-N1. Produce a **local** harness that measures
tick CPU p50/p95 and framed byte rates with a command, an exit code and a log (I13). It is not a network test:
no real clients, no RTT, no loss, no GPU/TPU (none available). The 30-minute soak named in the blueprint is not
performed; the report must say so rather than imply it was.

**inputs.** NET-001 `stepWorld`/`hashWorld`, NET-002 `encodeFrame`/`snapshotFromWorld`/`MAX_FRAME_BYTES`,
the 12 KB/s budget, A0005.

**expected outputs.** `tools/sim/load/prn1_load.ts`, `tools/sim/load/test/prn1.test.ts`,
`docs/qa/prototypes/PRN1.md`, PR-N1 acc repaired to a command that exists.

**acceptance.** `pnpm vitest run tools/sim/load/test/prn1.test.ts` · `pnpm test` · `pnpm typecheck` · `pnpm verify`.

**constraints.** no new dependency; numbers labelled local simulation CPU and framed bytes, never client RTT;
no claim that the wire budget is met (NET-101 owns AoI/delta); no art.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T09:52:00Z | orchestrator -> qa-engineer | PROPOSAL

The harness builds a deterministic 64-entity world, applies an integer intent script for N ticks, times the
tick step plus hash plus frame encode, and computes p50/p95 after discarding warmup ticks. It measures the
**same code path the server uses**, so it is useful, but it measures CPU on this machine only.

The byte number is the full-snapshot frame size × 30 Hz. It will exceed the 12 KB/s budget by about 3.9×;
that is the already-recorded NET-101 problem, not a failure to hide. `assert` checks structural truth
(determinism, round-trip, exact lengths), not that a tunable budget is met.

The blueprint's `pnpm sim prn1 --assert` cannot work: there is no `sim` script. The acc is repaired to the vitest
command that actually runs the harness. The report is committed under `docs/qa/prototypes/` (append-only zone).

**ACK** — qa-engineer, same process.
