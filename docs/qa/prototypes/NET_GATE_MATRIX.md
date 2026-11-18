# NET-GATE matrix — 4-client real-socket harness (NETGATE-MATRIX)

| field | value |
|---|---|
| task | GATE:NET (NET-GATE re-measurement, matrix criterion) |
| date | 2026-11-18 |
| base | `340d67b` (protocol v4, per-client `viewHash`) → v5 rebase `baab942` (target-tick contract merged) → harness `49ded86` → v5 adaptation `3dc16b9` |
| harness | `apps/server/test/netgate/matrix-{emulator,predictor,harness,cell.test,emulator.test}.ts` |
| environment | Node 22.23.4, pnpm 12.21.0, Linux x86_64, loopback `127.0.0.1`, no external network |
| emulation | application-level (`setTimeout` delay queue per direction), NOT tc/netem; seeded LCG, seed **20261118**; world seed **1337** |
| collaboration | NG-001 contract (`docs/state/threads/NG-001/0001-COLLAB.md`, `0002-COLLAB-LOG.md`) |

## 0. What this is, and what it is not

- A real `ws` `WebSocketServer` on `127.0.0.1:0`, a `RoomHub` created with
  `{ capacity: 4, reconnectTicks: 90, seed: 1337 }`, bound through the production `attachRooms` path
  (MessageGate included, SEC-002). Four real `ws` clients connect with `?room=matrix&nonce=<n>`
  sequentially, which makes room entity assignment (join order 1..4) deterministic.
- Each client runs a **replicated** predictor (`matrix-predictor.ts`, `@strata/core` only — no dependency
  on `apps/game`, no protocol redesign, no AoI/delta). The client predicts only its own entity and
  reconciles on every snapshot.
- Emulation is per-frame with one-way = RTT/2, loss drawn before jitter, jitter uniform in
  `[0, jitter]`, all draws from the seeded LCG. Wall-clock `setTimeout` ordering is not OS-guaranteed,
  so loss/jitter *decisions* are reproducible per seed; sub-millisecond interleavings are not.
- **Protocol v5 (target-tick input contract)** is implemented in the replicated predictor exactly as
  merged on the branch (`a1e5961` / `b8d13c7`): `schedule(seq, dx, dz, targetTick)` validates a strictly
  future targetTick and seq monotonicity; `advanceTo(tick)` steps `stepWorld` with an empty command list
  on off-target ticks and applies commands whose `targetTick == world.tick+1` in canonical
  `(entity, seq)` order; `reconcile()` replays unacked intents at their original `targetTick`, clamped
  to the earliest available tick if the target passed (identical to `apps/game/src/net/predictor.ts`).
  `input(seq, dx, dz, targetTick)` = `schedule` only.
- Per NG-001, the harness pins each client's horizon: `horizon = latestSnapshotTick + D` with
  `D = max(2, ceil((RTT/2 + jitter)/TICK_MS) + 2)`; `latestSnapshotTick` ticks +1 per local tick and is
  raised to each snapshot's tick (never lowered). Intents are scheduled at `targetTick = horizon` and
  `advanceTo(horizon)` is called on every snapshot and after every send, so the predicted world's tick
  equals the horizon at all times.
- Unacked intents older than one RTT (`age > ceil(RTT/TICK_MS)` local ticks) are resent with their
  ORIGINAL `(seq, targetTick)` until acknowledged or `targetTick` has passed, at most one resend per
  RTT per intent. Resent intents carry a non-increasing seq and are refused by the ingress MessageGate
  (`non-monotonic-seq`); that is counted in `rejectsReceived`, never hidden. Note the specified D retires
  a target within D ticks, so at RTT >= ~134 ms one RTT >= D and the resend window is empty by
  construction.
- `needsResync` is counted but no resync frame is sent; `hashack` frames are not sent.
- Correction distance per reconcile = `hypot(|serverOwn.x − predictedOwn.x|, |serverOwn.z − predictedOwn.z|)`
  rounded to integer mm, predicted position sampled **before** reconcile adoption.
