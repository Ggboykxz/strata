# A0007 — Director: fix all fixable problems and limits

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18**, Director statement recorded verbatim; no agent signature is fabricated |
| accepted_by | Director (`2026-11-18-s02`) |
| date | 2026-11-18 |
| task | TOOL-FIXALL and the follow-on SEC-002 / economy-retune checkpoints |
| supersedes | A0004's instruction to leave the stale Colyseus row in `docs/STACK.lock.md` unchanged |

## Context — Director statement

> fix all problems n limits

Spoken after PR-S5 reported a measured inflation of 7 264,78 % against a 5 % target, 12 false-pass acceptance
forms, a missing generated journal view, an unpinned Playwright MCP, a lock validator that refused gate ids, and
the NET-GATE limits that remain unmeasured (8 of 10 criteria).

## Decision

1. Fix everything fixable in the repository now, in checkpointed units with locks, evidence and CI: false-pass
   acceptance detection, verify coverage, journal view, MCP pin, lock validator gate ids, stale STACK row.
2. SEC-002 wiring (gate on the live room path) and a **measured** economy retune are separate checkpoints; the
   inflation failure must not be hidden by a silent constant change.
3. The following remain genuinely blocked and are recorded, not closed: no GPU/TPU (ND-012); no 4-client
   RTT/loss/jitter matrix, 30-minute soak, tick p95, RPO dataset or AoI/delta (NET-GATE 8 criteria); PAT/HF token
   rotation and PR merges (Director-only); TPU scope (ND-011). A Director instruction does not create hardware,
   network measurements or account access.

## What this does NOT do

It does not suspend an invariant, fake a measurement, retune an economy to pass a gate without recording the
before/after, or sign NET-GATE on the Director's behalf. Only a Director-signed ADR can suspend an invariant;
this ADR suspends none.

## Consequence

`docs/STACK.lock.md` now records the Colyseus bypass explicitly instead of leaving an obsolete row. A0004 stays
as history; the newer instruction wins on that single point. All residual limits are re-listed in
`docs/state/NEEDS_DIRECTOR.md` with their true blocker.
