# NET-GATE matrix — 4-client real-socket v5 measurement (NETGATE-MATRIX)

| field | value |
|---|---|
| task | GATE:NET (NET-GATE re-measurement: four-client-matrix, desync-correction, server-tick-p95, soak-30min) |
| date | 2026-11-18 |
| code | `340d67b` (v4 `viewHash`) → `b8d13c7` (v5 target-tick merged) → rebase `baab942` → harness `49ded86` → v5 adaptation `3dc16b9` → docs `a5d63d3`, `6b703f6` |
| measurement commit | **`6b703f6d`** — `MATRIX_COMMIT=$(git rev-parse HEAD)` in all 26 objects below |
| harness | `apps/server/test/netgate/matrix-{emulator,predictor,harness,cell.test,emulator.test}.ts` |
| clean evidence | `docs/state/evidence/20261118T202616Z-NETGATE-MATRIX-V5-RUN/` — 26 logs, all `EXIT=0` (24 cells + control + soak) |
| metrics (append-only) | `docs/state/metrics/20261118-netgate-matrix.json` — objects with `run_id` prefix `v5b-` (26 appended); older objects untouched |
| environment | Node 22.23.4, pnpm 12.21.0, Linux x86_64, loopback `127.0.0.1`, no external network |
| emulation | application-level (`setTimeout` delay queue per direction), NOT tc/netem; seeded LCG, seed **20261118**; world seed **1337** |

## 0. Authority and provenance (read before the tables)

1. The authoritative v5 run is the 26-log set in `20261118T202616Z-NETGATE-MATRIX-V5-RUN/`, executed
   2026-11-18T20:26Z–21:04Z, sole pilot, no competing process, all `EXIT=0`. It ran 24 cells × 15 s,
   a 60 s control and the mandatory 1800 s soak (EXIT=0, 1802.19 s wall clock, 54 027 authoritative
   ticks). Its directory originally ended `-NETGATE-MATRIX`; it was **renamed** to the `-V5-RUN` name
   required by the relaunch handoff at 21:05Z. Log bytes, timestamps, metrics and `EXIT=` lines are
   unchanged; only the directory name differs. The soak log itself records `Start at 20:34:21`,
   `Duration 1802.19s`, `EXIT=0`.
2. `docs/state/evidence/20261118T202001Z-NETGATE-MATRIX-V5/` (the interrupted parent driver, 22 partial
   logs, no `99-finished.log`) is **operator error, discarded** — mixed file state mid-run (two runners
   in one worktree, 20:20–20:25). Files kept for audit; **zero claims** are based on it.
