# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T10:20Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| also open | **PR #2** dashboard truth repair — `session/20261118-dashboard-truth`, base = session branch |
| mode | RESUME |
| tier | current `S0`, authorized **`S1`** |
| last task | **SEC-001** — ingress gate, rate limits, GM audit, threat model |
| next task | **NG-001** — NET-GATE dossier for the Director (gate task: FULL result) |
| blocker | ND-004/ND-005 token rotation, PR #1 and #2 merges. ND-011 needs one answer (TPU scope). |

---

## 1. State at hand-off

`pnpm verify` **17/17** · security **10/10** · main suite **142/142** · tracer green · **GATE:P2NET satisfied**.

```bash
pnpm install --frozen-lockfile && pnpm verify
pnpm vitest run --config tests/security/vitest.config.ts
pnpm vitest run tools/sim/net/test/prn4.test.ts --reporter=verbose
pnpm vitest run tools/sim/persist/test/prn3.test.ts --reporter=verbose
pnpm tracer --assert
node scripts/session-result.mjs
```

Runtime is ephemeral: `git clone` + `corepack prepare pnpm@12.21.0 --activate` recovers everything.

## 2. NG-001 — next (S1, P2NET, gate task)

`{id: NG-001, agent: producer, role: sup, gdd: [GDD-NETCODE#acceptance], deps: [GATE:P2NET],
out: [docs/qa/prototypes/NET_GATE.md], acc: ["node scripts/validate-netgate.mjs"]}`

All P2NET tasks are done, so the automatic GATE:P2NET is satisfied. Two pieces of work:

1. **`scripts/validate-netgate.mjs` is still a declared P0-002 stub that exits 1.** Owner: netcode-engineer.
   Implement it under its lock; it must fail closed when evidence is missing and validate the dossier's claims
   against commands, exit codes and logs (I13). Do not weaken an assertion to make it pass.
2. **The dossier** (`docs/qa/prototypes/NET_GATE.md`, producer) must carry the evidence for NET-001..006,
   PR-N1/N3/N4 and SEC-001, plus the **seven residual risks verbatim** from `docs/legal/THREAT_MODEL.md`. It must
   not claim the network is secure, must not claim "0 unvalidated message paths" (the gate is not wired into
   `attachRooms`; SEC-002 owns that), and must keep `server_tick_p95_ms` as `NOT COMPUTABLE`.

**Gate ceremony.** This is a gate task: use the **FULL** result format (`node scripts/session-result.mjs --format
full`), handoffs received/accepted, signature ratio concept roles, GDD version bumps, scope ledger delta, content
math, prototype reports, economy/anim/world checks and files grouped by owner. **No agent signs NET-GATE** — it is
a human Director signature (D136). Stop after assembling the unsigned dossier.

## 3. Known defect: 7 broken `pnpm test --filter` accs

`pnpm test --filter <pkg>` is invalid (`CACError`). `pnpm --filter <pkg> test` can exit 0 without running
anything; `pnpm vitest run <dir> -t <pattern>` exits 0 when nothing matches (41 skipped, exit 0, proven).
Remaining: AN-002, P3-005, P3-006, NET-102, NET-103, MOD-001, and the `pnpm test --filter @strata/netcode` form
was repaired in NET-004. The `pnpm sim …` form broke for PR-N1/N3/N4 and was repaired each time.

## 4. Open for the Director

1. **ND-004 / ND-005** — rotate the exposed PAT and HF token; the PAT was used again this session.
2. **PR #1** (session work) and **PR #2** (dashboard truth) — `main` still holds only the root commit.
3. **ND-011** — TPU v5e-1 declared but no audited model targets it. Training-only (FYI) or a new audit path?
4. **NET-GATE signature** — the dossier will be assembled unsigned; the Director signs.

## 5. Non-gated tooling candidates

1. Wire `apps/dashboard/check.mjs` into `pnpm verify` — changes the 17-step baseline; own task.
2. Wire `apps/server/src/main.ts` to `attachRooms` **and** `MessageGate` (SEC-002) so rooms are reachable and
   validated without another harness.
3. Generated `docs/state/JOURNAL.md` (master §7) — view missing; `AGENTS.md` §1 points at it.
4. `validate-locks.mjs` cannot represent a gate (`task_id` must exist in `BLUEPRINT.yaml`).
5. Pin the Playwright MCP in `opencode.json` (unpinned, §10.6).
6. `docs/STACK.lock.md` line 39 is stale — **left stale by instruction in A0004**.

## 6. Environment / hardware

Node 22.23.4, pnpm 12.21.0 via corepack, TypeScript 6.0.3, Vitest 5.1.0.

**Current runtime: no GPU and no TPU** (Director: "là on a pas de tpu ni gpu quand t'en aura besoin fais moi
signe"). Signal before starting accelerator work. NG-001 is document and validator work, CPU-only. Future
hardware declared as TPU v5e-1 + T4 16 GB: T4 is already the sourced generation tier; TPU has no audited model
path (ND-011). Art remains gated by NET-GATE. Secrets from env only; the repo is public.
