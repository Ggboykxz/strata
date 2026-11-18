# NET-GATE wire measurement — AoI + delta prototype

| field | value |
|---|---|
| task | GATE:NET — measurement prototype authorized by the Director |
| date | 2026-11-18 |
| status | **measurement complete; wire-budget criterion NOT met in the all-moving bound** |
| evidence | `docs/state/evidence/20261118T200133Z-NETGATE-WIRE/` |
| codec | `packages/protocol/src/delta.ts` (new measurement module) |
| harness | `tools/netgate/wire/netgate_wire.ts` |
| tests | `packages/protocol/test/delta.test.ts`, `tools/netgate/wire/test/wire.test.ts` |

**Prototype only: not wired into the server; NET-101 owns production AoI/delta.**

This document does **not** claim that the NET-GATE wire-budget criterion is met. The measurement is a
lower/upper-bound study of AoI + delta, not a four-client network matrix and not a production wire change.

## 1. Method

The harness builds `createWorld(1337, 64)` — the exact world PR-N1 measured — then steps it 600 times at
30 Hz with integer intents. Four clients own entities 1..4. The control uses the existing binary codec:
`snapshotFromWorld` + `encodeFrame` of the full 64-entity world every tick, no AoI, no delta. That is the
same **1 551 B** frame and **46 530 B/s** figure PR-N1 recorded, so the two measurements are comparable.

Two deterministic activity scripts bracket the traffic:

| scenario | movement script | meaning |
|---|---|---|
| `dense` | all 64 entities receive the PR-N1 intent every tick | upper bound; directly comparable to PR-N1 |
| `four-client` | only client entities 1..4 move; the other 60 are idle | lower bound; the 4-client NET-GATE shape without NPC activity |

The treatment codec is implemented in `packages/protocol/src/delta.ts`, with its own measurement frame
type `0x20`; `binary.ts` and the production `FrameType` table are untouched.

| field | bytes | notes |
|---|---|
| delta header | 19 | type u8, version u8, flags u8, tick u32, baseTick u32, hash u32, changedCount u16, removedCount u16 |
| keyframe entity | 24 | id u32, x/z/vx/vz i32, seq u32 |
| relative delta entry | 10 | id u16, tag u8, dx/dz i16, vx/vz i8, seqDelta u8 |
| absolute delta entry | 23 | id u16, tag u8, x/z/vx/vz i32, seq u32 |
| removed id | 2 | id u16 |

AoI is the D90 **32 m = 32 000 mm** radius, squared distance compared in bigint and capped at 64 entities by
`(distance, id)`. A client's delta is computed against the **last acknowledged keyframe**, so it contains
every entity whose state differs from that keyframe plus every id that left the AoI. A lost delta is
recovered by the next delta; a lost keyframe is retransmitted until acknowledged. Empty deltas are not sent.

Keyframe period: **60 ticks = 2 s**. This is 8× the 250 ms jitter ceiling in D149, so a client re-anchors well
inside the 4.27 s (128-tick) server hash window. At 50 mm/tick it bounds relative offsets to 3 000 mm, inside
i16, and per-entity seq advance to 60, inside u8; both keep the 10 B relative entry usable for the whole
period. Ten keyframes occur in 600 ticks.

Up-link accounting is the existing frame sizes: one 11 B intent per tick and one 13 B HashAck per received
frame (600 received frames per client in the lossless runs). The channel is in-process and lossless; keyframe
recovery is tested separately with deterministic drops.

## 2. Control — no AoI, no delta

| metric | value |
|---|---|
| full snapshot frame | **1 551 B** = 15 B header + 64 × 24 B |
| down per client | **46 530 B/s** = 1 551 × 30 |
| up per client | **720 B/s** = (11 + 13) × 30 |
| budget | 12 288 B/s down, 3 072 B/s up |
| down over budget | **3.79×** |

## 3. Treatment — dense, all 64 entities moving

Per client over 600 ticks (20 s):

| client | down bytes | down B/s | max frame | keyframes | deltas |
|---|---:|---:|---:|---:|---:|
| 1 | 257 000 | 12 850.0 | 979 | 10 | 590 |
| 2 | 227 220 | 11 361.0 | 859 | 10 | 590 |
| 3 | 373 122 | 18 656.1 | 1 435 | 10 | 590 |
| 4 | 327 164 | 16 358.2 | 1 267 | 10 | 590 |

| down summary | B/s | vs 12 288 B/s |
|---|---:|---:|
| best client | **11 361.0** | under (0.925×) |
| average client | **14 806.325** | **over (1.205×)** |
| worst client | **18 656.1** | **over (1.518×)** |

