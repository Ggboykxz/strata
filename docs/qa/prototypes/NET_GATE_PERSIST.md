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

Lost ticks after checkpoint: 11–13 (varies per run). The ledger comparison (10 150 transactions, keys `tick-*` and genesis) is byte-exact.

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
| 21 | `pnpm install --frozen-lockfile` (v5 rebase) | `20261118T203007Z-NETGATE-PERSIST/01-install.log` | 0 |
| 22–24 | `pnpm vitest run apps/server/test/netgate/ --reporter=verbose` ×3 (stability under matrix load) | `02-suite-1.log`, `03-suite-2.log`, `04-suite-3.log` | 0, 0, 0 |
| 25 | `pnpm test` full suite (v5 rebase) | `05-full-test.log` | 0 (45 files / 330 tests) |
| 26 | `pnpm typecheck` (v5 rebase) | `06-typecheck.log` | 0 |
| 27 | `pnpm verify` attempt 1 (matrix soak still running) | `07-verify-1.log` | **1** — reconnect test hit its 30 s timeout under CPU starvation |
| 28–29 | `pnpm verify` attempts 2–3 | `08-verify-2.log`, `09-verify-3.log` | 0, 0 (19/19 enabled steps green each) |

`pnpm verify` was re-run on the v5 integration tip: **red once, then green twice** (EXIT 1 → 0 → 0). The red was a 30 s test timeout while another agent's matrix soak saturated the 2-vCPU box, not an assertion failure; it is recorded and not hidden. All three exits are cited above. The full suite itself is green (330/330).

## 2a. v5 status — fresh re-run on the integration tip

Rebased clean onto `origin/session/20261118-netgate-core` (`bb969b8`) and re-ran the harness three times under concurrent matrix load (`docs/state/evidence/20261118T203007Z-NETGATE-PERSIST/`, suite EXIT 0/0/0). Verbatim last-run one-liners (`04-suite-3.log`):

```
NETGATE_RECONNECT {"transport":"ws://127.0.0.1:44813","roomId":"reconnect","capacity":4,"reconnectTicks":90,"ticks":121,"entityId":2,"clientId":2,"disconnectedAtTick":58,"resumedAtTick":64,"resumeLatencyMs":45.013,"upgradeMs":36.666,"hashAtCommonTick":{"tick":64,"hash":"da2ca178","matchesPeer":true,"matchesServer":true},"preDisconnectCommonTick":{"tick":50,"hash":"a2f1f347"},"appliedSeqAtDisconnect":45,"appliedSeqOnResume":45,"appliedSeqAtFinalTick":98,"intentsSent":450,"rejectedIntents":0,"desyncEvents":0}
NETGATE_CRASH {"child":"apps/server/test/netgate/crash-child.ts","crash":"SIGKILL","checkpointIntervalMs":5000,"publishedRpoMs":5000,"rpoWithinGateMs":true,"measuredCheckpointAgeAtKillMs":291,"killedAfterRunnerStartMs":7064,"lastProgressTickBeforeKill":163,"lostTicksAfterCheckpoint":13,"checkpoint":{"generation":2,"writtenAt":"2026-11-18T20:31:00.960Z","tick":150,"hash":"0e8bf73f","appliedSeq":[{"clientId":1,"entityId":1,"seq":150},{"clientId":2,"entityId":2,"seq":150},{"clientId":3,"entityId":3,"seq":150},{"clientId":4,"entityId":4,"seq":150}],"intents":600,"ledgerTransactions":10150},"dataset":{"fileBytes":1663606,"worldBytes":584,"intentBytes":37369,"ledgerBytes":1625379,"ticks":150,"intents":600,"ledgerTransactions":10150},"restore":{"ok":true,"restoreMs":985.219,"processWallMs":2227.41,"childElapsedMs":2092.607,"readMs":13.002,"parseMs":60.702,"worldReplayMs":61.042,"ledgerRestoreMs":788.665,"within3s":true,"within3sProcessWall":true,"restoredTick":150,"restoredHash":"0e8bf73f","restoredAppliedSeq":[{"clientId":1,"entityId":1,"seq":150},{"clientId":2,"entityId":2,"seq":150},{"clientId":3,"entityId":3,"seq":150},{"clientId":4,"entityId":4,"seq":150}],"drift":"0"},"runnerStderr":""}
```

