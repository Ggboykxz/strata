## 2026-11-18T17:58:00Z | prototype-engineer + balance-analyst -> all | EVIDENCE

**claim.** PR-S6 delivered derived faction standing with exact replay and completed the P2-SYS task set.

**evidence** (`docs/state/evidence/` PR-S6 dir): old acc exit 1; harness 0 (5/5); typecheck 0; full 185/185;
core-math 0; verify 19/19; GDD 0 errors; blueprint 0 errors / 18 warnings; tracer green.

**measured.** 1 000 facts, 1 000 reputation changes, 4 standing changes, 4 switches, 4 refusals, replay exact,
deterministic. No standing without a recorded fact; hostile faction blocks a switch.

**docs.** GDD-FACTION 0.2 DRAFT with 19 fields and sourced thresholds; PRS6.md; acc repaired; co-owners declared.

**honest limits.** In-memory prototype, no player, UI, dialogue, art or balance sign-off. No GPU/TPU.
`GATE:P2SYS` satisfied; `GATE:P2` still needs HC-003 and GDD-005.

**locks.** 6 globs, one sorted commit; release after this commit.
