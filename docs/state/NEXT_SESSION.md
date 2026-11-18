# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T01:35Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| mode | RESUME |
| next task | **P0-007** — dashboard: workflow, concept, GDD, scope, netcode, economy |
| blocker | **ND-004..ND-008** — token rotations and licence/distribution decisions. Nothing on disk blocks P0-007. |

---

## 1. State at hand-off

| task | status | evidence |
|---|---|---|
| HC-001 (+ v1.1, v1.2) | done | `…T001004Z-HC-001/`, `…T004835Z-DIRECTOR-RESOLUTIONS/` |
| SC-001 / WF-001 / P0-001 / P0-002 | done | `…T001004Z-*/` |
| P0-003 | done | `…T004153Z-P0-003/` |
| WF-002 | done | `…T005800Z-WF-002/` |
| TRACER-001 | done | `…T010750Z-TRACER-001/` |
| P0-004 | done | `…T011433Z-P0-004/` |
| P0-005 | done | `…T012151Z-P0-005/` |
| P0-006 | done | `…T012845Z-P0-006/` |

Re-verify before touching anything:

```bash
pnpm verify                                   # 12/12 enabled steps, exit 0
pnpm tracer --assert                          # equal hashes, exit 0
node scripts/validate-manifest.mjs --audit    # 8 approved / 7 blocked / 5 rejected, exit 0
```

**Known deviation to reconcile before GATE:P0.** Master §18 lists 27 specific workflow *names*
(`ci`, `opencode`, `workflow`, `high-concept`, `gdd`, `scope`, `netcode`, `economy`, `prototype`,
`model-audit`, `anim-separation`, `retarget`, `perf`, `visual`, `soak`, `fuzz`, `compat`, `balance`, `loc`,
`a11y`, `security`, `asset-report`, `release`, `anim`, `scene-budget`, `texture-audit`, `lookdev`). P0-004
delivered 27 valid workflows with different, gate-oriented names. The count, pinning and enforcement hold,
but the name list diverges. Recorded; reconcile with a rename/replace pass before the gate dossier.

## 2. P0-007 — definition of done

Source: `docs/blueprint/BLUEPRINT.yaml` line 45. Agent **tools-engineer**, `amp`, deps `[P0-003]`,
output `apps/dashboard/`. Acceptance: **`pnpm --filter @strata/dashboard build`**.

1. **Six view groups**: WORKFLOW (ownership, locks, threads, disputes, handoffs), CONCEPT (T1/T3/CIS with
   the current gate), GDD (modules/coverage), SCOPE (ledger budgets), NETCODE (tick p50/p95, bandwidth,
   desyncs, reconnects, AoI), ECONOMY (faucets/sinks, inflation). Master §18 lists more pages; these six are
   the task's named scope.
2. **Every page reads generated views or metrics.json; no page computes its own truth** (§18). Unmeasured
   values print `NOT COMPUTABLE`, never a guessed number (I5/I13). The current `metrics.json` has
   `months_needed: null`, `cis.value: null` and `gdd_coverage.value: null` — the dashboard must show that.
3. **Build is real and repeatable**: `pnpm --filter @strata/dashboard build` exits 0, emits into
   `apps/dashboard/dist/` (gitignored), and a second run is idempotent. A deliberate syntax error must make
   it exit nonzero — log that negative test.
4. **No GM auth, no gameplay state, no live server calls.** The dashboard is a read-only local view. Auth and
   moderation tools come later (P0/P2 tasks).
5. Evidence under `docs/state/evidence/<utc>-P0-007/`: build log, idempotency log, deliberate-failure log,
   and a table of which source file feeds each view.

## 3. Open decisions carried forward

1. **ND-001 / ND-002 / ND-003 — RESOLVED.** HIGH_CONCEPT v1.2 (T3 signed), A0002 option A, public repository.
   `main` is still empty — the Director must merge PR #1.
2. **ND-004 / ND-005 — OPEN, Director action.** Rotate the exposed GitHub PAT and HF token; urgent now that
   the repo is public. The agent cannot revoke them behind the Director's login.
3. **ND-006 / ND-007 / ND-008 — OPEN, new from P0-006.** Territory-restricted Tencent licences, SDXL
   `openrail++`, ActionForge output rights. All recommendations are "reject for now" with audited fallbacks.

## 4. Order after P0-007

1. `GATE:P0` dossier with its 3 drills — includes the workflow-name reconciliation and a real GitHub Actions
   run result (static validation alone is not enough).
2. NET-GATE phase: NET-001..NET-006, PR-N1..PR-N4, SEC-001, then NG-001 (human sign-off).
3. AI-001/AI-002 remain gated by GATE:P2 **and** the whitelist; the audit authorizes nothing to run.

## 5. Known red (intentional, not regressions)

- `scope-math.mjs --report` exit 2: throughput unmeasured by design.
- `concept-integrity --score` exit 2 until a measured CIS source exists (HC-003, P2).
- 17 validators print `NOT IMPLEMENTED` and exit 1; `pnpm verify` lists them as DEFERRED.
- GitHub Actions has never run; the 27 workflows are statically validated only.

## 6. Environment notes

- Node **22.23.4**, pnpm **12.21.0**, TypeScript **6.0.3**, Vitest **5.1.0**, Babylon **9.37.0**, ws **8.23.0**.
- Tesla T4 (nominal 16 GB) measured; no model used before the P0-006 whitelist and the Director decisions.
- Never commit a token. Evidence logs capture commands; secrets must not appear in them.
