# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T09:45Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| also open | **PR #2** dashboard truth repair — `session/20261118-dashboard-truth`, base = session branch |
| mode | RESUME |
| tier | current `S0`, authorized **`S1`** |
| last task | **NET-006** — wire v3 anim/resync, server hit frames, jitter (A0005) |
| next task | **PR-N1** — local tick CPU p95 + framed byte-rate harness |
| blocker | ND-004/ND-005 token rotation, PR #1 and #2 merges. ND-011 needs one answer (TPU scope). |

---

## 1. State at hand-off

`pnpm verify` **17/17** · anim wire **5/5** · combat **7/7** · jitter **5/5** · full **122/122** (12 files) ·
tracer green · D146 generator short/full 0, byte-identical, fail-closed negatives 1.

```bash
pnpm install --frozen-lockfile && pnpm verify
pnpm vitest run packages/protocol/test/anim.test.ts
pnpm vitest run apps/server/test/combat.test.ts
pnpm vitest run apps/game/test/jitter.test.ts
pnpm tracer --assert
node scripts/session-result.mjs
```

Runtime is ephemeral: `git clone` + `corepack prepare pnpm@12.21.0 --activate` recovers everything.

## 2. PR-N1 — next (S1, P2NET, A0005)

`{id: PR-N1, agent: qa-engineer, gdd: [GDD-NETCODE#acceptance], deps: [NET-006],
out: [tools/sim/load/prn1_load.ts, docs/qa/prototypes/PRN1.md], split: true}`

A0005 folds the previously deferred measurement into this task. Its blueprint acc `pnpm sim prn1 --assert` is
**broken** (there is no `sim` script in `package.json`). Repair it to a command that exists, e.g.
`node tools/sim/load/prn1_load.mjs --assert`, and log the real command and exit code.

Constraints from A0005/I13:
- measure **local tick CPU p50/p95** over a deterministic scripted run (N ticks, 64 entities), excluding warmup;
- measure **framed byte rates** with `encodeFrame(snapshotFromWorld(...))` — the full-snapshot ceiling is
  1 551 B × 30 Hz = 46 530 B/s and is **over** the 12 KB/s budget; report it, do not hide it behind an average;
- label the numbers as **local simulation CPU and framed byte rates**, never as client RTT or real network loss;
- no GPU/TPU is available or needed; no model is downloaded (I4); no art (I2);
- a failure or an unmeasured field stays `NOT COMPUTABLE` with a reason.

NET-006 and NET-005 give the harness: `SimHost`, `hashWorld`, `encodeFrame`, `snapshotFromWorld`, `AnimAuthority`,
`HitLedger`. Do not add a dependency to make the harness work.

## 3. Known defect: 7 broken acceptance commands

`pnpm test --filter <pkg>` is invalid (`CACError`). `pnpm --filter <pkg> test` can exit 0 without running
anything, and `pnpm vitest run <dir> -t <pattern>` exits 0 when the pattern matches no test (proven: 41 skipped).
Rule: name the test file or a command that exists.

| task | broken acc |
|---|---|
| SEC-001 | `pnpm test --filter @strata/security` |
| AN-002 | `pnpm test --filter @strata/anim` |
| P3-005 | `pnpm test --filter @strata/a11y` |
| P3-006 | `pnpm test --filter @strata/perf` |
| NET-102 | `pnpm test --filter @strata/persistence` |
| NET-103 | `pnpm test --filter @strata/server -t commitqueue` |
| MOD-001 | `pnpm test --filter @strata/moderation` |

PR-N1 adds a different broken form (`pnpm sim …`, no script) — repair it in its own PR. Do not invent a path for
packages that do not exist yet; write the acc when the owning task creates the package.

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

**Current runtime: no GPU and no TPU** (Director: "là on a pas de tpu ni gpu quand t'en aura besoin fais moi
signe"). Signal before starting accelerator work. PR-N1 is CPU-only. Future hardware declared as TPU v5e-1 +
T4 16 GB: T4 is already the sourced generation tier; TPU has no audited model path (ND-011). Art remains gated
by NET-GATE. Secrets from env only; the repo is public, so reading never needs a token.