- Bytes are counted at `send()` call time: up at the client, down at the server-side socket.
  Encoded frame payload bytes only; ws framing overhead and TCP/IP overhead are excluded.
- `tick_ms` samples wrap only the `room.tick()` body, measured with `performance.now()`.
- The wire carries no room `clientId` to the client, so the own-entity id is assigned by join order and
  cross-checked against each snapshot's `viewHash` on every reconcile (`ownIdCheck`).

## 1. Run inventory and provenance (read this before the tables)

| run set | evidence dir | commit / source | status |
|---|---|---|---|
| v4 baseline (24 cells + control, pre-v5 fix) | `docs/state/evidence/20261118T200046Z-NETGATE-MATRIX/` | `5e3b03b` (harness, pre-rebase numbering `340d67b`-based) | **Broken-pipeline baseline — NOT gate evidence** (per NG-001/0002: the pre-fix predictor produced ~100% desyncs at RTT ≥ 50 ms; kept only for comparison) |
| v5 partial — matrix's own aborted duplicate | `docs/state/evidence/20261118T202148Z-NETGATE-MATRIX/` | `3dc16b9` working tree | **Partial/aborted** (see §2.3); logs 04–07 `EXIT=0`, 08 has metrics but no `EXIT=`; 09+ never ran; runs are CPU-contended |
| v5 full run — parent's concurrent driver | `docs/state/evidence/20261118T202001Z-NETGATE-MATRIX-V5/` | `/tmp/matrix-rerun.sh` @ 20:20, commit variable recorded `49ded86`; executed source = pre-`3dc16b9` v5 working tree (== `3dc16b9` content in `matrix-*`) | **See §2.2 — integration attribution** |
| Instrument of record for this report | — | `docs/state/metrics/20261118-netgate-matrix.json` (43 entries at the time of writing; JSON array; entries never rewritten) | v4 (25) + parent-driver v5 (13 at review time) + matrix aborted (5) |