3. `docs/state/evidence/20261118T202148Z-NETGATE-MATRIX/` (matrix's own duplicate, stopped at 20:23) is
   a partial/contended run: logs 04–07 `EXIT=0`, 08 has metrics but no `EXIT=`, 09+ never ran. Not evidence.
4. `docs/state/evidence/20261118T200046Z-NETGATE-MATRIX/` holds the v4-broken-pipeline baseline (24
   cells + control, `EXIT=0`, pre-v5 predictor). Per NG-001/0002 those numbers are **not gate evidence**
   and are retained only for comparison. The v4 metrics objects (`commit=5e3b03b3`) remain in the
   append-only metrics array, untouched.
5. Collaboration: contract `0001-COLLAB.md` §3/§6 and log `0002-COLLAB-LOG.md` were read before the run;
   BEFORE, COLLISION and AFTER entries were appended there. No validator, protocol file, `room.ts`,
   `apps/game` predictor, `NET_GATE.md` or state/journal file was edited.

## 1. Harness contract (what the numbers mean)

- Real `ws` `WebSocketServer` on `127.0.0.1:0`, `RoomHub({ capacity: 4, reconnectTicks: 90, seed: 1337 })`
  attached through `attachRooms` (SEC-002 MessageGate in path). Four real `ws` clients connect with
  `?room=matrix&nonce=<n>` sequentially; entity ids are join-order 1..4, cross-checked against every
  snapshot's `viewHash` (`ownIdCheck == 'match'` for all clients in all clean runs).
- Each direction is a seeded delay queue: one-way = RTT/2, loss drawn before jitter, jitter uniform in
  `[0, jitterMs]`. Seeded decisions are reproducible; sub-millisecond delivery interleavings are not.
- The replicated v5 predictor mirrors the merged `apps/game/src/net/predictor.ts`:
  `schedule(seq, dx, dz, targetTick)` validates a strictly future targetTick and seq monotonicity;
  `advanceTo(tick)` steps `stepWorld` with empty commands on off-target ticks, applies due commands in
  canonical `(entity, seq)` order, and records the hash at every tick; `reconcile()` compares the
  snapshot `viewHash` at the snapshot's tick, adopts server state, and replays unacked intents at their
  original `targetTick` (clamped to the earliest available tick if the target passed); a mismatch is a
  desync, never silently reconciled; `input(seq, dx, dz, targetTick) = schedule`.
- Per NG-001, `horizon = latestSnapshotTick + D`, `D = max(2, ceil((RTT/2 + jitter)/33.333) + 2)`;
  `latestSnapshotTick` ticks +1 per local tick and is raised to each snapshot tick (never lowered).
  Intents carry `targetTick = horizon`; `advanceTo(horizon)` runs on every snapshot and after every send.
- Unacked intents older than one RTT are resent with their **original** `(seq, targetTick)`, at most one
  resend per RTT per intent. Resends do carry a non-increasing seq and are refused by the ingress gate
  (`non-monotonic-seq`, surfaced as reason `malformed`) — `rejectsReceived` is recorded in metrics.
- Correction distance = `hypot(|serverOwn.x − predictedOwn.x|, |serverOwn.z − predictedOwn.z|)` rounded
  to integer mm, predicted position sampled **before** reconcile adoption. Rubber-band max = maximum of
  those distances. Down/up bytes counted at `send()` call time (encoded payload bytes only; ws framing
  excluded). `tick_ms` wraps only `room.tick()` bodies via `performance.now()`.

## 2. Acceptance commands (clean run)

| command | log (in `20261118T202616Z-NETGATE-MATRIX-V5-RUN/`) | exit |
|---|---|---|
| `pnpm install --frozen-lockfile` | `20261118T202616Z-NETGATE-MATRIX-V5-RUN/00-install.log` | 0 |
| `pnpm vitest run apps/server/test/netgate/matrix-*` | `20261118T202616Z-NETGATE-MATRIX-V5-RUN/00-suite.log`, 19/19 | 0 |
| `pnpm typecheck` | `20261118T202616Z-NETGATE-MATRIX-V5-RUN/00-typecheck.log` | 0 |
| 24 cells, 15 s each | `01-cell-…` … `24-cell-…` (24 logs) | 24 × 0 |
| control, 60 s | `27-control-rtt50-loss0-jitter0-60s.log` | 0 |
| soak, 1800 s | `28-soak-rtt300-loss5-jitter30.log` | 0 |

## 3. The 24-cell v5 table (15 s each, 450 ticks nominal)

`desyncs` = sum over 4 clients; `corr p95` = pooled correction p95 across all reconciles (mm);
`rub max` = maximum rubber-band distance (mm); `down/up` = mean encoded bytes/s per client;
`tick p95` = p95 of `room.tick()` bodies (ms). Every cell: 4 clients connected, tick advanced, `EXIT=0`.

| RTT (ms) | loss (%) | jitter (ms) | D | ticks | desyncs | ok | corr p95 (mm) | rub max (mm) | down B/s/cli | up B/s/cli | tick p95 (ms) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 0 | 2 | 447 | **0** | 1788 | 141 | 212 | 3407 | 444 | 0.250 |
| 0 | 0 | 30 | 3 | 450 | 1596 | 204 | 141 | 250 | 3453 | 488 | 0.242 |
| 0 | 2 | 0 | 2 | 447 | 1496 | 248 | 112 | 224 | 3404 | 443 | 0.265 |
| 0 | 2 | 30 | 3 | 449 | 1517 | 233 | 141 | 250 | 3447 | 491 | 0.221 |
| 0 | 5 | 0 | 2 | 448 | 1549 | 133 | 141 | 224 | 3417 | 446 | 0.248 |
| 0 | 5 | 30 | 3 | 448 | 1518 | 156 | 141 | 250 | 3417 | 466 | 0.266 |
| 50 | 0 | 0 | 3 | 445 | 404 | 1372 | 158 | 212 | 3392 | 442 | 0.232 |
| 50 | 0 | 30 | 4 | 448 | 1651 | 134 | 141 | 250 | 3431 | 468 | 0.247 |
| 50 | 2 | 0 | 3 | 448 | 1513 | 231 | 141 | 212 | 3423 | 447 | 0.213 |
| 50 | 2 | 30 | 4 | 449 | 1613 | 133 | 141 | 250 | 3436 | 465 | 0.230 |
| 50 | 5 | 0 | 3 | 447 | 1549 | 125 | 141 | 255 | 3414 | 446 | 0.221 |
| 50 | 5 | 30 | 4 | 450 | 1542 | 140 | 150 | 255 | 3449 | 466 | 0.203 |
| 150 | 0 | 0 | 5 | 450 | **0** | 1792 | 255 | 364 | 3442 | 449 | 0.204 |
| 150 | 0 | 30 | 6 | 447 | 1250 | 526 | 206 | 381 | 3419 | 445 | 0.197 |
| 150 | 2 | 0 | 5 | 446 | 1496 | 237 | 141 | 269 | 3412 | 444 | 0.220 |
| 150 | 2 | 30 | 6 | 445 | 1480 | 245 | 156 | 361 | 3398 | 443 | 0.223 |
| 150 | 5 | 0 | 5 | 414 | 1427 | 126 | 141 | 250 | 3160 | 412 | 0.271 |
| 150 | 5 | 30 | 6 | 445 | 1524 | 136 | 141 | 320 | 3396 | 442 | 0.278 |
| 300 | 0 | 0 | 7 | 442 | **0** | 1752 | **320** | 430 | 3371 | 439 | 0.235 |
| 300 | 0 | 30 | 8 | 445 | 1321 | 439 | 224 | 430 | 3400 | 444 | 0.278 |
| 300 | 2 | 0 | 7 | 430 | 1422 | 240 | 150 | 381 | 3264 | 425 | 0.231 |
| 300 | 2 | 30 | 8 | 448 | 1523 | 205 | 158 | 430 | 3427 | 446 | 0.212 |
| 300 | 5 | 0 | 7 | 444 | 1515 | 133 | 141 | 381 | 3370 | 439 | 0.264 |
| 300 | 5 | 30 | 8 | 449 | 1525 | 140 | 150 | 412 | 3428 | 447 | 0.234 |

`unknownReconciles = 0` and `scheduleRefusals = 0` in all 24 cells: every snapshot was compared at a
recorded tick and every intent was accepted by the predictor. Resends fired only in RTT 0/50 cells where
`rttTicks < D` (e.g. 159 at RTT 0 / jitter 30, 179 at RTT 0 / loss 2 / jitter 30); they are refused at the
gate as non-monotonic. Resends are structurally impossible at RTT ≥ 150 (`rttTicks >= D`), so the
specified `(seq, targetTick)` resend rule does not recover lost intents in those cells — recorded, not fixed.

## 4. Control cell — 50 ms, 0 % loss, 0 jitter, 60 s

| metric | value |
|---|---|
| run_id | `v5b-27-control-60s`, `EXIT=0` |
| authoritative ticks | 1766 (60.0 s at 30 Hz) |
| reconciles | 7060 (ok 268, **desync 6792**, unknown 0) |
| desync ratio | 96.2 % of reconciles |
| correction p95 | 141 mm |
| rubber-band max | 212 mm |
| down / up bytes per client per second | 3379 / 441 B/s |
| tick p50 / p95 / p99 / max | 0.091 / 0.199 / 0.705 / 3.800 ms |

The 15 s cell at the same coordinates had 404 desyncs; the longer control shows the RTT-50 misalignment
is persistent, not a startup transient. Zero-desync is **not** achieved at RTT 50 even with no loss/jitter.

## 5. 30-minute soak — RTT 300 ms, 5 % loss, 30 ms jitter

| metric | value |
|---|---|
| run_id | `v5b-28-soak-1800s`, `EXIT=0` (log `Duration 1802.19s`) |
| started → ended (UTC) | 2026-11-18T20:34:22.720Z → 21:04:22.835Z (actualDurationS 1800.1148) |
| authoritative ticks | **54 027** |
| snapshots received | 205 195 (down frames dropped by emulation: 10 907) |
| intents sent | 216 104 (up frames dropped: 10 737; resends fired: 0 — `rttTicks=9 >= D=8`) |
| reconciles | ok 10 030, **desync 195 165**, unknown 0 → **95.1 % desync ratio** |
| correction p95 | **141 mm** (< 300 mm) |
| rubber-band max | **430 mm** (< 2000 mm) |
| down / up bytes per client per second | 3451.7 / 450.2 B/s (aggregate 13 806.7 / 1800.8 B/s) |
| tick p50 / p95 / p99 / max | 0.056 / 0.095 / 0.141 / 7.802 ms |
| 4 clients connected / tick advanced | true / true |

The soak completed in full, but **zero hash mismatches did not happen**: 195 165 desyncs were measured
with the exact commit and seed recorded. No rubber-band exceeded 2 m and no correction p95 exceeded
0.3 m in the soak.

## 6. Server tick-time distribution (all 26 runs)

| run set | p50 min–max (ms) | p95 min–max (ms) | p99 min–max (ms) | max of per-run maxima (ms) |
|---|---|---|---|---|
| 24 cells (15 s) | 0.120–0.175 | 0.197–0.278 | 0.353–2.318 | 12.102 (RTT 50 / 2 % / jitter 30) |
| control (60 s) | 0.091 | 0.199 | 0.705 | 3.800 |
| soak (1800 s) | 0.056 | 0.095 | 0.141 | 7.802 |

Worst cell p95 = 0.278 ms; GDD-NETCODE budget p95 ≤ 25 ms. Worst single sample = 12.102 ms, still below
25 ms. Tick times are real `performance.now()` samples around `room.tick()` at the 30 Hz cadence.

## 7. Verdicts for the four unmeasured NET-GATE criteria

| criterion | verdict | exact numbers / reason |
|---|---|---|
| **four-client-matrix** | **MET as executed measurement; zero-desync sub-goal NOT MET** | 24/24 cells with 4 real `ws` clients, seed 20261118, `EXIT=0` (`20261118T202616Z-NETGATE-MATRIX-V5-RUN/`); 3/24 cells had zero desyncs, 21/24 had non-zero desyncs (404–1651 per 15 s cell). The matrix exists and is measured; the "zero desync hash mismatch" quality bar is not met outside three lossless/jitterless cells. |
| **desync-correction** | **PARTIALLY MET — numeric thresholds met, desync count fails** | correction p95 ≤ 320 mm across all cells (limit 300 mm → **exceeded in 1/24 cells**: RTT 300 / 0 % / 0 jitter, 320 mm); soak 141 mm. Rubber-band max ≤ 430 mm everywhere (limit 2000 mm). Desync counts are non-zero in 21/24 cells + control + soak. |
| **server-tick-p95** | **MET** | worst cell p95 0.278 ms, control 0.199 ms, soak 0.095 ms — all ≤ 25 ms; worst single tick sample 12.102 ms. |
| **soak-30min** | **MET as executed measurement; zero-desync success criterion NOT MET** | full 1800.1148 s / 54 027 ticks, `EXIT=0`; 195 165 desyncs over 205 195 snapshots (95.1 %), correction p95 141 mm, rubber-band max 430 mm, tick p95 0.095 ms. |

No gate claim is made: `NET_GATE.md` and `scripts/validate-netgate.mjs` remain parent-owned and
unchanged; `--assert-ready` has not been re-run by this agent.

## 8. Honest findings (what the numbers actually say)

1. The v5 target-tick contract does achieve exact hash agreement in quiet, lossless, jitterless cells:
   RTT 0, RTT 150 and RTT 300 cells at loss 0 / jitter 0 each recorded **0 desyncs** and 1752–1792 ok
   reconciles. Zero desync is real but confined to those three points.
2. RTT 50 / 0 % / 0 jitter is anomalous: 404 desyncs in 15 s and 6792 in 60 s with 1372 / 268 ok
   reconciles. The D=3 lead at RTT 50 does not reliably cover the tick boundary; the longer run proves it
   is not a transient. This is a measured defect of the current client/server tick coupling, reported as-is.
3. Any jitter (30 ms) or packet loss (2 %/5 %) produces near-total desync: 1250–1651 desyncs per 15 s
   cell and 195 165 in the soak. A lost or late-intent event leaves the predicted world ahead of the
   server's; the next snapshot resets the world, but the hash at that tick was already recorded from the
   divergent prediction, so the verdict is desync. The predictor never silently reconciles (I1/GDD §4.3).
4. Resend coverage is structurally incomplete under the handed-down formula: at RTT ≥ 150 the
   one-RTT age threshold is ≥ D, so the targetTick window closes before an intent becomes resend-eligible
   (`resendsSent = 0` in all RTT ≥ 150 cells and in the soak). Where resends did fire at RTT 0/50, they
   are refused by the ingress gate's non-monotonic-seq rule. Neither the gate nor the protocol was
   modified (parent-owned); recommend a follow-up on retransmission identity in the target-tick branch.
5. Rubber-band stays physically small (max 430 mm < 2 m) and soak correction p95 is 141 mm < 300 mm:
   the *size* of corrections is within the gate's thresholds; the *count* of corrections is not.
6. Wire figures here are for a 4-entity room (~3.4 KB/s down, ~0.45 KB/s up per client) and are
   **not** the 64-AoI-entity budget test. They neither prove nor disprove NET-101's dense bound.
7. v4-broken baseline (~7000 desyncs per cell at RTT ≥ 50), the discarded parent run and matrix's
   aborted duplicate are all excluded from these verdicts; their files and metrics objects remain intact.
8. The soak's 54 027 ticks at 30 Hz over 1800.11 s (30.015 Hz effective) confirm the authoritative tick
   cadence under 4-client load; no tick advanced without all 4 clients connected.

## 9. Out of scope / not done

- No AoI/delta or protocol change; no `apps/game`, `apps/server/src`, `packages/**` edits.
- No reconnect/RPO work (persist worktree owns it); no resync or hashack frames sent.
- No gate/dossier edit, no validator change, no push to `netgate-core`, no secrets, no art.
- Parent integration still owes `NET_GATE.md`, journal/metrics regeneration and `--assert-ready`; this
  report does not assert a READY gate.
