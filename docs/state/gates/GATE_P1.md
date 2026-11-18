# GATE:P1 — evidence dossier

| field | value |
|---|---|
| gate | `GATE:P1` — human, grants tier **S1** |
| status | **ASSEMBLED — awaiting Director signature** |
| branch | `session/20261118-hc-001-high-concept` |
| head at assembly | `fea7306` |
| agent | orchestrator — evidence only; no agent signs a tier grant |

## 1. Required tasks

`GATE:P1.requires = [P1-001, GDD-001..GDD-004, P1-002, P1-003, P1-004]`. Every item is implemented and
pushed on this branch.

| task | evidence |
|---|---|
| P1-001 VISION + docs gate | `docs/state/evidence/20261118T021621Z-P1-001/` |
| GDD-001 index + 32 STUB modules | `docs/state/evidence/20261118T022611Z-GDD-001/` |
| GDD-002 six critical modules to DRAFT | `docs/state/evidence/20261118T024155Z-GDD-002/` |
| GDD-003 five concept modules to DRAFT | `docs/state/evidence/20261118T024736Z-GDD-003/` |
| GDD-004 economy closure + tables | `docs/state/evidence/20261118T025203Z-GDD-004/` |
| P1-002 WORLD_BIBLE + FR/EN glossary | `docs/state/evidence/20261118T025647Z-P1-002/` |
| P1-003 ART_BIBLE + A0001 + art gate | `docs/state/evidence/20261118T030121Z-P1-003/` |
| P1-004 specs + TDDs | `docs/state/evidence/20261118T030636Z-P1-004/` |

## 2. Local gates

| command | exit | evidence |
|---|---|---|
| `pnpm verify` | 0 (17/17) | P1-004 `03-verify.log` |
| `node scripts/validate-prompt-drift.mjs` | 0 | step inside verify |
| `node scripts/concept-integrity.mjs --check` | 0 | step inside verify; T3 signed at P0 |
| `node scripts/validate-gdd.mjs --critical` | 0 | GDD-004 `02-critical.log` (14 modules) |
| `node scripts/validate-docs.mjs` | 0 | P1-004 `01-validate-docs.log` |
| `node scripts/validate-lore.mjs` | 0 | P1-002 `01-validate-lore.log` |
| `node scripts/validate-art-bible.mjs` | 0 | P1-003 `01-validate-art.log` |
| `node scripts/validate-workflows.mjs` | 0 | 27 master-named workflows, 56 SHA pins |
| `pnpm --filter @strata/dashboard build` | 0 | P0-007 evidence |

`scope-math --report` and `concept --score` exit 2 by design; throughput and CIS are NOT COMPUTABLE and no
number was invented to make the dossier look complete.

## 3. CI proof

GitHub Actions runs at head `fea7306` are queried in `docs/state/evidence/20261118T031000Z-GATE-P1/01-ci-results.log`.
Eight workflows trigger on PR/push (`ci`, `high-concept`, `model-audit`, `netcode`, `opencode`, `scope`,
`security`, `workflow`); the other 19 master-named files are manual placeholders or stub callers. Static
validation alone is not proof — the run conclusions are the evidence.

Exception carried from GATE:P0: `dependency-review-action` cannot run because the dependency-graph API
returns 403; local pin and licence validators remain blocking. Accepted at GATE:P0 and still recorded here.

## 4. GDD maturity

15 of 32 modules are DRAFT; 14 critical modules are closed; 17 remain STUB by D138 (no prototype exists for
them). This is the correct maturity for P1, not coverage debt. `gdd-coverage --min 0.80` measures reference
resolution (100 %), not module maturity, and the evidence says so.

## 5. Open items for the Director

1. **Signature** — tier S1 promotion is Director-only. No agent signs it. The earlier "take the good
   decisions" instruction was applied to GATE:P0, which changed no tier; it is **not** extended to S1.
2. **ND-004 / ND-005** — exposed GitHub PAT and HF token still live on a public repo. Rotation steps in
   `docs/state/SECURITY_HANDOFF.md`; agent cannot revoke them behind the Director's login.
3. `main` is protected but still empty until PR #1 is merged by the Director.

## 6. Signature

> **Director signature: PENDING.** No tier grant is claimed by an agent. After signature, NET-GATE work
> (NET-001..006, PR-N1..N4, SEC-001, NG-001) becomes selectable; art stays greybox until NG-001.
