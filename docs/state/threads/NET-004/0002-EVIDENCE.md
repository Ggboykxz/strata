## 2026-11-18T09:12:00Z | netcode-engineer -> all | EVIDENCE

**claim.** NET-004 is implemented: the client predicts with the same core step, reconciles against server
snapshots at the tick they name, replays only unacked intents, and treats a hash mismatch as a **desync** —
rejected, never silently reconciled. Presentation interpolation is integer-only and never feeds back.

**evidence** (`docs/state/evidence/20261118T090603Z-NET-004/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm test --filter @strata/netcode` | **1** | `CACError: Unknown option --filter` |
| `01-acc-net.log` | `pnpm vitest run apps/game/test/net.test.ts` | 0 | **15/15** |
| `02-typecheck.log` | `pnpm typecheck` | 0 | strict, no error |
| `03-full-tests.log` | `pnpm test` | 0 | **105/105** (9 files) |
| `04-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock · 0 RNG · 0 transcendental · 0 foreign import |
| `05-verify.log` / `09-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `06-gdd.log` | `node scripts/validate-gdd.mjs` | 0 | 32 modules |
| `07-blueprint.log` | `node scripts/validate-blueprint.mjs` | 0 | 63 tasks, 12 warnings |
| `08-tracer.log` | `pnpm tracer --assert` | 0 | equal hashes, desync rejected |

**what the tests prove.**
- `HashTimeline` returns `ok`/`desync`/`unknown` at the named tick, prunes by tick, evicts by capacity and
  refuses a malformed hash. An unrecorded tick is never `ok` (GDD §8.3).
- Two predictors with the same seed and a 60-step script produce identical hash sequences.
- A matching snapshot drops acknowledged intents and replays only the survivors; replay restores the exact
  server state plus the predicted steps. A snapshot predating every intent replays them all in `(tick, seq)` order.
- A wrong hash or a missing own entity produces `desync`, increments the counter, clears pending intents, sets a
  resync request and adopts the **authoritative** state exactly. No silent correction.
- Interpolation uses integer millimetres, rejects an out-of-range alpha, refuses to mix two entity ids and does
  not mutate its inputs. The buffer ignores duplicate/older snapshots and clears on resync.

**GDD.** GDD-NETCODE 0.4 → 0.5 (I9): desync semantics, two sourced numbers (128-tick client timeline, integer
alpha), predictor state machine, `SnapshotView` contract, three edge cases, three acceptance lines. Its
corrupted §18 open-questions table was replaced with the jitter-buffer and desync-request questions.

**defect repaired.** NET-004's acc was `pnpm test --filter @strata/netcode` (`CACError`, exit 1); repaired to the
test file path. **8 accs remain broken**, all re-counted from the blueprint.

**honest limits.** No jitter buffer (D149's 100–250 ms is a later number), no resync frame in the protocol
(a fresh-seq intent is the placeholder until NET-006), no bandwidth or tick-p95 measurement (NET-006), no
cross-room handoff, no auth (SEC-001). The `SnapshotBuffer` is presentation-only. No GPU/TPU needed.

**locks.** 10 globs, one sorted commit: netcode-engineer (net module, hash timeline, GDD), gameplay-engineer
(test, core export), orchestrator (blueprint + gates).
