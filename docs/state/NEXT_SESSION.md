# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T00:45Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| mode | RESUME |
| next task | **P0-004** — 27 CI workflows + a real `scripts/validate-workflows.mjs` |
| blocker | none on disk. ND-002 blocks WF-002, not P0-004. |

---

## 1. State at hand-off

| task | status | evidence |
|---|---|---|
| HC-001 | done | `docs/state/evidence/20261118T001004Z-HC-001/` |
| SC-001 | done | `docs/state/evidence/20261118T001004Z-SC-001/` |
| WF-001 | done | `docs/state/evidence/20261118T001004Z-WF-001/` |
| P0-001 | done | `docs/state/evidence/20261118T001004Z-P0-001/` |
| P0-002 | done | `docs/state/evidence/20261118T001004Z-P0-002/` |
| P0-003 | done | `docs/state/evidence/20261118T004153Z-P0-003/` |

Re-verify before touching anything:

```bash
pnpm install --frozen-lockfile && pnpm verify   # 7/7 enabled, exit 0
node scripts/validate-blueprint.mjs             # 63 tasks, 0 errors, 13 declared warnings
node scripts/validate-prompt-drift.mjs          # sealed prompt intact
```

## 2. P0-004 — definition of done

Source: `docs/blueprint/BLUEPRINT.yaml` line 42. Agent **release-engineer**; output `.github/workflows/`;
acceptance `node scripts/validate-workflows.mjs` — which is currently a **declared stub**. P0-004 must
implement it, not just call it.

1. **27 workflow files** under `.github/workflows/`, named by concern and non-overlapping. They must cover,
   at minimum: the P0 verify pipeline, workflow self-validation, netcode/NET-GATE evidence, animation
   separation, model-license audit, secret scanning, dependency review, evidence archival, and a release
   gate that cannot bypass `GATE:*`. The full list is the release-engineer's design; record it in a table
   in the task evidence.
2. **Every `uses:` pinned to a full 40-hex commit SHA**, with the version in a comment. A tag or branch is a
   failure, not a warning.
3. **Least privilege**: top-level `permissions:` is explicit; `contents: write` only where a job writes.
   `pull_request_target` is banned unless the workflow never checks out the PR head — the validator enforces
   that specific rule.
4. **Every job** has `timeout-minutes`, a `concurrency` group where it can overlap, and, where Node runs,
   `pnpm install --frozen-lockfile` followed by the repository's own `pnpm verify` — never a parallel
   definition of "green".
5. **`scripts/validate-workflows.mjs`** (real, no stub banner) checks: exactly 27 files; unique `name:`; the
   SHA pin rule; explicit permissions; `pull_request_target` rule; every referenced local script exists;
   every workflow that claims to run tests invokes `pnpm verify`. Exit 1 with the file and line on failure.
6. **Negative tests, logged**: unpinned `uses:`, missing `permissions:`, forbidden `pull_request_target`
   checkout, a 26th/28th file. Each must make the validator exit 1.
7. Evidence under `docs/state/evidence/<utc>-P0-004/`: validator run, the four negative cases, and the
   27-file table with purpose + gate.

Note: CI cannot be *executed* from this environment without a push; the acceptance is static validation.
Do not claim a workflow ran when it did not. When pushed, the workflows run on GitHub — their result is the
next session's input, not this task's evidence.

## 3. Open decisions carried forward

1. **ND-002 / ADR A0002** — PROPOSED, option A (orchestrator owns the two workflow validators). WF-002 stays
   `refused_ownership` until the Director signs.
2. **ND-001** — T1 EN 29 > 25 words. Lore canon; blocks GATE:P0 sign-off only.
3. **ND-004 / ND-005** — both pasted tokens must be rotated. Pushes still depend on ND-004.

## 4. Order after P0-004

1. **WF-002** real ownership/lock validators — blocked by ND-002.
2. **TRACER-001** walking skeleton (D137) — depends on P0-003 and WF-002.
3. P0-005..P0-007, then the `GATE:P0` dossier with its 3 drills.

## 5. Known red (intentional, not regressions)

- `concept-integrity.mjs --check` exit 1: FINDING-001 (T1 EN 29 > 25 words) + unsigned T3.
- `scope-math.mjs --report` exit 2: throughput unmeasured by design.
- `concept-integrity --score` exit 2 until a measured CIS source exists (HC-003, P2).
- 21 validators print `NOT IMPLEMENTED` and exit 1; `pnpm verify` lists them as DEFERRED and does not run them.
- `validate-workflows.mjs` is one of those 21 until P0-004 replaces it.

## 6. Environment notes

- Node **22.23.4**, pnpm **12.21.0** (via corepack), TypeScript **6.0.3**, Vitest **5.1.0** — see
  `docs/STACK.lock.md`. `engine-strict=true`; a wrong Node fails the install.
- `pnpm verify` = typecheck → lint (core-math AST ban) → unit → prompt drift → scope → scope-math →
  blueprint. Fail-fast; DEFERRED groups printed.
- Python 3 with PyYAML 6.0.3 and jsonschema available for cross-checks only.
- Never commit a token. Evidence logs capture commands; secrets must not appear in them.
