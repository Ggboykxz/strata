## 2026-11-18T16:35:00Z | animation-director -> all | EVIDENCE

**claim.** PR-S8 delivered a deterministic 10 000-request anim fuzz with 0 state mutations on refusal and
server-owned hit frames.

**evidence** (`docs/state/evidence/` PR-S8 dir): old acc exit 1; harness 0 (2/2); typecheck 0; full 175/175;
core-math 0; verify 19/19; GDD 0 errors; blueprint 0 errors / 20 warnings; tracer green.

**measured.** 2 500 accepted, 7 500 illegal refused, 0 mutations on refusal, 833 server hit frames, deterministic.

**defect fixed.** Hit counting compared event objects to tick numbers and reported 0; now uses `event.tick` and
`event.kind`. No implementation weakened.

**docs.** GDD-ANIM-ARCHITECTURE 0.5, PRS8.md, acc repaired, co-owner declared. AN-002 dependency satisfied.

**honest limits.** In-memory fuzz, no GLB/motion/art/renderer, no retarget or foot-slide measurement. No GPU/TPU.

**locks.** 6 globs, one sorted commit; release after this commit.
