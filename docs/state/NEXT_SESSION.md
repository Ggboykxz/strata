# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T01:10Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| mode | RESUME |
| next task | **P0-004** — 27 CI workflows + real `scripts/validate-workflows.mjs` |
| blocker | **ND-004 / ND-005 only** — token rotation needs the Director's account. Everything on disk is green. |

---

## 1. State at hand-off

| task | status | evidence |
|---|---|---|
| HC-001 | done (+ v1.1 ND-001, v1.2 T3 signature) | `…T001004Z-HC-001/`, `…T004835Z-DIRECTOR-RESOLUTIONS/` |
| SC-001 / WF-001 | done | `…T001004Z-SC-001/`, `…T001004Z-WF-001/` |
| P0-001 / P0-002 | done | `…T001004Z-P0-001/`, `…T001004Z-P0-002/` |
| P0-003 | done | `docs/state/evidence/20261118T004153Z-P0-003/` |
| WF-002 | done | `docs/state/evidence/20261118T005800Z-WF-002/` |
| TRACER-001 | done | `docs/state/evidence/20261118T010750Z-TRACER-001/` |

Re-verify before touching anything:

```bash
pnpm verify                              # 9/9 enabled steps, exit 0
pnpm tracer --assert                     # equal hashes, desync rejected, capsule rendered, exit 0
node scripts/validate-blueprint.mjs      # 63 tasks, 0 errors, 12 declared warnings
node scripts/concept-integrity.mjs --check  # 0 debt at GATE:P0
```

## 2. P0-004 — definition of done

Source: `docs/blueprint/BLUEPRINT.yaml` line 42. Agent **release-engineer**; output `.github/workflows/`;
acceptance `node scripts/validate-workflows.mjs` — still a **declared stub**. P0-004 must implement it.

1. **27 workflow files** under `.github/workflows/`, non-overlapping names, covering at minimum: the P0
   verify pipeline, workflow self-validation, the tracer assert, netcode/NET-GATE evidence, animation
   separation, model-license audit, secret scanning, dependency review, evidence archival and a release
   gate that cannot bypass `GATE:*`. The full list is the release-engineer's design; record it in a table.
2. **Every `uses:` pinned to a full 40-hex commit SHA**, version in a comment. A tag or branch is a failure.
3. **Least privilege**: explicit top-level `permissions:`; `contents: write` only where a job writes.
   `pull_request_target` is banned if the workflow checks out the PR head — the validator enforces it.
4. **Every job** has `timeout-minutes`, a `concurrency` group where it can overlap, and where Node runs,
   `pnpm install --frozen-lockfile` followed by the repository's own `pnpm verify` — never a parallel
   definition of green. The tracer job calls `pnpm tracer --assert` instead of reimplementing its checks.
5. **`scripts/validate-workflows.mjs`** (real, no stub banner) checks: exactly 27 files; unique `name:`;
   SHA pins; explicit permissions; the `pull_request_target` rule; referenced local scripts exist; every
   workflow that claims to run tests invokes `pnpm verify` or `pnpm tracer --assert`. Exit 1 with file+line.
6. **Negative tests, logged**: unpinned `uses:`, missing `permissions:`, forbidden checkout under
   `pull_request_target`, a 26th/28th file. Each must make the validator exit 1.
7. Evidence under `docs/state/evidence/<utc>-P0-004/`: validator run, four negatives, 27-file table with
   purpose + gate.

CI cannot be *executed* from here without a push to GitHub. Acceptance is **static validation**; do not
claim a workflow ran when it did not. After the push, the real run becomes the next session's input.

## 3. Open decisions carried forward

1. **ND-001 / ND-002 — RESOLVED.** HIGH_CONCEPT v1.2 (EN 25, FR 30, T3 signed at P0); A0002 option A,
   WF-002 implemented and wired into `verify`.
2. **ND-003 — DEFERRED.** Keep the repo private on the personal account until GATE:P0.
3. **ND-004 / ND-005 — OPEN, Director action.** Revoke the exposed GitHub PAT and HF token and issue
   fine-grained replacements. Decision carried: do not revoke the PAT before a replacement exists, because
   that would break all pushes. The risk is documented, not hidden.

## 4. Order after P0-004

1. P0-005..P0-007, then the `GATE:P0` dossier with its 3 drills.
2. WF-002's duplicated glob compiler → `scripts/lib/ownership.mjs` (tools-engineer, recorded debt).
3. NET-001, only after NET-GATE is assembled and signed.

## 5. Known red (intentional, not regressions)

- `scope-math.mjs --report` exit 2: throughput unmeasured by design.
- `concept-integrity --score` exit 2 until a measured CIS source exists (HC-003, P2).
- 19 validators print `NOT IMPLEMENTED` and exit 1; `pnpm verify` lists them as DEFERRED and does not run them.

## 6. Environment notes

- Node **22.23.4**, pnpm **12.21.0** (corepack), TypeScript **6.0.3**, Vitest **5.1.0**, Babylon **9.37.0**,
  ws **8.23.0** — see `docs/STACK.lock.md`. `engine-strict=true`.
- `pnpm verify` = typecheck → lint → unit → prompt drift → scope → scope-math → blueprint → ownership →
  locks. `pnpm tracer --assert` is a separate integration harness, not part of `verify` yet.
- No Playwright, Blender, ComfyUI, CUDA or zod is installed. Pin before first import.
- Never commit a token. Evidence logs capture commands; secrets must not appear in them.
