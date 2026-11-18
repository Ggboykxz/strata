# NET-GATE wire measurement — AoI + delta prototype

| field | value |
|---|---|
| task | GATE:NET — measurement prototype authorized by the Director |
| date | 2026-11-18 |
| status | **v2 measured: both local bounds under the down budget; NET-GATE criterion not claimed** |
| final evidence | `docs/state/evidence/20261118T203438Z-NETGATE-WIRE/` |
| codec | `packages/protocol/src/delta.ts` (new measurement module) |
| harness | `tools/netgate/wire/netgate_wire.ts` |
| tests | `packages/protocol/test/delta.test.ts`, `tools/netgate/wire/test/wire.test.ts` |

**Prototype only: not wired into the server; NET-101 owns production AoI/delta.**

This document does **not** claim that the NET-GATE wire-budget criterion is met. It reports framed bytes
from a deterministic local harness — no sockets, no RTT/loss/jitter matrix, no soak. The v1 figures are
kept below as the pre-bitpacking baseline; v2 supersedes their estimates with measurements.

## 1. Method

The harness builds `createWorld(1337, 64)` — the world PR-N1 measured — then steps it 600 times at 30 Hz
with integer intents. Four clients own entities 1..4. The control uses `snapshotFromWorld` +
`encodeFrame` of the full 64-entity world every tick, with no AoI and no delta.

Two deterministic activity scripts bracket the traffic:

| scenario | movement script | meaning |
|---|---|---|
| `dense` | all 64 entities receive the PR-N1 intent every tick | upper bound; directly comparable to PR-N1 |
| `four-client` | only client entities 1..4 move; the other 60 are idle | lower bound; the 4-client NET-GATE shape without NPC activity |

AoI is the D90 **32 m = 32 000 mm** radius, squared distance compared in bigint and capped at 64 entities by
`(distance, id)`. Empty deltas are suppressed. Keyframe period: **60 ticks = 2 s** — 8× the 250 ms jitter
ceiling in D149, inside the 4.27 s (128-tick) server hash window. Ten keyframes occur in 600 ticks.

The prototype was rebased onto the integration branch at `bb969b8`. That branch is protocol v5:
`INTENT_BYTES = 15` (target tick) and snapshot header 19 B. The v2 control is therefore **1 555 B** per
snapshot and **46 650 B/s** down; v1 was measured before that rebase at 1 551 B / 46 530 B/s. Up-link is
15 B intent + 13 B HashAck per tick (every received frame is acked) = **840 B/s** per client. The channel
is in-process and lossless; loss recovery is checked separately with deterministic drops.

## 2. Bitpacking v2 — measured, supersedes the v1 estimates

Version 2 changes only `packages/protocol/src/delta.ts`. `binary.ts`, production frame kinds, the server
and the game client are untouched.

| field | bytes | notes |
|---|---|---|
| delta header | 21 | type u8 (0x20), version u8 (2), flags u8, tick u32, baseTick u32, hash u32, packedCount u16, absoluteCount u16, removedCount u16 |
| keyframe entity | 24 | **unchanged payload**: id u32, x/z/vx/vz i32, seq u32 |
| packed delta entry | **6** | id u16, dx i8, dz i8, vpack u8, seqDelta u8 |
| absolute fallback entry | 22 | id u16, x/z/vx/vz i32, seq u32 |
| removed id | 2 | id u16 |

`vpack` is two 4-bit velocity steps: low nibble = vx, high nibble = vz. Codes are `0 = 0 mm/tick`,
`1 = +50 mm/tick`, `0xF = -50 mm/tick` — exactly the core walk domain. Any other nibble is refused at
decode (deterministic binary only, no guessing). A velocity outside `{-50, 0, +50}`, or a step outside
i8/u8, uses the 22 B absolute entry, which carries the exact i32 value. This makes the 6 B entry lossless:
packed entries decode back to the full integer velocity. An earlier v2 draft wrote 7 B into a 6 B slot and
failed with a DataView range error; that defect was found by the acceptance test and fixed with the nibble
layout above (evidence: `20261118T203045Z-NETGATE-WIRE/02-acceptance-tests.log`, EXIT=1).

