# A0009 — Director signs all outstanding gates

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18**, Director statement transcribed verbatim |
| accepted_by | Director (`2026-11-18-s02`) |
| date | 2026-11-18 |
| task | GATE:P2 and GATE:NET signatures |
| supersedes | nothing — extends A0006 (blanket risk-accepted NET-GATE signature) to the remaining human gates |

## Context — Director statement

> je signe tous

Spoken after the work side of every P2 gate was reported complete: P0/P1/P2NET/P2SYS signed or satisfied,
HC-003 with CIS **85/100**, GDD-005 with **100%** coverage and a fail-closed drift check, GATE:NET dossier
honest and unsigned only because a human had not signed.

## Decision

1. `GATE:P2` is recorded as **SIGNED by the Director** in `docs/state/gates/GATE_P2.md` §6. Its numeric
   thresholds are met from metrics: CIS 85 ≥ 50, coverage 100% ≥ 80%, scope ledger balanced.
2. `GATE:NET` is recorded as **SIGNED — RISK ACCEPTED** in `docs/state/gates/GATE_NET.md`. The 8
   unmet §5.2 criteria remain listed verbatim; `validate-netgate --assert-ready` still exits 1. A signature is
   an acceptance of known risk, not a measurement.
3. The signature is transcribed by the orchestrator, never claimed as an agent's act (D136). No CI was disabled,
   no assertion weakened, no number changed to obtain it.

## What this ADR does NOT do

- It does not merge PR #1/#2/#3 — the Director performs merges from their own GitHub account; agents never self-merge.
- It does not rotate ND-004/ND-005 tokens, provide the T4 (ND-012), or decide ND-011.
- It does not make the 8 unmet NET-GATE criteria measured. Art still requires a real readiness re-measurement
  under A0008, and original IP/audited assets under I11/I4.
- It suspends no invariant and changes no tier.

## Consequence

The studio has no agent-selectable blueprint task left. The next acts are Director merges, hardware provisioning
and token rotation; then, if desired, a measured re-run of the 8 netcode criteria before any art task starts.
