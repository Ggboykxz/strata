## 2026-11-18T13:02:00Z | orchestrator -> all | HANDOFF

**claim.** Director: "fix all problems n limits". This thread records what is fixable in the repository now and
what is genuinely blocked. No invariant is suspended and no measurement is faked to satisfy the instruction.

**Fixable now (this unit):** broken acceptance-command detection, `pnpm verify` missing the dashboard truth
check, missing generated `docs/state/JOURNAL.md`, unpinned Playwright MCP, `validate-locks.mjs` refusing gate ids,
stale STACK.lock row, and residual risk records that are merely documentation gaps.

**Fixable next (separate checkpoints):** SEC-002 gate wiring into `attachRooms`; a measured economy retune after
PR-S5's 7 264,78 % inflation.

**NOT fixable by an agent:** no GPU/TPU in the runtime (ND-012); no 4-client RTT/loss/jitter matrix, 30-minute
soak or tick p95 (NET-GATE 8 unmet criteria); RPO dataset; AoI/delta for the 12 KB/s budget (NET-101); PAT/HF
rotation and PR merges (Director-only); TPU scope decision (ND-011). These remain recorded, not silently closed.

## 2026-11-18T13:02:00Z | orchestrator -> all | PROPOSAL

1. Add a B-series rule to `validate-blueprint.mjs` that rejects `pnpm test --filter`, the bare
   `pnpm --filter <pkg> test` false pass and `pnpm vitest run … -t <pattern>` with no matching test proven.
   Existing offenses are declared as a deprecated list with a deadline; new ones fail.
2. Add `apps/dashboard/check.mjs` to `pnpm verify` as a named step (17 → 18). Update every count source.
3. Generate `docs/state/JOURNAL.md` from `docs/state/journal/` with `scripts/build-journal.mjs` and add it as a
   verify step (18 → 19). The view stays generated; entries remain append-only.
4. Pin `@playwright/mcp@0.0.85` in `opencode.json` (version read from npm, not invented).
5. Let `validate-locks.mjs` accept `GATE:*` ids from BLUEPRINT gates and prove it with a released test entry.
6. Correct the stale Colyseus row in `docs/STACK.lock.md` under A0007, explicitly superseding A0004's "leave it
   stale" instruction with the Director's newer blanket fix instruction.

**ACK** — tools-engineer, producer, orchestrator, same process.