Deltas are **chained**: `baseTick` is the last frame the client applied, not a shared keyframe anchor. A
lost frame breaks the chain; the next frame is a forced keyframe, and a lost keyframe is retransmitted until
acknowledged. `needs-keyframe` is returned rather than guessing. The hash of the reconstructed view is
compared with the frame hash on every apply; all 600 × 4 applies matched.

### 2.1 Control (v5 framing, no AoI/delta)

| metric | value |
|---|---|
| full snapshot frame | **1 555 B** = 19 B header + 64 × 24 B |
| down per client | **46 650 B/s** = 1 555 × 30 |
| up per client | **840 B/s** = (15 + 13) × 30 |
| budget | 12 288 B/s down, 3 072 B/s up |
| down over budget | **3.80×** |

### 2.2 Dense — all 64 entities moving

Per client over 600 ticks (20 s):

| client | down bytes | down B/s | max frame | keyframes | deltas |
|---|---:|---:|---:|---:|---:|
| 1 | 163 800 | 8 190.0 | 981 | 10 | 590 |
| 2 | 145 174 | 7 258.7 | 861 | 10 | 590 |
| 3 | 235 112 | 11 755.6 | 1 437 | 10 | 590 |
| 4 | 206 752 | 10 337.6 | 1 269 | 10 | 590 |

| down summary | B/s | vs 12 288 B/s |
|---|---:|---:|
| best client | **7 258.7** | under (0.591×) |
| average client | **9 385.475** | under (0.764×) |
| worst client | **11 755.6** | under (0.957×) |

Improvement against the 46 650 B/s control: **84.4401 % best, 79.8811 % average, 74.8004 % worst**.
Up-link is **840 B/s** per client (0.273× the 3 072 B/s budget). Hash checks: 0 desyncs,
`allFinalHashesMatch: true`.

**Does the dense average now pass 12 288 B/s? Yes — 9 385.475 B/s (0.764×).** The worst client also
passes at 11 755.6 B/s, but with only 532.4 B/s of headroom. This is a local framed-byte bound, not a
NET-GATE pass.

### 2.3 Four-client lower bound — 60 NPCs idle

| client | down bytes | down B/s | max frame | keyframes | deltas |
|---|---:|---:|---:|---:|---:|
| 1 | 32 540 | 1 627.0 | 981 | 10 | 590 |
| 2 | 33 416 | 1 670.8 | 1 125 | 10 | 590 |
| 3 | 39 028 | 1 951.4 | 1 413 | 10 | 590 |
| 4 | 38 894 | 1 944.7 | 1 269 | 10 | 590 |

| down summary | B/s | vs 12 288 B/s |
|---|---:|---:|
| best client | **1 627.0** | under (0.132×) |
| average client | **1 798.475** | under (0.146×) |
| worst client | **1 951.4** | under (0.159×) |

Improvement: **96.5123 % best, 96.1447 % average, 95.8169 % worst**. Up-link is **840 B/s** per client.
All frame hashes matched. This bound passes with room but omits NPC activity, so it is not gate evidence.

## 3. v1 pre-bitpacking baseline — SUPERSEDED, kept for honesty

Measured before bitpacking and before the v5 rebase, with 10 B relative entries, a 19 B v2 delta header
and 15 B intents. Control: 1 551 B / 46 530 B/s down, 720 B/s up.

| bound | best | average | worst | improvement (avg) | down budget |
|---|---:|---:|---:|---:|---|
| dense, all 64 moving | 11 361.0 | 14 806.325 | 18 656.1 | 68.179 % | average and worst **missed** (1.205× / 1.518×) |
| four-client, 60 idle | 2 041.0 | 2 347.4375 | 2 508.3 | 94.955 % | passed |

