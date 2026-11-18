# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T10:02Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| also open | **PR #2** dashboard truth repair — `session/20261118-dashboard-truth`, base = session branch |
| mode | RESUME |
| tier | current `S0`, authorized **`S1`** |
| last task | **PR-N1** — local tick CPU and framed-byte measurement (A0005) |
| next task | **PR-N3** — ledger + persistence + 10k tx dupe fuzz + crash restore |
| blocker | ND-004/ND-005 token rotation, PR #1 and #2 merges. ND-011 needs one answer (TPU scope). |

---

## 1. State at hand-off

`pnpm verify` **17/17** · harness **3/3** · full **125/125** (13 files) · tracer green · A0005 fully closed.

```bash
pnpm install --frozen-lockfile && pnpm verify
pnpm vitest run tools/sim/load/test/prn1.test.ts --reporter=verbose
pnpm vitest run apps/server/test/combat.test.ts
pnpm vitest run apps/game/test/net.test.ts
node scripts/session-result.mjs
```

Runtime is ephemeral: `git clone` + `corepack prepare pnpm@12.21.0 --activate` recovers everything.

## 2. PR-N3 — next (S1, P2NET)

`{id: PR-N3, agent: backend-engineer, gdd: [GDD-PERSISTENCE, GDD-TRADE], deps: [NET-003],
out: [packages/core/src/ledger/, tools/sim/persist/prn3_ledger.ts, docs/qa/prototypes/PRN3.md], split: true}`

Deps are satisfied. Its acc `pnpm sim prn3 --assert` is broken (no `sim` script) — same defect as PR-N1 before
repair; write the acc to a command that exists (a vitest test path) in the same PR.

D150 applies: money is bigint minor units with explicit system accounts; every transaction sums to exactly zero.
The 10 000-transaction duplicate fuzz and crash restore must produce logged evidence, not an assertion alone.
PR-N1's harness pattern (`tools/sim/load/prn1_load.ts` + `test/prn1.test.ts`) is the template; reuse it, do not
invent a second harness style. No new dependency, no GPU/TPU.

## 3. Known defect: 7 broken `pnpm test --filter` accs

`pnpm test --filter <pkg>` is invalid (`CACError`). `pnpm --filter <pkg> test` can exit 0 without running
anything; `pnpm vitest run <dir> -t <pattern>` exits 0 when nothing matches (41 skipped, exit 0, proven).
Rule: name the test file. Remaining: SEC-001, AN-002, P3-005, P3-006, NET-102, NET-103, MOD-001.
Also watch the `pnpm sim …` form: PR-N1 repaired its own; other sim accs may lack a script.

## 4. Open for the Director

1. **ND-004 / ND-005** — rotate the exposed PAT and HF token; the PAT was used again this session.
2. **PR #1** (session work) and **PR #2** (dashboard truth) — `main` still holds only the root commit.
3. **ND-011** — TPU v5e-1 declared but no audited model targets it. Training-only (FYI) or a new audit path?

## 5. Non-gated tooling candidates

1. Wire `apps/dashboard/check.mjs` into `pnpm verify` — changes the 17-step baseline; own task.
2. Wire `apps/server/src/main.ts` to `attachRooms` so rooms are reachable without another harness.
3. Generated `docs/state/JOURNAL.md` (master §7) — view missing; `AGENTS.md` §1 points at it.
4. `validate-locks.mjs` cannot represent a gate (`task_id` must exist in `BLUEPRINT.yaml`).
5. Pin the Playwright MCP in `opencode.json` (unpinned, §10.6).
6. `docs/STACK.lock.md` line 39 is stale — **left stale by instruction in A0004**.

## 6. Environment / hardware

Node 22.23.4, pnpm 12.21.0 via corepack, TypeScript 6.0.3, Vitest 5.1.0.

**Current runtime: no GPU and no TPU** (Director: "là on a pas de tpu ni gpu quand t'en aura besoin fais moi
signe"). Signal before starting accelerator work. PR-N3 is CPU-only. Future hardware declared as TPU v5e-1 +
T4 16 GB: T4 is already the sourced generation tier; TPU has no audited model path (ND-011). Art remains gated
by NET-GATE. Secrets from env only; the repo is public, so reading never needs a token.

## 7. Measurement honesty

PR-N1's CPU p95 (0.2109 ms) is a **local simulation** number, not server tick p95 under network load.
`server_tick_p95_ms` in metrics stays `NOT COMPUTABLE`. The full-snapshot 46 530 B/s is 3.79× the 12 KB/s
budget; NET-101 owns AoI/delta. Do not average it away.