Improvement against the 46 530 B/s control: **75.5835 % best, 68.179 % average, 59.9052 % worst**.
Up-link is **720 B/s** per client in every case, under the 3 072 B/s budget. Every frame hash matched the
server AoI hash after apply (`desyncs: 0`, `allFinalHashesMatch: true`).

**Down ≤ 12 288 B/s? No for the average and worst client in the all-moving bound; yes only for the best
client.** The dense bound is the apples-to-apples comparison with PR-N1's 64-moving-entity world, and it
still misses.

## 4. Treatment — four-client lower bound

Only entities 1..4 move; the other 60 are idle.

| client | down bytes | down B/s | max frame | keyframes | deltas |
|---|---:|---:|---:|---:|---:|
| 1 | 40 820 | 2 041.0 | 979 | 10 | 590 |
| 2 | 50 166 | 2 508.3 | 1 123 | 10 | 590 |
| 3 | 48 072 | 2 403.6 | 1 411 | 10 | 590 |
| 4 | 48 737 | 2 436.85 | 1 267 | 10 | 590 |

| down summary | B/s | vs 12 288 B/s |
|---|---:|---:|
| best client | **2 041.0** | under (0.166×) |
| average client | **2 347.4375** | under (0.191×) |
| worst client | **2 508.3** | under (0.204×) |

Improvement: **95.6136 % best, 94.955 % average, 94.6093 % worst**. Up-link is **720 B/s** per client.
All frame hashes matched.

**Down ≤ 12 288 B/s? Yes in this lower bound.** This is not a gate pass: the 60 NPCs are idle, so it does
not represent a populated 64-entity AoI under real activity.

## 5. Verdict

| question | answer |
|---|---|
| down ≤ 12 288 B/s at 64 entities? | **Dense all-moving: no** — average 14 806.325 B/s (1.205×) and worst 18 656.1 B/s (1.518×); best client 11 361.0 B/s passes. Four-client idle-NPC lower bound: yes, 2 041.0–2 508.3 B/s. |
| up ≤ 3 072 B/s at 64 entities? | **Yes** — 720 B/s per client in every measured case (0.234× the budget). |
| NET-GATE wire-budget criterion met? | **No claim.** The dense bound misses and the lower bound is not a four-client network matrix. |
| improvement measured, not asserted? | **Yes** — same world, same 600 ticks, same 30 Hz, control and treatment both logged. |

The remaining gap is not keyframe frequency. A 19 B header plus 39 ten-byte relative entries is 409 B/tick,
essentially the whole 409.6 B/tick budget; in the dense bound the average client already carries more than
that and the worst client is well over. **Bitpacking and/or tighter quantisation is required**, which is
exactly NET-101's production scope.

## 6. Design gaps

1. **No real four-client network matrix.** No sockets, RTT, jitter or packet loss. Keyframe recovery is
   proven only against deterministic in-process drops.
2. **No 30-minute soak.** 600 ticks = 20 s of deterministic bytes, not a soak.
3. **Activity is bracketed, not sampled.** `dense` (all 64 move) and `four-client` (60 idle) are bounds, not
   a population model. A realistic NPC mix is not measured.
4. **Prototype framing is not production framing.** Kind `0x20` is outside `binary.ts`; there is no hello
   version negotiation, no anim/resync interaction and no server integration.
5. **Delta ids are u16.** Entity ids 1..64 fit; a production world with ids above 65 535 needs a different
   mapping or a keyframe fallback.
6. **Keyframe is 19 + 24n bytes**, 4 B larger than the existing 1 551 B full snapshot at 64 entities. It is a
   measurement format, not a proposed production frame.
7. **No CPU cost is measured.** Only framed bytes are reported.

## 7. Acceptance evidence

All commands ran from `/tmp/strata-wire`; each log ends with its `EXIT=` line.

| # | command | exit | log |
|---|---|---|---|
| 01 | `corepack enable` | 0 | `01-corepack-enable.log` |
| 02 | `corepack prepare pnpm@12.21.0 --activate` | 0 | `02-corepack-prepare.log` |
| 03 | `pnpm install --frozen-lockfile` | 0 | `03-pnpm-install.log` |
| 04 | `pnpm vitest run packages/protocol/test/delta.test.ts tools/netgate/wire/test/wire.test.ts` | 0 (28/28) | `04-acceptance-tests.log` |
| 05 | `pnpm typecheck` | 0 | `05-typecheck.log` |
| 06 | `pnpm vitest run tools/netgate/wire/test/wire.test.ts --reporter=verbose` | 0 | `06-measurement-report.log` (JSON report) |
| 07 | `pnpm exec tsc --ignoreConfig --noEmit --strict ... tools/netgate/wire/**` | 0 | `07-tool-typecheck.log` |

`pnpm typecheck` covers the protocol module and its tests through the root project references. The
`tools/netgate/wire` harness is outside the referenced projects, so command 07 type-checks it explicitly.
