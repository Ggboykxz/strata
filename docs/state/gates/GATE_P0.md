# GATE:P0 — evidence dossier

| field | value |
|---|---|
| gate | `GATE:P0` — human, 3 drills |
| status | **ASSEMBLED — awaiting Director signature** |
| branch | `session/20261118-hc-001-high-concept` |
| head at assembly | `3c9c48fd` |
| agent | orchestrator (evidence only; no agent signs a gate) |
| evidence | `docs/state/evidence/20261118T014957Z-GATE-P0/` |

## 1. Required tasks

`GATE:P0.requires = [HC-001, SC-001, WF-001, WF-002, P0-001..P0-007, TRACER-001]` — all present and pushed.

| task | acceptance evidence |
|---|---|
| HC-001 | `...T001004Z-HC-001/`, `...T004835Z-DIRECTOR-RESOLUTIONS/` (v1.2, T3 signed at P0) |
| SC-001 | `...T001004Z-SC-001/` (`validate-scope` 0, `--report` 2 by design) |
| WF-001 | `...T001004Z-WF-001/` (32 owners, 165 globs, 0 ties) |
| WF-002 | `...T005800Z-WF-002/` (real validators, 8/8 negatives) |
| P0-001.a/.b | `...T001004Z-P0-001/` (drift 0, 8/8 negatives, 63 tasks extracted) |
| P0-002.a/.b | `...T001004Z-P0-002/` (32 agents, 51 skills, 6/6 negatives, 21 stubs) |
| P0-003 | `...T004153Z-P0-003/` (frozen install, `verify`, 4 deliberate failures) |
| P0-004 | `...T011433Z-P0-004/` (27 workflows, 80 SHA pins, 8/8 negatives) |
| P0-005 | `...T012151Z-P0-005/` (drill, 7/7 negatives, fail-closed watchdog) |
| P0-006 | `...T012845Z-P0-006/` (9 approved / 0 blocked / 11 rejected, 9/9 negatives) |
| P0-007 | `...T014550Z-P0-007/` (dashboard build, 7/7 checks, deterministic) |
| TRACER-001 | `...T010750Z-TRACER-001/` (equal hashes, desync exit 1, Babylon render) |

## 2. Three kill-session drills

| drill | log | result |
|---|---|---|
| clean state | `01-drill-clean.log` | exit 0, resume plan printed, 1 warning (heartbeat gitignored) |
| expired active lock injected | `02-drill-expired-lock.log` | exit 1, names the expired glob |
| corrupt `heartbeat.json` | `03-drill-corrupt-heartbeat.log` | exit 1, names the parse failure |

A fourth CI-specific case exists in code: Actions checks out a detached HEAD, so the drill falls back to
`GITHUB_REF_NAME` and prints the source. That fix is what made `ci - pnpm verify` green after run
`44218555995` failed on the detached HEAD.

## 3. CI proof

`09-ci-results.log` in the evidence directory records the run at head `3c9c48fd`. After the name
reconciliation, the new head must be checked again on GitHub before signature; static validation alone is
not proof. The runs at `3c9c48fd` were: 13 workflows success, including `ci - pnpm verify`, `tracer`,
`blueprint`, `ownership`, `locks`, `prompt drift`, `scope`, `concept`, `typecheck`, `lint`, `unit`,
`workflow self-validation` and `codeql` (`44218930292`).

The only non-green entry is `dependency - license review` at head `f206b767` (`44218555810`): the
dependency-graph API returned **403** for this repository. It is now `workflow_dispatch`-only with the
observed run recorded in a comment; local pin/licence enforcement remains blocking in `validate-workflows`
and `validate-manifest`. No coverage is claimed for the external service. The Director should decide
whether to enable the dependency graph in repository settings before signing.

## 4. Local gates at assembly

| command | exit | log |
|---|---|---|
| `node scripts/validate-blueprint.mjs` | 0 | `04-blueprint.log` |
| `node scripts/validate-prompt-drift.mjs` | 0 | `04-prompt-drift.log` |
| `node scripts/concept-integrity.mjs --check` | 0 | `05-concept-check.log` |
| `node scripts/scope-math.mjs --check` | 0 | `06-scope-check.log` |
| `node scripts/validate-ownership.mjs` | 0 | `07-ownership.log` |
| `node scripts/validate-locks.mjs` | 0 | `08-locks.log` |
| `pnpm verify` | 0 (12/12) | `10-verify.log` |
| `pnpm tracer --assert` | 0 | `11-tracer.log` |

`scope-math --report` exits 2 and `concept --score` exits 2: throughput and CIS are **NOT COMPUTABLE**.
No number was invented to make the dossier look complete.

## 5. Open items the Director must decide

1. **ND-004 / ND-005** — exposed GitHub PAT and HF token are still live on a **public** repository. Agent
   cannot revoke them; rotation is urgent.
2. **ND-009 — RESOLVED (option A).** ADR-A0003 amends the long-term vision to a full MMORPG delivered
   through a vertical slice, declared in `PROMPT.lock` and the Constitution's `## AMENDMENTS`. No scope,
   tier, task, gate or ledger value changed; the archived master is byte-identical and the drift gate passes.
   I11 forbids copying the commercial Ashes of Creation IP.
3. **Workflow-name deviation — RESOLVED.** The 27 workflows now use the exact master §18 names; see
   `docs/state/evidence/20261118T020134Z-P0-004-RECONCILE/`. All real checks were preserved; the manual
   placeholders print the gate that owns them rather than a fake green. `main` is still the empty root
   commit `36bd9af`. The Director must merge PR #1; no self-merge occurred.

## 6. Signature

> **Director signature: PENDING.** No agent signs a gate. The dossier states evidence and open risks; it
> does not declare `GATE:P0` passed.

---

## Appendix — assembly thread

The orchestrator assembled this dossier from repository evidence only. The three drill logs were produced
by temporarily injecting a broken state and restoring it; no production file was left modified. The CI
result was read from the GitHub Actions API, not inferred from static validation.
