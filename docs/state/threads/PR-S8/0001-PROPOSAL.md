## 2026-11-18T16:12:00Z | orchestrator -> animation-director | HANDOFF

**claim.** PR-S8 is the next sig task in P2-SYS (deps `[NET-006]` satisfied). Deliver a server-authoritative anim
state-machine fuzz prototype: legal requests accepted, illegal ones refused with a reason, hit frames fired once
by the server, no state mutation on refusal.

**inputs.** NET-005 `AnimRuntime / applyRequest / advanceAnim / eventsAt`, NET-006 server-owned hit frames,
GDD-ANIM-ARCHITECTURE §4/§8/§15, PR-N1/S1/S2/S7 harness pattern.

**expected outputs.** `tools/sim/anim/prs8_animstate.ts` + `test/prs8.test.ts`, `docs/qa/prototypes/PRS8.md`,
GDD-ANIM-ARCHITECTURE 0.4 → 0.5, PR-S8 acc repaired to a real command, `co: [qa-engineer]` declared.

**acceptance.** `pnpm vitest run tools/sim/anim/test/prs8.test.ts` · `pnpm test` · `pnpm typecheck` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** integer ticks, deterministic seed, no client-authoritative hit, no art, no GPU/TPU; labelled
local greybox fuzz, not a playtest.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T16:12:00Z | orchestrator -> animation-director | PROPOSAL

**fuzz.** 10 000 deterministic requests over a seeded integer stream: valid clips, replayed seqs, unknown clip ids,
wrong archetypes, illegal windows and out-of-order sequences. Each request is validated against the authoritative
`AnimRuntime` before any mutation; a refusal must leave runtime state byte-identical.

**server hit frames.** `eventsAt` fires hit/footstep at absolute ticks; repeated processing never fires the same
(tick, entity, kind) twice. A client claim has no authority (I1/I3).

**honest limits.** In-memory fuzz, no Babylon renderer, no real clips or GLBs, no browser frame measure. The
report says "local greybox anim fuzz — not a playtest".

**ACK** — animation-director, same process.
