# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T09:18Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| also open | **PR #2** dashboard truth repair — `session/20261118-dashboard-truth`, base = session branch |
| mode | RESUME |
| tier | current `S0`, authorized **`S1`** |
| last task | **NET-004** — client prediction/reconciliation; GDD-NETCODE 0.5 |
| next task | **NET-006** — anim STATE replication + server-validated transitions + server hit frames |
| blocker | ND-004/ND-005 token rotation, PR #1 and #2 merges. ND-011 needs one answer (TPU scope). |

---

## 1. State at hand-off

`pnpm verify` **17/17** · net **15/15** · full suite **105/105** (9 files) · tracer green · D146 generator
short/full 0, byte-identical, fail-closed negatives 1.

```bash
pnpm install --frozen-lockfile && pnpm verify
pnpm vitest run apps/game/test/net.test.ts
pnpm vitest run packages/core/test/anim-state.test.ts
pnpm vitest run apps/server/test/rooms.test.ts
pnpm tracer --assert
node scripts/session-result.mjs
```

Runtime is ephemeral: `git clone` + `corepack prepare pnpm@12.21.0 --activate` recovers everything.

## 2. NET-006 — next (S1, phase P2NET)

`{id: NET-006, agent: netcode-engineer, gdd: [GDD-ANIM-ARCHITECTURE#wire], deps: [NET-004, NET-005],
out: [apps/server/src/combat/, packages/protocol/src/anim.ts], split: true}`

Both deps are now satisfied. Its acc `pnpm test --filter @strata/netcode -t animstate` is broken (and even the
flag-repaired form exits 0 while skipping everything). Create the real test first, then set the acc to that file
path — never a bare `-t` pattern.

Available contracts: NET-005 `AnimRuntime`/`applyRequest`/`advanceAnim`/`eventsAt` in core; NET-002 `FrameType`
and `encodeFrame`/`decodeFrame` (extend the frame table and bump `PROTOCOL_VERSION` only with evidence);
NET-004 `Predictor` and its resync request; GDD-ANIM-ARCHITECTURE §4 rule 3 (server validates every transition
and owns hit frames), §7 (12-byte anim_state), §15. A0001 separation stays intact: no merged GLB, no bone
transforms on the wire — only state tokens, transition tick and clip id.

## 3. Known defect: 8 broken acceptance commands

`pnpm test --filter <pkg>` is invalid (`CACError`, exit 1). `pnpm --filter <pkg> test` can exit 0 without running
anything, and `pnpm vitest run <dir> -t <pattern>` exits 0 when the pattern matches no test (proven: 41 skipped).
Rule: name the test file. The 8 remaining, re-counted from the blueprint:

| task | broken acc |
|---|---|
| NET-006 | `pnpm test --filter @strata/netcode -t animstate` |
| SEC-001 | `pnpm test --filter @strata/security` |
| AN-002 | `pnpm test --filter @strata/anim` |
| P3-005 | `pnpm test --filter @strata/a11y` |
| P3-006 | `pnpm test --filter @strata/perf` |
| NET-102 | `pnpm test --filter @strata/persistence` |
| NET-103 | `pnpm test --filter @strata/server -t commitqueue` |
| MOD-001 | `pnpm test --filter @strata/moderation` |

Do not invent a path for packages that do not exist yet (`security`, `anim`, `a11y`, `perf`, `persistence`,
`moderation`): write the acc when the owning task creates the package. A validator rejecting all three false-pass
forms should land with that repair.

## 4. Open for the Director

1. **ND-004 / ND-005** — rotate the exposed PAT and HF token; the PAT was used again this session.
2. **PR #1** (session work) and **PR #2** (dashboard truth) — `main` still holds only the root commit.
3. **ND-011** — TPU v5e-1 declared but no audited model targets it. Training-only (FYI) or a new audit path?

## 5. Non-gated tooling candidates

1. Wire `apps/dashboard/check.mjs` into `pnpm verify` — changes the 17-step baseline; own task, not a silent edit.
2. Wire `apps/server/src/main.ts` to `attachRooms` so rooms are reachable without another harness.
3. Generated `docs/state/JOURNAL.md` (master §7) — view missing; `AGENTS.md` §1 points at it.
4. `validate-locks.mjs` cannot represent a gate (`task_id` must exist in `BLUEPRINT.yaml`).
5. Pin the Playwright MCP in `opencode.json` (unpinned, §10.6).
6. `docs/STACK.lock.md` line 39 is stale — **left stale by instruction in A0004**, do not "fix" silently.

## 6. Environment / hardware

Node 22.23.4, pnpm 12.21.0 via corepack, TypeScript 6.0.3, Vitest 5.1.0.

**Current runtime: no GPU and no TPU** (Director statement 2026-11-18: "là on a pas de tpu ni gpu quand t'en
aura besoin fais moi signe"). Signal before starting accelerator work. NET-006 is CPU-only, so nothing is
blocked. The Director also declared future hardware TPU v5e-1 + T4 16 GB: T4 is already the sourced generation
tier; TPU has no audited model path (ND-011). Art remains gated by NET-GATE. Secrets from env only; the repo is
public, so reading never needs a token.
