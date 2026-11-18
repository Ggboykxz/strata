# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T09:11Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| also open | **PR #2** dashboard truth repair — `session/20261118-dashboard-truth`, base = session branch |
| mode | RESUME |
| tier | current `S0`, authorized **`S1`** |
| last task | **NET-005** — anim state machine + clip manifest; GDD-ANIM-ARCHITECTURE 0.3 |
| next task | **NET-003** — rooms/lifecycle/reconnect — **blocked on a producer-owned Colyseus pin** |
| blocker | ND-004/ND-005 token rotation, PR #1 and #2 merges. ND-011 needs one answer (TPU scope). |

---

## 1. State at hand-off

`pnpm verify` **17/17** · anim **22/22** · full suite **73/73** (7 files) · `pnpm tracer --assert` green.

```bash
pnpm install --frozen-lockfile && pnpm verify
pnpm vitest run packages/core/test/anim-state.test.ts
pnpm vitest run packages/protocol
pnpm vitest run apps/server
pnpm tracer --assert
```

Runtime is ephemeral: `git clone` + `corepack prepare pnpm@12.21.0 --activate` recovers everything.

## 2. NET-003 — first choice, and why it may not start

`{id: NET-003, agent: backend-engineer, gdd: [GDD-SHARDING#instances], deps: [NET-002],
out: [apps/server/src/rooms/]}`

The blocker is the dependency: rooms mean **Colyseus**, and `docs/STACK.lock.md` still says
`Colyseus | NOT INSTALLED | NET-001`. Adding it is a **stack change owned by the producer** (`docs/**` is the
producer's glob, `OWNERSHIP.yaml` line 56), not by netcode-engineer and not by the orchestrator. Before NET-003:

1. producer hand-off: pin the exact Colyseus version, record the licence (MIT) and its transitive graph in
   `docs/STACK.lock.md`, and correct the stale `NET-001` target;
2. then NET-003 acquires `apps/server/src/rooms/**` + `packages/protocol/**` if the handshake grows.

There is no dependency-free fallback left in P2NET: NET-004 depends on NET-003, NET-006 on NET-004+NET-005,
PR-N1/N4 on NET-006, PR-N2/N3 on NET-003, SEC-001 on NET-006. If the Director does not want Colyseus, the
next safe work is tooling (below), not another network task.

## 3. Known defect: 10 broken acceptance commands

`pnpm test --filter <pkg>` is invalid: vitest has no `--filter` (`CACError`, exit 1). Two *other* forms are
also traps:
- `pnpm --filter <pkg> test` exits **0** without running anything when the package has no `test` script;
- `pnpm vitest run <dir> -t <pattern>` exits **0** when the pattern matches no test. Proven on NET-005:
  `-t animstate` skipped all 41 tests with `CACError`-free exit 0.

**Rule:** name the test file (`pnpm vitest run packages/core/test/anim-state.test.ts`), or use a `-t` pattern
only when a test proves it matches. 10 remain:

| task | broken acc |
|---|---|
| NET-003 | `pnpm test --filter @strata/server -t reconnect` |
| NET-004 | `pnpm test --filter @strata/netcode` |
| NET-006 | `pnpm test --filter @strata/netcode -t animstate` |
| SEC-001 | `pnpm test --filter @strata/security` |
| AN-002 | `pnpm test --filter @strata/anim` |
| P3-005 | `pnpm test --filter @strata/a11y` |
| P3-006 | `pnpm test --filter @strata/perf` |
| NET-102 | `pnpm test --filter @strata/persistence` |
| NET-103 | `pnpm test --filter @strata/server -t commitqueue` |
| MOD-001 | `pnpm test --filter @strata/moderation` |

Do not invent a path for packages that do not exist yet (`netcode`, `security`, `anim`, `a11y`, `perf`,
`persistence`, `moderation`): write the acc when the owning task creates the package. A validator rejecting
all three false-pass forms should land with that repair, not before.

## 4. Open for the Director

1. **ND-004 / ND-005** — rotate the exposed PAT and HF token; the PAT was used again this session.
2. **PR #1** (all session work) and **PR #2** (dashboard truth) — draft/stacked; `main` still holds only the
   root commit. Merge in queue order; PR #2's base is the session branch.
3. **ND-011** — TPU v5e-1 is declared but no audited model targets it. Training-only (FYI) or a new audit path?

## 5. Non-gated tooling candidates

1. **Wire `apps/dashboard/check.mjs` into `pnpm verify`** (from PR #2): it currently does not run in CI, and
   adding it changes the 17-step baseline — do it as a named task, not silently.
2. ~~`scripts/session-result.mjs` (D146)~~ **DONE** — real generator, short/full 0, negative 1, verify 17/17.
3. Generated `docs/state/JOURNAL.md` (master §7) — view missing; `AGENTS.md` §1 points at it.
4. `validate-locks.mjs` cannot represent a gate (`task_id` must exist in `BLUEPRINT.yaml`).
5. Pin the Playwright MCP in `opencode.json` (unpinned, §10.6).
6. `docs/STACK.lock.md` line 39 is stale (Colyseus "NOT INSTALLED | NET-001").

## 6. Environment / hardware

Node 22.23.4, pnpm 12.21.0 via corepack, TypeScript 6.0.3, Vitest 5.1.0. No GPU in this runtime.

The Director declared upcoming sessions on **TPU v5e-1 + T4 16 GB**. The T4 is already the sourced generation
tier (`GDD-AI-ASSETS` §5, `tools/*/detect_tier.py`). A TPU-only runtime reports `NO_GPU` and the CPU-safe
policy, which is correct: the audited stack (P0-006) has no TPU/XLA model, and art remains gated by NET-GATE.
Secrets from env only; the repo is public, so reading never needs a token.