**Drift from the previously recorded v5 figures:** reconnect latency 32.83 → 45.013 ms (three runs: 35.425 / 32.949 / 45.013 ms); common-tick hash `374b6a91` → `da2ca178` at the same tick 64; exact applied seq 44 → 45, still identical at disconnect and resume; `desyncEvents` 0 in all runs. Crash restore 319.08 → 985.219 ms (three runs: 632.43 / 903.071 / 985.219 ms), dataset unchanged at **1 663 606 B**, restored tick 150 / hash `0e8bf73f` / seq 150 / drift 0 unchanged, published RPO unchanged at **5 000 ms**. One cold/loaded fresh-process wall time was **3 058.768 ms** (run 2, `processWallMs`), above the 3 s strict end-to-end reading; the in-process restore assertion (< 3 s) passed in every run, and that red wall number stays recorded. Timing drift is explained by the concurrent matrix soak, not by a harness change.

**v5 semantics:** `viewHash` (A0010) is the per-client compared hash where a client prediction exists; the room's global hash remains the audit hash. The harness compares the room/global hash at a common tick (peer and server agree), so reconnect-restore stays **measured-partial**, not a full v5 client-prediction equality claim. The earlier flaky 54-vs-55 seq race was an in-flight intent sampled after disconnect; the repaired harness drains the 4-tick horizon for ≥ 8 ticks, settles the seq, and samples after terminate. The earlier `only 0/4 clients joined` failures were 2-vCPU starvation against a fixed join deadline; joining now waits for the server `welcome`.

## 3. Proven / not proven

**Proven here:** real 4-client loopback resume, exact entity/handle/seq inside the window (both v3 and v5); late resume refused; ledger-aware checkpoint + restore ≤ 3 s with zero drift on a measured 1.66 MB dataset; atomic write+rename; 5 s published RPO ≤ 60 s.

**NOT proven:** production persistence (Postgres/Redis/migrations/double-entry invariants under concurrency); multi-process checkpoint contention; crash during write (partial-file tolerance); RPO as a worst-case bound (one crash sample per run); TLS/auth (loopback plaintext WS only); > 4 clients or 64 entities; this is not NET-102. The resume handle is an opaque FNV-1a hex string, not a credential.

## 4. Residual risks

1. `room.ts` does not recompute `open` after evicting one handle while others remain attached (observed `draining`); lifecycle semantics need a decision before production.
2. Checkpoint format is private to this child harness; nothing reads it in production code.
3. `pnpm verify` on the v5 tip was red once (30 s timeout under matrix load), then green twice (19/19). The red is recorded in `07-verify-1.log`; quiet-CPU-only verification is still not proven.
4. Sequences differ across runs (44 vs 54 vs 55) because horizon-4 intents land at different ticks; the *invariants* (exact seq on resume, hash match at a common tick, zero drift) are the criterion, and they held in every quiet run.

## 5. Files

`apps/server/test/netgate/{support.ts,reconnect.test.ts,crash-restore.test.ts,crash-child.ts,ts-loader.mjs,ts-register.mjs}`, `docs/state/evidence/20261118T200003Z-NETGATE-PERSIST/*` (wire-v3), `docs/state/evidence/20261118T203007Z-NETGATE-PERSIST/*` (v5 integration tip, fresh one-liners in §2a).

## 6. Integration notes

- Base rebased onto `session/20261118-netgate-core` v5 lineage (`baab942`, then clean rebase onto `bb969b8`); all current numbers are v5.
- The reconnect criterion qualifies as **measured-partial** (proven on loopback with 4 clients; no production persistence/auth/TLS). The crash criterion qualifies as **measured-partial** (restore and RPO proven on a measured dataset; single-sample crash timing).
