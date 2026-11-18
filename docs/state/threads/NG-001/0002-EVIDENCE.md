## 2026-11-18T10:40:00Z | producer + netcode-engineer -> all | EVIDENCE

**claim.** NG-001 delivered an honest NET-GATE dossier and a real fail-closed validator. The Director then said
"je signe tout" (verbatim, A0006); the signature is recorded as **risk-accepted, NOT READY on evidence**. No
criterion was promoted, no measurement invented, no assertion weakened.

**evidence** (`docs/state/evidence/` NG-001 dir)

| log | command | exit | result |
|---|---|---|---|
| `01-integrity.log` | `node scripts/validate-netgate.mjs` | 0 | dossier honest, signature recorded as risk-accepted |
| `02-readiness-fail.log` | `node scripts/validate-netgate.mjs --assert-ready` | **1** | **8/10 criteria unmet** — expected, honest |
| `03-negative-tamper.log` | same validator after injecting `wire-budget: met` | **1** | fail closed, names the lie |
| `04-full-result.log` | `node scripts/session-result.mjs --format full` | 0 | FULL §20 result for the gate |
| `05-verify.log` / `07-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `06-tracer.log` | `pnpm tracer --assert` | 0 | green |

**what the validator checks.** All 10 master §5.2 criteria with an allowed status and a cited command/exit/log;
`not-measured` rows must say NOT COMPUTABLE and never cite a fabricated log; the failing wire budget must stay
`failing` at 3.79×; all seven residual risks from the threat model must appear; the Director statement must be
transcribed verbatim; no agent name may appear in the signature block; metrics must record `signed-with-risk`,
`risk_accepted: true`, `criteria_unmet: 8` and keep unmeasured fields null. `--assert-ready` still fails.

**Director signature.** A0004 and D136 forbid an agent from signing a gate. A0006 records the Director's blanket
statement verbatim and marks the gate `signed-with-risk`. `docs/state/gates/GATE_NET.md` carries the signature and
the 8 unmet criteria. **PR merges were not performed** — an agent must not self-merge; the Director must merge
PR #1 and PR #2 from their own account.

**honest consequence.** Art is allowed because the Director accepted the risk, not because NET-GATE was measured
ready. No art was produced by this task. The next phase is P2-SYS greybox (PR-S1); re-measurement remains owed.

**defect repaired.** `scripts/validate-netgate.mjs` was a declared P0-002 stub exiting 1. It now fails closed on
lies and exits 0 only for an honest, complete dossier. NG-001 gained `co: [qa-engineer, netcode-engineer]` so B2
accepts the append-only dossier path.

**locks.** 4 globs on `state/locks`, acquired and released. No GPU/TPU needed.
