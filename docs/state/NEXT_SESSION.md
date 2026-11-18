# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T10:12Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| also open | **PR #2** dashboard truth repair — `session/20261118-dashboard-truth`, base = session branch |
| mode | RESUME |
| tier | current `S0`, authorized **`S1`** |
| last task | **PR-N4** — lag compensation rewind + shot validation |
| next task | **SEC-001** — threat model + message validation + rate limits + anti-cheat |
| blocker | ND-004/ND-005 token rotation, PR #1 and #2 merges. ND-011 needs one answer (TPU scope). |

---

## 1. State at hand-off

`pnpm verify` **17/17** · lagcomp **10/10** · full **142/142** (15 files) · tracer green · A0005 closed.

```bash
pnpm install --frozen-lockfile && pnpm verify
pnpm vitest run tools/sim/net/test/prn4.test.ts --reporter=verbose
pnpm vitest run tools/sim/persist/test/prn3.test.ts --reporter=verbose
pnpm vitest run apps/server/test/combat.test.ts
node scripts/session-result.mjs
```

Runtime is ephemeral: `git clone` + `corepack prepare pnpm@12.21.0 --activate` recovers everything.

## 2. SEC-001 — next (S1, P2NET)

`{id: SEC-001, agent: security-auditor, gdd: [GDD-SECURITY], deps: [NET-006],
out: [docs/legal/THREAT_MODEL.md, apps/server/src/validation/, tests/security/]}`

Deps are satisfied. Its acc `pnpm test --filter @strata/security` is broken (`CACError`) — repair it to the test
file you create. GATE:P2NET requires NET-001..006, PR-N1..N4 **and SEC-001**, so this is the last network task
before NG-001 can assemble the NET-GATE dossier for the Director.

Contracts already in place: NET-002 exact-length frames and version rejection; NET-003 resume handles that are
**not credentials**; NET-006 server-owned hit frames; PR-N4 client claims ignored. Threat model must name what is
*not* protected yet: no auth, no TLS in these harnesses, no rate limit until this task. Do not claim security
from the FNV-1a resume handle — it is a tamper detector only (A0004).

No new dependency, no GPU/TPU, no art. Use the existing harness pattern and log evidence for every command.

## 3. Known defect: 7 broken `pnpm test --filter` accs

`pnpm test --filter <pkg>` is invalid (`CACError`). `pnpm --filter <pkg> test` can exit 0 without running
anything; `pnpm vitest run <dir> -t <pattern>` exits 0 when nothing matches (41 skipped, exit 0, proven).
Rule: name the test file. Remaining: SEC-001 (this task), AN-002, P3-005, P3-006, NET-102, NET-103, MOD-001.
The `pnpm sim …` form was broken for PR-N1/N3/N4 and repaired in each; audit other sim accs when reached.

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
signe"). Signal before starting accelerator work. SEC-001 is CPU-only. Future hardware declared as TPU v5e-1 +
T4 16 GB: T4 is already the sourced generation tier; TPU has no audited model path (ND-011). Art remains gated
by NET-GATE. Secrets from env only; the repo is public, so reading never needs a token.

## 7. Measurement honesty

PR-N1 CPU p95 is a **local simulation** number; `server_tick_p95_ms` stays `NOT COMPUTABLE`. Full-snapshot
46 530 B/s is 3.79× the 12 KB/s budget — NET-101 owns AoI/delta. PR-N3's 10k fuzz and PR-N4's 30-shot fuzz are
local structural runs, not databases, networks or soak tests.
