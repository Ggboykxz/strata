# GATE:P1 — evidence dossier

| field | value |
|---|---|
| gate | `GATE:P1` — human, grants tier **S1** |
| status | **SIGNED — tier S1 granted 2026-11-18 by the Director** |
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

GitHub Actions at head `fea7306` recorded **8/8 triggered workflows success** (`ci`, `high-concept`,
`model-audit`, `netcode`, `opencode`, `scope`, `security`, `workflow`). The other 19 master-named files are
manual placeholders or stub callers. Static validation alone is not proof — the run conclusions are the evidence.

Exception carried from GATE:P0: `dependency-review-action` cannot run because the dependency-graph API
returns 403; local pin and licence validators remain blocking. Accepted at GATE:P0 and still recorded here.

## 4. GDD maturity

15 of 32 modules are DRAFT; 14 critical modules are closed; 17 remain STUB by D138 (no prototype exists for
them). This is the correct maturity for P1, not coverage debt. `gdd-coverage --min 0.80` measures reference
resolution (100 %), not module maturity, and the evidence says so.

## 5. Open items for the Director

1. **Signature — RESOLVED 2026-11-18.** The Director signed tier S1 in session `2026-11-18-s02`; the exact
   wording is in §6. The orchestrator transcribed it; no agent claimed it as its own.
2. **ND-004 / ND-005** — exposed GitHub PAT and HF token still live on a public repo. Rotation steps in
   `docs/state/SECURITY_HANDOFF.md`; agent cannot revoke them behind the Director's login. The PAT was
   pasted a second time, inside a resume prompt, during this session.
3. `main` is protected but still empty until PR #1 is merged by the Director.

## 6. Signature

> **Director signature: SIGNED — 2026-11-18T07:58Z.** Recorded Director decision, quoted verbatim:
> **"Oui, signe S1"** — answer to the GATE:P1 question in session `2026-11-18-s02`, after the dossier,
> the local gates and the 8/8 Actions runs were presented.
>
> **Grants tier S1** (`authorized_tier: S1` in `BLUEPRINT.yaml`). This makes `NET-001..006`, `PR-N1..N4`,
> `SEC-001` and `NG-001` selectable. It does **not** pass NET-GATE: I2 still forbids hero art, texture
> bakes, motion generation and scene generation until NG-001, and AI-001/AI-002 additionally require
> GATE:P2 and the P0-006 whitelist.
>
> Signed by the DIRECTOR. Transcribed by the orchestrator as a state change; the signature is not the
> agent's. A tier grant is never self-signed (D136, §0.6).
