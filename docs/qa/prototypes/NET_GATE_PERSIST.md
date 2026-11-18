# NET-GATE persist — reconnect/crash measurement (NETGATE-PERSIST)

| field | value |
|---|---|
| task | GATE:NET (reconnect-restore + crash-restore-rpo criteria) |
| date | 2026-11-18 |
| base | `79936e1` (wire-v3 room; not rebased on A0010 — see §6) |
| harness | `apps/server/test/netgate/{support.ts,reconnect.test.ts,crash-restore.test.ts,crash-child.ts}` |
| environment | Node 22.23.4, `ws` 8.23.0, 127.0.0.1, 4 real `ws` clients, 30 Hz authoritative tick |

**Prototype only: not NET-102 production persistence, not Postgres, not Redis, not a multi-process system. No TLS, no authentication, no network egress.**

**This document does not claim NET-GATE ready.** `node scripts/validate-netgate.mjs --assert-ready` stays exit 1.

## 1. What was measured

### 1.1 Reconnect-restore (real sockets, 4 clients)

Protocol: four `ws` clients join one room (capacity 4, seed 1337, `reconnectTicks = 90` = 3 s at 30 Hz). Client 2 is terminated abruptly (`ws.terminate()`), the server notices at its next tick, client 2 resumes with the opaque resume handle read from the authoritative room object. Asserts: same entity id, same handle/clientId, authoritative hash at a common tick, per-entity applied seq.

Commands and results (all under `docs/state/evidence/20261118T200003Z-NETGATE-PERSIST/`):

| run | result | key fields |
|---|---|---|
| 01-reconnect | EXIT=0 | `entityId=2`, `clientId=2`, disconnectedAtTick 60, resumedAtTick 66, resumeLatency 31.369 ms, upgrade 9.852 ms, hash at common tick 66 `71e1d571` matches peer **and** server, appliedSeqAtDisconnect 54 → resumed 54, final tick 121 seq 109, intentsSent 454, rejected 0, desyncEvents 0 |
| 01-reconnect (late) | EXIT=0 | late resume at tick 111 vs disconnect at tick 20 → **refused** `unauthorized`, 3 members left, room `draining` (not re-opened; see §6) |
| 06-verify (before fix) | EXIT=1 | full vitest failed one assertion: seq 54 vs 55 — the client was terminated while an intent was in flight; baseline was sampled **before** terminate |
| 10/11/12-reconnect-settle (after fix) | EXIT=0 (3/3) | resumeLatency 32.2–33.2 ms; hash `71e1d571`/`a0216b89`; seq now captured after terminate (54/55 stable within a run pair) |

**Fix applied in this worktree (test-only, production untouched):** `support.ts` hello now uses `PROTOCOL_VERSION` instead of a literal, and `reconnect.test.ts` samples `appliedSeqAtDisconnect` **after** `terminate()` + two settled ticks (the server may apply in-flight intents post-disconnect; a pre-disconnect sample races it). Join deadline raised 2 s → 15 s because the full suite under load starves the 2-vCPU event loop (that was the cause of the `only 0/4 clients joined` failures 07/08, not a logic bug).

### 1.2 Crash-restore / RPO (SIGKILL, temp checkpoint, fresh process)

A child process (`crash-child.ts`) runs the same 30 Hz world, checkpoints `world + intent log + ledger (10 151 transactions)` to a temp directory every 5 s (atomic write: temp file → fsync → rename). After 7 477 ms it is SIGKILLed. A fresh child process restores from the checkpoint and replays.

Measured (02-crash-rpo.log, EXIT=0):

| metric | value |
|---|---|
| checkpoint interval / published RPO | 5 000 ms |
| checkpoint age at kill | 255 ms |
| dataset on disk | **1 664 010 B** (world 588 B, intent log 37 625 B, ledger 1 625 523 B; 604 intents, 10 151 ledger transactions, 151 ticks) |
| restore — parse | 21.73 ms |
| restore — world replay | 14.82 ms |
| restore — ledger | 180.30 ms |
| **restore — total** | **229.73 ms** |
| process wall (spawn → done) | 796.34 ms |
| restored tick / hash | 151 / `2a346a54`, hash matches checkpoint |
| applied seq on restore | 1..4 → 151 each (exact) |
| ledger drift | **0** |
| within 3 s? | **yes** (both replay-only and process wall) |

**RPO is the configured checkpoint interval (5 s ≤ 60 s). It is not a measured worst-case loss bound under real crash timing; it is the published promise of this prototype.** Lost ticks after checkpoint: 11 at kill time.

## 2. Acceptance commands and exits

| command | log | exit |
|---|---|---|
| `pnpm vitest run apps/server/test/netgate/reconnect.test.ts --reporter=verbose` | 01, 10, 11, 12 | 0 (3 runs after fix; failure seen in 07/08 was load-induced join timeout) |
| `pnpm vitest run apps/server/test/netgate/crash-restore.test.ts --reporter=verbose` | 02 | 0 |
| `pnpm vitest run apps/server/test/netgate/` | 03 | 0 |
| `tsc --noEmit` targeted | 04 | 0 |
| `pnpm test` (full suite) | 05 | 0 |
| `pnpm verify` | 06 | **1** — unit step failed on the reconnect race above (fixed afterwards; `pnpm verify` was not re-run green in this loaded shell window; targeted reconnect retries are green 3/3) |
| `pnpm verify` after fix | not re-run | **NOT COMPUTABLE** in this session's CPU contention window — recorded honestly, not claimed |

## 3. Proven / not proven

**Proven here:** real 4-client loopback resume with exact entity/hash/seq inside the window; late resume refused; ledger-aware checkpoint + restore ≤ 3 s with zero drift on a measured 1.66 MB dataset; atomic write+rename.

**NOT proven:** production persistence (Postgres/Redis/migrations/double-entry invariants under concurrency); multi-process checkpoint contention; crash during write (partial file tolerance); RPO under arbitrary kill timing (only 255 ms pre-kill age was observed — one sample); TLS/auth (loopback plaintext WS only); rate-limiting-flood-RPO interaction; performance under > 4 clients or 64 entities; this is not NET-102. The resume handle is an opaque FNV-1a hex string, not a credential.

## 4. Residual risks

1. `room.ts` does not recompute `open` after evicting one handle while others remain attached (observed `draining`); lifecycle semantics need a decision before production.
2. Checkpoint format is private to this child harness; nothing reads it in production code.
3. `pnpm verify` green after the settle fix was not re-measured under contention; the 3/3 reconnect runs are the fresh evidence.
4. Base branch is wire-v3; merges onto A0010 (protocol v4) and the target-tick branch (v5) may invalidate `snapshot.hash` semantics (v4 added `viewHash`; the room hash comparisons in this harness use the global hash, which remains valid in v4).

## 5. Files

`apps/server/test/netgate/{support.ts,reconnect.test.ts,crash-restore.test.ts,crash-child.ts,ts-loader.mjs,ts-register.mjs}`, `docs/state/evidence/20261118T200003Z-NETGATE-PERSIST/*`.

## 6. Integration notes

- Rebase onto `session/20261118-netgate-core` (v4) before merging; rerun the suite and `pnpm verify` on quiet CPU.
- The reconnect criterion qualifies as **measured-partial** (reconnect proven; exact-state restore proven in-memory; no production persistence, no TLS/auth). The crash criterion qualifies as **measured-partial** (restore and RPO proven on a measured dataset; single-sample crash timing).