The v1 conclusion — "a 19 B header plus 39 ten-byte relative entries is essentially the whole 409.6 B/tick
budget; bitpacking is required" — is **superseded**: v2 packs the per-frame step into 6 B and both bounds
now pass locally. The 32 m radius was not varied; no 16 m sensitivity run was needed because 32 m cleared
the budget at both bounds, so no alternative radius is recommended here.

## 4. Verdict

| question | answer |
|---|---|
| dense average down ≤ 12 288 B/s? | **Yes in v2: 9 385.475 B/s (0.764×).** v1 missed at 14 806.325 B/s. |
| dense worst down ≤ 12 288 B/s? | **Yes, narrowly: 11 755.6 B/s (0.957×).** |
| four-client down ≤ 12 288 B/s? | **Yes: 1 627.0–1 951.4 B/s** (lower bound only). |
| up ≤ 3 072 B/s? | **Yes — 840 B/s per client in every case (0.273×).** |
| NET-GATE wire-budget criterion met? | **No claim.** This is a local deterministic framed-byte measurement; the four-client RTT/loss/jitter matrix, soak and server integration remain out of scope. |
| improvement measured, not asserted? | **Yes** — same world seed, 600 ticks, 30 Hz; control and treatment both logged. |

## 5. Design gaps

1. **No real four-client network matrix.** No sockets, RTT, jitter or sustained loss. Recovery is proven
   only against deterministic in-process drops; a chained delta needs a forced keyframe after any loss.
2. **No 30-minute soak.** 600 ticks = 20 s of deterministic bytes.
3. **Activity is bracketed, not sampled.** `dense` and `four-client` are bounds, not a population model;
   the dense worst client has only 532.4 B/s of down headroom.
4. **Prototype framing is not production framing.** Kind `0x20` is outside `binary.ts`; no handshake
   versioning, anim/resync interaction or server integration.
5. **Delta ids are u16.** Ids 1..64 fit; larger production ids need a different mapping or a keyframe.
6. **Velocity quantisation is domain-specific.** The 4-bit nibble encodes {-50, 0, +50} mm/tick; other
   speeds use the 22 B absolute fallback. A production codec must define its own quantisation contract.
7. **Keyframe is 21 + 24n bytes** (1 557 B at 64 entities) in v2, a measurement format only.
8. **No CPU cost is measured.** Only framed bytes are reported.

## 6. Acceptance evidence

All commands ran from `/tmp/strata-wire`; each log ends with its `EXIT=` line.

Final run — `docs/state/evidence/20261118T203438Z-NETGATE-WIRE/`:

| # | command | exit | log |
|---|---|---|---|
| 01 | `pnpm install --frozen-lockfile` | 0 | `01-pnpm-install.log` |
| 02 | `pnpm vitest run packages/protocol/test/delta.test.ts tools/netgate/wire/test/wire.test.ts` | 0 (30/30) | `02-acceptance-tests.log` |
| 03 | `pnpm typecheck` | 0 | `03-typecheck.log` |
| 04 | `pnpm vitest run tools/netgate/wire/test/wire.test.ts --reporter=verbose` | 0 | `04-measurement-report.log` (JSON report) |
| 05 | `pnpm exec tsc --ignoreConfig --noEmit --strict ... tools/netgate/wire/**` | 0 | `05-tool-typecheck.log` |

Earlier runs, retained for honesty:
- `docs/state/evidence/20261118T203045Z-NETGATE-WIRE/`: first v2 attempt, install 0 / tests **1** / typecheck 0;
  exposed the 7 B-into-6 B packing defect.
- `docs/state/evidence/20261118T200133Z-NETGATE-WIRE/`: the v1 pre-bitpacking measurement and acceptance.

`pnpm typecheck` covers the protocol module and its tests through the root project references. The
`tools/netgate/wire` harness is outside those references, so command 05 type-checks it explicitly.
