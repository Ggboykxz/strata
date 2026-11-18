# 2026-11-18T00:48:00Z · resolution of the Director blockers (ND-001, ND-002)

- **scope** governance + lore, no runtime change
- **agent** orchestrator (ND-001 recorded by the high-concept-guardian's published option; ND-002 by A0002)
- **branch** `session/20261118-hc-001-high-concept`
- **files** `docs/design/HIGH_CONCEPT.md`, `docs/adr/A0002_workflow-validator-ownership.md`,
  `docs/blueprint/BLUEPRINT.yaml`, `docs/state/OWNERSHIP.yaml`, `docs/WORKFLOW.md`, `AGENTS.md`,
  `docs/production/DISPUTES.md`, `docs/state/NEEDS_DIRECTOR.md`, `docs/state/SESSION.md`,
  `docs/state/NEXT_SESSION.md`, `docs/state/metrics/2026-11-18-s01.json`

## decisions

- **ND-001 → RESOLVED (Option A).** The Director's instruction to resolve the blockers was applied to the
  already-published 25-word EN candidate — no new lore was invented. HIGH_CONCEPT becomes v1.1; FR re-locked
  at 30 words; FINDING-001 and CD-001 closed. **The T1 limit stayed at 25**: the sentence was brought to the
  limit, not the limit raised to the sentence. Option B (limit 30) rejected.
- **ND-002 → RESOLVED (A0002 option A).** WF-002 runs as orchestrator; the two validators are explicit
  `scripts/**` exceptions. D-002 is RESOLVED and the blueprint's §12 extraction carries a *cited* governance
  amendment comment — never a silent edit. WORKFLOW §1 and AGENTS §7 record the boundary.
- **ND-003 → DEFERRED.** Private on the personal account is the recommendation until GATE:P0; no task is
  blocked by it now.
- **ND-004 / ND-005 → STILL OPEN.** Token rotation is an account action behind the Director's login/2FA.
  This process cannot revoke either token; it will not pretend to. A prefix scan found 0 secrets in `.git`
  or tracked files and no credential helper.

## measured

- `concept-integrity --init` **exit 0**, 0 recorded debt
- `concept-integrity --check` **exit 1** with exactly one remaining debt: unsigned T3 (deferred to P1)
- `validate-blueprint` **exit 0**, 0 errors, **12** warnings (was 13 — the refusal is gone)
- blueprint negative tests **6/6**; 21/21 stubs still exit 1 with their markers
- `pnpm verify` **7/7** green, 3 deferred groups printed

## risk and reversal

Both resolutions live in an **unmerged draft PR**. If the Director prefers ND-001 option B or ND-002 option
B/C, the change is a normal PR amendment before merge — no history rewrite and no silent overwrite of the
decision record. The ADR and HIGH_CONCEPT §7 preserve the rejected options and their rationale.

## Added decision — T3 signed at GATE:P0 (2026-11-18T00:52Z)

The HIGH_CONCEPT §5 grid said "signing deferred to GATE:P1", but master §1.4 says T3 is
"re-signed at each gate" and GATE:P0 is a gate. I followed the master: the guardian signed at P0 with the
N2 × N4 basis recorded in the document, and the signature is explicitly gate-scoped (re-sign with fresh
prototype evidence at each later gate). This is a decision, not a loophole: `concept --check` now exits 0
because the required signature exists, not because the check was weakened. Evidence
`docs/state/evidence/20261118T004835Z-DIRECTOR-RESOLUTIONS/09-concept-signed-check.log`.

## next

P0-004 (27 CI workflows + real `validate-workflows.mjs`), then WF-002 — now selectable, with its outputs
orchestrator-owned. Gate sign-off still needs ND-004/ND-005 closed and T3 signed at GATE:P1.