A second v5 measurement driver (`/tmp/matrix-rerun.sh`, PID 31921) was discovered running in this same
worktree at 20:20–20:2x, appending to the same metrics file and consuming CPU. To avoid corrupting both
datasets, matrix's own duplicate run was stopped at 20:23 (see `0002-COLLAB-LOG.md`, 2026-11-18T20:25Z
COLLISION / STOP-POINT entry). Numbers below from that window (their cells 03–15, matrix's v5-04..08) are
marked contended.

## 2. What is measured

### 2.1 Acceptance commands (this worktree)

| command | log | exit |
|---|---|---|
| `pnpm install --frozen-lockfile` | `20261118T202148Z-NETGATE-MATRIX/01-install.log` | 0 |
| `pnpm vitest run apps/server/test/netgate/matrix-*` | `20261118T202148Z-NETGATE-MATRIX/03-vitest-matrix-star.log` | 0 (19/19) |
| `pnpm typecheck` | `20261118T202148Z-NETGATE-MATRIX/02-typecheck.log` | 0 |

(`20261118T200046Z-NETGATE-MATRIX/01..02/…` logs the v4-baseline acceptance.)

### 2.2 v5 results (parent's driver; populated from its evidence + this metrics file)

_Pending runner completion; entries and verdicts below are filled from
`docs/state/evidence/20261118T202001Z-NETGATE-MATRIX-V5/` and the metrics array. Early cells (03–15) ran
under CPU contention (20:20–20:23); cells 12+ ran uncontended._

### 2.3 v5 partial — matrix's own aborted duplicate (CPU-contended, not gate evidence)

| run_id | RTT | loss | jitter | desyncs | ok | corr p95 (mm) | rub. max (mm) | down B/s/cli | up B/s/cli | tick p95 (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| v5-04-cell-rtt0-loss0-jitter0 | 0 | 0 | 0 | 112 | 1624 | 112 | 212 | 3293 | 429 | 0.233 |
| v5-05-cell-rtt0-loss0-jitter30 | 0 | 0 | 30 | 1587 | 191 | 141 | 250 | 3415 | 480 | 0.261 |
| v5-06-cell-rtt0-loss2-jitter0 | 0 | 2 | 0 | 1467 | 246 | 112 | 224 | 3353 | 437 | 0.253 |
| v5-07-cell-rtt0-loss2-jitter30 | 0 | 2 | 30 | 1514 | 217 | 141 | 212 | 3413 | 484 | 0.320 |
| v5-08-cell-rtt0-loss5-jitter0 | 0 | 5 | 0 | 1484 | 178 | 141 | 224 | 3380 | 440 | 0.262 |

These cells were executed while a second runner was active; timer delays under contention push intents
past their target ticks (server drops them: targetTick ≤ arrivalTick), which diverges the predicted
world from the server's — each such drop is a permanent hash divergence in that prediction lineage and
surfaces as a desync at the next snapshot. They are recorded for honesty, not used for any verdict.

### 2.4 v4 broken baseline (comparison only — NOT gate evidence)

All 24 cells `EXIT=0`, tick p95 ≤ 0.32 ms, down ≈ 3.1–3.5 KB/s per client, up ≈ 0.30–0.33 KB/s per
client. Desyncs per 15 s cell: 642–1752 (RTT ≥ 50 ms: effectively every snapshot; RTT = 0: mixed
~50–60% ok verdicts). Correction p95 ≤ 141 mm; rubber-band max ≤ 255 mm. These numbers come from the
pre-v5 predictor and are retained only as a pre-v5 reference; they must not be cited as NET-GATE
results.

## 3. The 24 cells (v5) — 15 s each (450 ticks)

_To be filled from the integrated v5 run. Layout identical to §2.2._

## 4. Control cell — 50 ms, 0 % loss, 0 jitter, 60 s

_To be filled._

## 5. 30-minute soak — RTT 300 ms, loss 5 %, jitter 30 ms

_To be filled; mandatory for the four-client-matrix / soak criteria._

## 6. Honest findings (preliminary)

- The v5 target-tick contract, on a quiet run, delivers hash agreement at lossless cells (a smoke cell at
  RTT 50 ms / 0 % loss showed **0 desyncs / 352 ok reconciles in 3 s**, rubber-band max 212 mm, before
  the duplicate runner started). Under loss, or under CPU contention that pushes intents past their
  target ticks, desyncs appear and are recorded, never hidden.
- Desync recovery works: on a mismatch the predictor adopts the snapshot exactly and replay resumes from
  it; bounded loss showed rubber-band ≤ 255 mm even in the v4 baseline.
- Resends as mandated exist in the code but their window closes at D ticks; at RTT ≥ 134 ms
  `rttTicks >= D`, so resends do not fire (measured `resendsSent == 0` in the contended v5-04/06/08
  cells; resends 150–167 in jitter cells where they fired inside the window). Resent intents are
  refused at the gate (`non-monotonic-seq`); counted, not actionable by this harness (room/gate files are
  parent-owned).
- The 64-entity wire budget and AoI/delta are out of scope here (NET-101); this room is ~115 B per
  snapshot header + payload and is not the 12 KB/s fight.
- The four-client-matrix / soak-30min / desync-correction / server-tick-p95 criteria are **not claimed
  passed** by this report until §3–§5 are integrated and re-verified; the soak criterion in particular
  requires the 1800 s run to be recorded.

## 7. What was not done

- AoI/delta (NET-101) untouched; the wire criterion remains NET-101/parent business.
- No reconnect/RPO work here (the persist worktree owns it).
- No resync frames and no hashack frames are sent.
- No changes to protocol, room, gate, predictor in `apps/game`, or any validator.
- The parent's concurrent v5 run is not re-attributed as matrix's own work; matrix re-measures only if
  the parent designates matrix to re-run cleanly after the duplicate exits.

## 8. Exact commit and commands

Commits: v4 baseline `5e3b03b`; v5 rebase + harness `49ded86`; v5 target-tick adaptation `3dc16b9`
(acceptance EXIT=0: install, typecheck, `matrix-*` 19/19). Report and metrics commit: see branch
`session/20261118-netgate-matrix` tip (filled at push time).
