# GATE:P2 — evidence dossier

| field | value |
|---|---|
| gate | `GATE:P2` — human, CIS >= 50, GDD coverage >= 80% |
| status | **SIGNED — 2026-11-18 by the Director** |
| branch | `session/20261118-hc-001-high-concept` |
| agent | orchestrator — evidence only; no agent signs a gate |

## 1. Required tasks

`GATE:P2.requires = [GATE:NET, GATE:P2SYS, HC-003, GDD-005]`. All four are complete on the session branch.

| requirement | evidence |
|---|---|
| GATE:P2NET | NET-001..006, PR-N1..N4, SEC-001 done; `docs/state/gates/GATE_NET.md` |
| GATE:P2SYS | PR-S1..S8 + GB-001 done; `docs/state/journal/20261118T175800Z-pr-s6.md` |
| HC-003 | `docs/state/evidence/` HC-003 dir — two-client 900-tick replay, CIS 85/100 |
| GDD-005 | `docs/state/evidence/` GDD-005 dir — 17 drift specs, coverage 100% |

## 2. Numeric thresholds (from metrics, never from memory)

| metric | measured | required | verdict |
|---|---|---|---|
| CIS | **85/100** (`docs/state/metrics/concept.json`) | >= 50 | PASS |
| GDD reference resolution | **100%** (63/63 tasks) | >= 80% | PASS |
| Scope ledger | **12 entries, balanced** | balanced | PASS |
| GDD maturity | 15 DRAFT / 17 STUB / 0 SIGNED | DRAFT for prototypes (D138) | PASS for P2 prototypes |
| `pnpm verify` | **19/19** enabled steps green | all green | PASS |
| GitHub Actions | **8/8** triggered workflows success at the attested heads | required contexts green | PASS |

## 3. Honest residual risks attached to this signature

1. **GATE:NET is signed-with-risk, not ready**: 8 master §5.2 criteria remain unmet; `node scripts/validate-netgate.mjs
   --assert-ready` still exits 1. No art before a measured re-run (I2/A0008).
2. **CIS `wow density` is 0** — no playtest exists. The 85 is honest, not a fabricated full score (I13).
3. **NO GPU/TPU** in this runtime (ND-012); the T4 is needed for AI-001/AI-002 only.
4. **ND-004/ND-005** token rotations remain open; **ND-011** TPU scope remains open.
5. PR #1 is merged (`096fdfe`); **PR #2 and PR #3 merges are Director acts**; no agent self-merges.
6. Original IP and audited assets only — the quality benchmark named by the Director is not content to copy (I11/A0008).

## 4. Re-measurement obligation

This signature authorises P2 work, not art. Art tasks AI-001..AN-002 additionally need a genuinely passed NET-GATE
(4-client matrix, 30-min soak, tick p95, wire budget, RPO dataset) and GATE:P3 quality evidence. The residual risks
above stay attached to every later decision.

## 5. Signature

> **Director signature: SIGNED — 2026-11-18.** Recorded Director decision, quoted verbatim: **"je signe tous"**.
> Signed by the DIRECTOR and transcribed by the orchestrator as a state change; it is not an agent signature
> (D136). No CI was disabled, no assertion weakened and no metric changed to obtain it.
> Scope: `GATE:P2` (this dossier) and `GATE:NET` (`docs/state/gates/GATE_NET.md`, risk accepted).
> Not included: PR merges, token rotation, hardware provisioning, and the 8 unmet NET-GATE measurements.
