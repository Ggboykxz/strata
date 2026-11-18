# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T02:20Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| mode | RESUME |
| next task | **GDD-001** — GDD index, 19-field template, 32 STUB modules, validators |
| blocker | GATE:P0 signature still formally PENDING; P1 selected under the Director's recorded "go next". |

---

## 1. State at hand-off

P1-001 is done (`docs/VISION.md`, real `validate-docs.mjs`). P1-001 selected under the Director's repeated
"go next" recorded in `docs/state/gates/GATE_P0.md`; no agent signed the gate.

```bash
pnpm verify                        # 13/13
node scripts/validate-docs.mjs     # VISION + ADR structure
node scripts/validate-prompt-drift.mjs
```

## 2. GDD-001 — definition of done

Source: `docs/blueprint/BLUEPRINT.yaml` line 659. Agent **game-designer**, `scaffold: true`, `sig`,
deps `[P1-001]`. Outputs: `docs/design/GDD.md`, `docs/design/gdd/`, `scripts/validate-gdd.mjs`,
`scripts/gdd-coverage.mjs`. Acceptance: **`node scripts/validate-gdd.mjs --template`**.

Master §3.2–3.7 is binding:

1. **32 modules, all `STUB`** — exactly the 32 names in §3.2, beginning with `GDD-CORE`, `STRATA`,
   `CONSEQUENCE`, …, `ANIM-ARCHITECTURE`. A STUB carries only fields **1** (ID/version/owner/status),
   **2** (player-facing outcome), **3** (High Concept link), **17** (explicit out-of-scope) and
   **18** (open questions with owner + deadline). Do not write 32 full modules before code exists (D138).
2. **19-field template** in `docs/design/GDD.md` listing all mandatory fields from §3.4, with the
   STUB→DRAFT→SIGNED maturity rule and the rule that DRAFT/SIGNED need all 19.
3. **`validate-gdd.mjs` real**: `--template` checks 32 files, exact names, STUB fields, no forbidden
   vague words from §3.5 ("fun", "deep", "balanced", "responsive", "immersive", "many", "fast", "smooth",
   "scalable", "MMO-scale") without a number/test; `--critical` computes the modules needed by P2NET,
   P2SYS and P2 tasks from `BLUEPRINT.yaml` `gdd[]` refs. Fails closed, exit 1 on violation.
4. **`gdd-coverage.mjs` real**: `--min <ratio>` compares the share of tasks whose `gdd[]` refs resolve to
   a module with the requested threshold; currently 0.80 for GATE:P2, 1.0 for P3. It must report
   `NOT COMPUTABLE` rather than a fake ratio if refs are unreadable.
5. **Negative tests logged**: missing module, wrong maturity, forbidden adjective, unresolved gdd ref,
   coverage below threshold — each must exit 1.
6. Evidence under `docs/state/evidence/<utc>-GDD-001/`, including the critical-module list computed from
   the blueprint (not typed by hand).

Ownership: `scripts/validate-gdd.mjs` and `scripts/gdd-coverage.mjs` must get explicit game-designer entries
in `OWNERSHIP.yaml` **before** the handoff (WORKFLOW.md §6), as done for producer and release-engineer.

## 3. Open decisions carried forward

1. **ND-004 / ND-005 — OPEN.** Exposed GitHub PAT and HF token still live on a public repo; rotate.
2. **ND-001 / ND-002 / ND-003 / ND-006 / ND-007 / ND-008 / ND-009 — RESOLVED.**
3. GATE:P0 signature PENDING; `main` still empty — the Director merges PR #1.

## 4. After GDD-001

GDD-002..GDD-004, P1-002 (FR/EN), P1-003 (ART_BIBLE + A0001), P1-004 (UX/a11y/loc + TDD/ADRs), then
GATE:P1 (grants S1). Signatures and gate approvals stay with the Director.

## 5. Known red (intentional)

- `scope-math --report` exit 2, `concept --score` exit 2 — unmeasured values stay NOT COMPUTABLE.
- 16 validators still print `NOT IMPLEMENTED`; `pnpm verify` lists them as DEFERRED.
- GDD coverage is null until GDD-001 creates the modules.

## 6. Environment

Node 22.23.4, pnpm 12.21.0, TypeScript 6.0.3, Vitest 5.1.0. No model used before the P0-006 whitelist.
Never commit a token; evidence logs capture commands.
