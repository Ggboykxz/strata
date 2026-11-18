# A0005 — "bypass les limites"

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18**, Director instruction recorded verbatim; PR stays draft and reversible |
| accepted_by | Director (`2026-11-18-s02`) |
| date | 2026-11-18 |
| task | NET-006 and the follow-on measurement task |
| supersedes | the "honest limits" deferrals in the NET-004 result |

## Context — Director statement

> bypass les limites et go next

## Decision — interpretation recorded by the orchestrator

The deferrals at the end of NET-004 were: no jitter buffer (D149's 100–250 ms), no resync frame in the
protocol, and no measured tick-p95 / bandwidth. This ADR folds those three items into the next work instead of
leaving them for later:

1. **NET-006** gains a resync frame (wire v3), an adaptive jitter buffer, and server-authoritative anim state
   validation and hit frames.
2. **PR-N1** produces an actual local measurement harness with a command, an exit code and a log. Numbers it
   reports are labelled for what they measure (local tick CPU and framed byte rates), never presented as
   network RTT from real clients.

## What is NOT bypassed

- Invariants I1–I15 (only a Director-signed ADR can suspend one; this ADR suspends none).
- NET-GATE: no art, texture bake, motion or scene generation; everything stays greybox (I2).
- Director-only actions: PAT/HF token rotation and merging PR #1 / PR #2. The orchestrator cannot perform them.
- Evidence-only rules (I13): a bypassed deferral still needs a command, an exit code and a log. No number is
  invented to satisfy the instruction.
- The 30-minute unit rule and one-checkpoint-per-task: the extended work is split into NET-006 and PR-N1, each
  with its own locks, evidence and commit.

## Consequence

The honest limits list gets shorter, not false: anything still unmeasured after PR-N1 is reported as
`NOT COMPUTABLE` with the reason, as before.
