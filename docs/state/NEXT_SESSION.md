# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T09:25Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| also open | **PR #2** dashboard truth repair — `session/20261118-dashboard-truth`, base = session branch |
| mode | RESUME |
| tier | current `S0`, authorized **`S1`** |
| last task | **NET-003** — rooms on pinned `ws` (A0004); GDD-SHARDING 0.3 |
| next task | **NET-004** — prediction + reconciliation + interpolation + desync recovery |
| blocker | ND-004/ND-005 token rotation, PR #1 and #2 merges. ND-011 needs one answer (TPU scope). |

---

## 1. State at hand-off

`pnpm verify` **17/17** · rooms **17/17** · server **25/25** · full suite **90/90** (8 files) · tracer green ·
D146 generator short/full 0, negative 1, byte-identical.

```bash
pnpm install --frozen-lockfile && pnpm verify
pnpm vitest run apps/server/test/rooms.test.ts
pnpm vitest run packages/core/test/anim-state.test.ts
pnpm vitest run packages/protocol
pnpm tracer --assert
node scripts/session-result.mjs
```

Runtime is ephemeral: `git clone` + `corepack prepare pnpm@12.21.0 --activate` recovers everything.

## 2. NET-004 — next (S1, phase P2NET)

`{id: NET-004, agent: netcode-engineer, gdd: [GDD-NETCODE#prediction], deps: [NET-003],
out: [apps/game/src/net/, packages/core/src/hash.ts], split: true}`

Deps are now satisfied. The blueprint acc `pnpm test --filter @strata/netcode` is still broken; the `@strata/netcode`
package does not exist. Write the client prediction/reconciliation code first, then set the acc to the **test file
path** you actually created (never a bare `-t` pattern — proven false pass on NET-005).

Available contracts: NET-001 `hashWorld`/`HashRing`/`stepWorld`; NET-002 `decodeFrame`/`encodeFrame`/`snapshotFromWorld`;
NET-003 `Room.snapshotFor(client)` with the entity's `appliedSeq`; GDD-NETCODE §4 rule 2 (client resets to snapshot,
replays intents with seq greater than `snapshot.appliedSeq`), rule 3 (hash mismatch → desync, rejected never reconciled).

A0004 does not affect NET-004: the room transport is an adapter boundary, and no new dependency is authorized.

## 3. Known defect: 9 broken acceptance commands

`pnpm test --filter <pkg>` is invalid (`CACError`, exit 1). Two further traps: `pnpm --filter <pkg> test` exits 0
without running anything when there is no `test` script, and `pnpm vitest run <dir> -t <pattern>` exits 0 when the
pattern matches no test (proven on NET-005: 41 skipped, exit 0). Rule: name the test file.

| task | broken acc |
|---|---|
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
`persistence`, `moderation`): write the acc when the owning task creates the package. A validator rejecting all
three false-pass forms should land with that repair.

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
aura besoin fais moi signe"). Signal before starting accelerator work. NET-004 is CPU-only, so nothing is
blocked. The Director also declared future hardware TPU v5e-1 + T4 16 GB: T4 is already the sourced generation
tier; TPU has no audited model path (ND-011). Art remains gated by NET-GATE. Secrets from env only; the repo is
public, so reading never needs a token.
