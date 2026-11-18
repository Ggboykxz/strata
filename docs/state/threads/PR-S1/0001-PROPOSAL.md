## 2026-11-18T11:02:00Z | orchestrator -> gameplay-engineer | HANDOFF

**claim.** PR-S1 is the next selectable task after the risk-accepted NET-GATE and the art handoff. Deliver the
greybox combat math prototype: TTK, attack windows and hit-stop, as integer tick counts with a labelled local
report. No art, no asset, no GPU/TPU (none available, ND-012).

**inputs.** GDD-COMBAT §4/§5/§6 (server-validated hit frames, 4 ms core tick budget), NET-006 `HitLedger`,
PR-N4 validity verdicts, PR-N1/N3/N4 harness pattern.

**expected outputs.** `tools/sim/world/prs1_combat.ts`, `tools/sim/world/test/prs1.test.ts`,
`docs/qa/prototypes/PRS1.md`, GDD-COMBAT version bump, PR-S1 acc repaired to a real command.

**acceptance.** `pnpm vitest run tools/sim/world/test/prs1.test.ts` · `pnpm test` · `pnpm typecheck` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** integer ticks only, no float in the math; labelled local greybox numbers, never a playtest or
FUN claim; no new dependency; greybox only (I2).
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T11:02:00Z | orchestrator -> gameplay-engineer | PROPOSAL

**model.** One attacker, one target, fixed HP and damage in integer units. The attack cycle is
`windup → active → recovery`, with a minimum `intervalTicks` between cycles. A landed hit freezes both parties for
`hitStopTicks` before the next cycle starts. TTK is the tick at which cumulative damage reaches HP.

**validation.** A window is legal only when windup and active are at least 1 tick, recovery is non-negative, and
the interval is not shorter than the window sum. An illegal window is refused, never clamped — the same rule the
server applies to anim requests (NET-005).

**honesty.** The report says "local greybox combat math — not a playtest, not FUN validation". TTK in ticks and
ms is derived from the 30 Hz tick, not measured in a browser. The 4 ms core tick budget is a GDD constraint, not
a measured number from this task. No audio, no VFX, no art.

**ACK** — gameplay-engineer, same process.
