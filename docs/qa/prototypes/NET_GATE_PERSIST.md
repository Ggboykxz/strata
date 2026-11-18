# NET-GATE persist — reconnect/crash measurement (NETGATE-PERSIST)

| field | value |
|---|---|
| task | GATE:NET (reconnect-restore + crash-restore-rpo criteria) |
| date | 2026-11-18 |
| base | wire-v3 `79936e1` for the first runs; **final figures measured on the v5 integration branch** `session/20261118-netgate-core` (`baab942`) after reliability repairs |
| harness | `apps/server/test/netgate/{support.ts,reconnect.test.ts,crash-restore.test.ts,crash-child.ts}` |
| environment | Node 22.23.4, `ws` 8.23.0, 127.0.0.1, 4 real `ws` clients, 30 Hz authoritative tick |

**Prototype only: not NET-102 production persistence, not Postgres, not Redis, not a multi-process system. No TLS, no authentication, no network egress.**

**This document does not claim NET-GATE ready.** `node scripts/validate-netgate.mjs --assert-ready` stays exit 1.

## 1. What was measured

### 1.1 Reconnect-restore (real sockets, 4 clients)

Protocol: four `ws` clients join one room (`capacity: 4`, seed 1337, `reconnectTicks = 90` = 3 s at 30 Hz). Client 2 is terminated abruptly (`ws.terminate()`), the server flags the handle at the next tick, client 2 resumes with the opaque resume handle read from the authoritative room object. The resume restores entity id, client id and handle; the hash at a common tick and the per-entity applied seq are compared.

**Measured on the v5 branch (fresh logs 19/20):** `disconnectedAtTick 58 → resumedAtTick 64`, resume latency **32.83 ms** (upgrade 10.25 ms), hash at common tick 64 `374b6a91` matches peer **and** server; `appliedSeqAtDisconnect` 44, restored 44 **exact**; final tick 121 hash check passed; rejectedIntents 0, desyncEvents 0; intents sent 448 (with `healthHorizon` = latest + 4 ticks).

**Measured pre-v5 (wire-v3, logs 01/12, historical):** same test passed at `disconnectedAtTick 60 → resumed 66`, latency 31.4 ms, hash `71e1d571` matches peer and server at tick 66, seq 54/54; late resume refused (tick 111 > window 90).

**Fixes applied (test/harness only; production untouched):**
1. `support.ts` hello now uses `PROTOCOL_VERSION` (was literal `3`).
2. Join waits for the server's `welcome` (`waitForWelcome`) instead of a fixed 2 s poll deadline (immune to CPU contention; earlier `only 0/4 clients joined` failures were starvation on 2 vCPUs, not a logic bug).
3. v5 intents carry `targetTick` (`latestSnapshotTick + 4`); without it every intent was refused at decode (`INTENT_BYTES 11→15` in v5).
4. The resume test stops intents ≥ 8 ticks before terminate (longer than the 4-tick horizon) and samples the applied seq with `settleEntitySeq` afterwards; earlier 2-tick settle windows raced buffered intents (53 vs 54).
5. On v5, `viewHash` is the compared per-client hash where a client prediction exists; this harness reconciles presentation snapshots, so the rooms compare the global world hash and both match.

### 1.2 Crash-restore / RPO (SIGKILL, temp checkpoint, fresh process)

Measured on v5 (log 20): SIGKILL after 6 360 ms; checkpoint gen 2 written at tick 150 (age at kill 243 ms); dataset **1 663 606 B** (world 584 B, intent log 37 369 B, ledger 1 625 379 B; 600 intents, 10 150 ledger transactions); **restore 319.08 ms** (< 3 s; `processWallMs` 1 023.8 ms), drift **0**; restored tick 150, hash `0e8bf73f` matches checkpoint; all four clients restored at seq 150.

Pre-v5 (log 02, historical): SIGKILL after 7 477 ms; restore 229.73 ms; dataset 1 664 010 B; 10 151 ledger transactions; drift 0 — all within 3 s, RPO 5 000 ms.

