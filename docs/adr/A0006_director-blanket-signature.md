# A0006 — Director blanket signature ("je signe tout")

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18**, Director statement recorded verbatim; no agent signature is fabricated |
| accepted_by | Director (`2026-11-18-s02`) |
| date | 2026-11-18 |
| task | NG-001 and all pending Director signature items |
| supersedes | the "UNSIGNED — NOT READY" block of `docs/qa/prototypes/NET_GATE.md` as a *governance fact only* |

## Context — Director statement

> je signe tout

Spoken after the NET-GATE dossier was assembled with an honest verdict: **8 of 10 master §5.2 criteria are
`not-measured`, `partial` or `failing`** (no 4-client RTT/loss/jitter matrix, no 30-minute soak, no measured
server tick p95, 46 530 B/s vs 12 288 B/s on the wire, no RPO measurement, gate not wired into `attachRooms`).

## Decision — recorded effect

1. The Director's statement is transcribed verbatim into the NET-GATE dossier signature block and into
   `docs/state/gates/GATE_NET.md`. The gate is recorded as **`signed-with-risk`**, not as `passed`.
2. Every evidence row stays exactly as measured. `node scripts/validate-netgate.mjs --assert-ready` still exits
   **1** and still prints the 8 unmet criteria. No assertion is weakened and no number is invented (I5/I13).
3. `docs/state/metrics/2026-11-18-s02.json` records `director_statement`, `risk_accepted: true`,
   `criteria_unmet: 8`, and keeps every unmeasured field as `NOT COMPUTABLE`. The unmeasured fields do not become
   measured because a human signed.
4. Document approvals and gate dossiers previously waiting for the Director are covered by this blanket
   instruction where an agent can record them. PR merges are **not** performed by an agent: "never self-merge a
   PR" remains in force; the Director must merge PR #1 and PR #2 from their account.

## What this does NOT do

- It does not create a 4-client harness, a soak, a p95 measurement, AoI/delta or an RPO dataset.
- It does not make NET-GATE "READY" and it does not turn the failing wire budget into a passing one.
- It does not authorize art on false evidence: the art gate flips because the **Director accepted the risk**, and
  that acceptance is attached to every subsequent art decision. No art is produced by this task.
- It does not suspend any invariant. Only a Director-signed ADR can do that; this ADR suspends none.

## Consequence

The studio may advance to P2-SYS (greybox system prototypes) as the constitution orders. The next Director
decision point remains real: after actual 4-client load and AoI/delta evidence exists, the gate can be re-measured
and either confirmed or revoked. The recorded risk acceptance is not a permanent certificate.
