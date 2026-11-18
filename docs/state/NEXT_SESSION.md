# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T08:36Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| mode | RESUME |
| tier | current `S0`, authorized **`S1`** |
| last task | **NET-002** — binary wire contract + version handshake; GDD-NETCODE 0.4 |
| next task | **NET-003** — rooms/lifecycle/reconnect — **blocked on a producer-owned Colyseus pin**; fallback **NET-005** |
| blocker | ND-004/ND-005 token rotation, PR #1 merge. ND-011 needs one answer (TPU scope). |

---

## 1. State at hand-off

`pnpm verify` **17/17** · protocol **23/23** · full suite **51/51** (6 files) · `pnpm tracer --assert` green.

```bash
pnpm install --frozen-lockfile && pnpm verify
pnpm vitest run packages/protocol
pnpm vitest run packages/core
pnpm vitest run apps/server
pnpm tracer --assert
```

Runtime is ephemeral: `git clone` + `corepack prepare pnpm@12.21.0 --activate` recovers everything.

## 2. NET-003 — first choice, and why it may not start

`{id: NET-003, agent: backend-engineer, gdd: [GDD-SHARDING#instances], deps: [NET-002],
out: [apps/server/src/rooms/], acc: "pnpm vitest run apps/server -t reconnect"}`

The acc above is the repaired form. The blocker is the dependency: rooms mean **Colyseus**, and
`docs/STACK.lock.md` still says `Colyseus | NOT INSTALLED | NET-001`. Adding it is a **stack change owned by
the producer** (`docs/**` is the producer's glob, `OWNERSHIP.yaml` line 56), not by netcode-engineer and not
by the orchestrator. Before NET-003:

1. producer hand-off: pin the exact Colyseus version, record the licence (MIT) and its transitive graph in
   `docs/STACK.lock.md`, and correct the stale `NET-001` target;
2. then NET-003 acquires `apps/server/src/rooms/**` + `packages/protocol/**` if the handshake grows.

If the Director does not want a new dependency yet, take **NET-005** instead: anim state machine in core, no
new dependency, deps `[NET-001]`, out `packages/core/src/anim-state/` + `packages/content/animations/schema/`,
acc `pnpm vitest run packages/core -t animstate`. Its GDD (`GDD-ANIM-ARCHITECTURE`) is DRAFT and carries the
`#states` anchor.

## 3. Known defect: 11 broken acceptance commands (re-measured)

`pnpm test --filter <pkg>` is invalid: vitest has no `--filter` (`CACError`, exit 1). The inverse form
`pnpm --filter <pkg> test` exits **0** without running anything when the package has no `test` script — a
silent false pass. **11 remain**, by id:

| task | broken acc |
|---|---|
| NET-003 | `pnpm test --filter @strata/server -t reconnect` |
| NET-004 | `pnpm test --filter @strata/netcode` |
| NET-005 | `pnpm test --filter @strata/core -t animstate` |
| NET-006 | `pnpm test --filter @strata/netcode -t animstate` |
| SEC-001 | `pnpm test --filter @strata/security` |
| AN-002 | `pnpm test --filter @strata/anim` |
| P3-005 | `pnpm test --filter @strata/a11y` |
| P3-006 | `pnpm test --filter @strata/perf` |
| NET-102 | `pnpm test --filter @strata/persistence` |
| NET-103 | `pnpm test --filter @strata/server -t commitqueue` |
| MOD-001 | `pnpm test --filter @strata/moderation` |

Repair each to `pnpm vitest run <existing path> [-t <pattern>]` **when the path exists**. For packages not yet
created (`netcode`, `security`, `anim`, `a11y`, `perf`, `persistence`, `moderation`) do not invent a path: the
acc is written when the owning task creates the package. A validator rule rejecting both broken forms should
land with that repair, not before.

## 4. Open for the Director

1. **ND-004 / ND-005** — rotate the exposed PAT and HF token; the PAT was used again this session.
2. **PR #1** — draft, stacked on the session branch; `main` still holds only the root commit.
3. **ND-011** — TPU v5e-1 is declared but no audited model targets it. Training-only (FYI) or a new audit path?

## 5. Non-gated tooling candidates

1. `scripts/session-result.mjs` (D146) — still a stub; §20 results are hand-written.
2. Generated `docs/state/JOURNAL.md` (master §7) — view missing; `AGENTS.md` §1 points at it.
3. `validate-locks.mjs` cannot represent a gate (`task_id` must exist in `BLUEPRINT.yaml`).
4. Pin the Playwright MCP in `opencode.json` (unpinned, §10.6).
5. `docs/STACK.lock.md` line 39 is stale (Colyseus "NOT INSTALLED | NET-001").

## 6. Environment / hardware

Node 22.23.4, pnpm 12.21.0 via corepack, TypeScript 6.0.3, Vitest 5.1.0. No GPU in this runtime.

The Director declared upcoming sessions on **TPU v5e-1 + T4 16 GB**. The T4 is already the sourced generation
tier (`GDD-AI-ASSETS` §5, `tools/*/detect_tier.py`). A TPU-only runtime reports `NO_GPU` and the CPU-safe
policy, which is correct: the audited stack (P0-006) has no TPU/XLA model, and art remains gated by NET-GATE.
Secrets from env only; the repo is public, so reading never needs a token.
