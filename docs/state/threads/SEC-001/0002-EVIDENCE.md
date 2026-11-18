## 2026-11-18T10:00:00Z | security-auditor -> all | EVIDENCE

**claim.** SEC-001 delivered the ingress gate, per-client rate limit and GM audit with reason codes and counters.
The threat model explicitly lists the residual risks; it does not certify the network as secure.

**evidence** (`docs/state/evidence/20261118T094911Z-SEC-001/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm test --filter @strata/security` | **1** | `CACError` |
| `01-acc-security.log` | `pnpm vitest run --config tests/security/vitest.config.ts` | 0 | **10/10** |
| `02-typecheck.log` | `pnpm typecheck` | 0 | strict |
| `03-full-tests.log` | `pnpm test` | 0 | **142/142** (main suite; security suite uses its own config) |
| `04-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock/RNG/transcendental/foreign import |
| `05-verify.log` / `09-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `06-tracer.log` / `07-gdd.log` / `08-blueprint.log` | validators and tracer | 0 | green · 32 modules · 63 tasks |

**what the tests prove.** Malformed bytes, client-sent snapshots, wrong hello versions, non-monotonic sequences
and unknown kinds are refused with a **counted** reason. Exactly 30 of a 200-message burst are admitted; the rest
get `RATE_LIMIT`. `forget()` on logout clears sequence and rate state. A GM action without a reason writes no
entry; an accepted one is frozen, hashed deterministically and appended.

**honest residual risks (in `docs/legal/THREAT_MODEL.md`).** No authentication (the FNV-1a resume handle is a
tamper detector, not a credential); no TLS in the harnesses; **the gate is not yet wired into `attachRooms`**, so
GDD-SECURITY does not claim "0 unvalidated message paths"; in-memory counters only; no real socket flood; 90-day
audit retention is OPS-001. These are recorded for the Director, not summarised away.

**defect repaired.** `pnpm test --filter @strata/security` could never run (`CACError`) — eleventh broken acc form.
Repaired to a real vitest command with its own config under `tests/security/` (the main vitest include globs do
not cover that directory). 7 `pnpm test --filter` accs remain.

**docs.** GDD-SECURITY 0.2 → 0.3 (I9): honest "0 unvalidated paths" status, 3 sourced numbers, reason codes,
three acceptance lines, corrupted §18 table repaired. No GPU/TPU needed.

**locks.** 11 globs, one sorted commit: security-auditor (gate, tests, threat model, GDD), orchestrator
(blueprint + metrics).