**RPO is the configured checkpoint interval (5 s ≤ 60 s). One crash sample per run; published as the prototype's RPO, not a production guarantee.**

Lost ticks after checkpoint: 11 (both runs). The ledger comparison (10 150 transactions, keys `tick-*` and genesis) is byte-exact.

## 2. Acceptance commands and exits

| # | command | log | exit |
|---|---|---|---|
| 01 | `pnpm vitest run apps/server/test/netgate/reconnect.test.ts --reporter=verbose` (wire-v3) | 01 | 0 |
| 02 | `pnpm vitest run apps/server/test/netgate/crash-restore.test.ts --reporter=verbose` (wire-v3) | 02 | 0 |
| 03 | `pnpm vitest run apps/server/test/netgate/` (wire-v3) | 03 | 0 |
| 04 | targeted `tsc --noEmit` (wire-v3) | 04 | 0 |
| 05 | `pnpm test` full suite (wire-v3) | 05 | 0 |
| 06 | `pnpm verify` (wire-v3) | 06 | 1 — vitest failed on the reconnect race (§1.1 fix #4), resolved later |
| 07–09 | reconnect retries pre-fix | 07,08,09 | 1,1,0 |
| 10–12 | reconnect retries after settle fix (wire-v3) | 10,11,12 | 0,0,0 |
| 13–15 | v5 suite re-runs (races in §1.1 fixed) | 13,14,15 | 1,1,0 |
| 16–18 | v5 suite after settle/horizon repair | 16,17,18 | 0,0,0 |
| 19 | v5 `reconnect.test.ts --reporter=verbose` (fresh) | 19 | 0 |
| 20 | v5 `crash-restore.test.ts --reporter=verbose` (fresh) | 20 | 0 |

`pnpm verify` **on the v5 tip is NOT COMPUTABLE on a loaded 2-vCPU box in this session**; it must be re-run on quiet CPU and recorded. This paragraph is updated with the first quiet-CPU run rather than asserted.

## 3. Proven / not proven

**Proven here:** real 4-client loopback resume, exact entity/handle/seq inside the window (both v3 and v5); late resume refused; ledger-aware checkpoint + restore ≤ 3 s with zero drift on a measured 1.66 MB dataset; atomic write+rename; 5 s published RPO ≤ 60 s.

**NOT proven:** production persistence (Postgres/Redis/migrations/double-entry invariants under concurrency); multi-process checkpoint contention; crash during write (partial-file tolerance); RPO as a worst-case bound (one crash sample per run); TLS/auth (loopback plaintext WS only); > 4 clients or 64 entities; this is not NET-102. The resume handle is an opaque FNV-1a hex string, not a credential.

## 4. Residual risks

1. `room.ts` does not recompute `open` after evicting one handle while others remain attached (observed `draining`); lifecycle semantics need a decision before production.
2. Checkpoint format is private to this child harness; nothing reads it in production code.
3. `pnpm verify` on the v5 tip on quiet CPU must be executed; until then the acceptance row above stays NOT COMPUTABLE.
4. Sequences differ across runs (44 vs 54 vs 55) because horizon-4 intents land at different ticks; the *invariants* (exact seq on resume, hash match at a common tick, zero drift) are the criterion, and they held in every quiet run.

## 5. Files

`apps/server/test/netgate/{support.ts,reconnect.test.ts,crash-restore.test.ts,crash-child.ts,ts-loader.mjs,ts-register.mjs}`, `docs/state/evidence/20261118T200003Z-NETGATE-PERSIST/*`.

## 6. Integration notes

- Base rebased onto `session/20261118-netgate-core` v5 lineage (`baab942`); final numbers are v5.
- The reconnect criterion qualifies as **measured-partial** (proven on loopback with 4 clients; no production persistence/auth/TLS). The crash criterion qualifies as **measured-partial** (restore and RPO proven on a measured dataset; single-sample crash timing).
