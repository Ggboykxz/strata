# NET-GATE wire plan — NET-101 (measured inputs, projected outputs)

| field | value |
|---|---|
| task | NET-101 — NET-GATE-scoped part only (A0011) |
| status | **PLAN — projections, not measurements** |
| owner | netcode-engineer |
| date | 2026-11-18 |
| authority | A0011 (Director-pre-authorized plan, blanket instruction 2026-11-18); A0006/A0007/A0009; A0010 |
| evidence vehicle | `tools/netgate/wire/` on the unmerged AoI+delta prototype branch (`/tmp/strata-wire`, read-only, 2026-11-18); not merged, not edited here |

This plan exists because the NET-GATE wire-budget criterion is failing and its owner (NET-101) sits
behind a circular dependency. A0011 authorizes the NET-GATE-scoped implementation to land before
GATE:P4 solely for this criterion. **Every projected number below is a PROJECTION.** When the wire
prototype merges, its measured numbers replace the projection columns, this file is updated, and only
then may the NET-GATE dossier row be revisited — by its owner, with a Director-merged PR.

## 1. Measured inputs (sources cited; nothing invented)

| # | input | value | source |
|---|---|---|---|
| 1 | full v4 snapshot frame @ 64 AoI entities | **1 555 B** = 19 B header + 64 × 24 B | A0010 (`docs/adr/A0010_client-scoped-prediction-hash.md`, §Decision); `docs/design/gdd/GDD-NETCODE.md` §7, §15 |
| 2 | full-snapshot rate @ 30 Hz | **46 650 B/s = 3.80× the down budget** | A0010 (same sections) |
| 3 | down budget (12 KB/s) | **12 288 B/s** = 12 × 1 024 | GDD-NETCODE §5 ("master §6 budgets"), D108; `tools/netgate/wire/netgate_wire.ts` `DOWN_BUDGET_BYTES_PER_SECOND` |
| 4 | up budget (3 KB/s) | **3 072 B/s** = 3 × 1 024 | GDD-NETCODE §5 (master §6); prototype `UP_BUDGET_BYTES_PER_SECOND` |
| 5 | AoI cap | **≤ 64 entities per snapshot**; radius **32 m = 32 000 mm** | D90 ("AoI 32 m, <= 64 entities"); GDD-NETCODE §5, §8(7); D147 integer-only |
| 6 | tick rate / quantization | 30 Hz; 1 mm integer coords, int32 wire bound ±2 147 483.647 m | `packages/core/src/index.ts` TICK_HZ; `packages/core/src/tick.ts` QUANT_MM |
| 7 | pre-A0010 measured record | 46 530 B/s = 3.79× (1 551 B × 30 Hz) | `docs/qa/prototypes/PRN1.md`; `docs/state/metrics/2026-11-18-s02.json`; `NET_GATE.md` wire-budget row; `scripts/validate-netgate.mjs` hard-codes `3.79` |
| 8 | frame constants (prototype, unmerged — provisional until merge) | delta header **19 B**; keyframe entity **24 B**; relative entry **10 B**; absolute entry **23 B**; removed id **2 B**; AoI-view hash = FNV-1a u32 | `packages/protocol/src/delta.ts` on the prototype branch (`DELTA_HEADER_BYTES`, `KEYFRAME_ENTITY_BYTES`, `RELATIVE_ENTRY_BYTES`, `ABSOLUTE_ENTRY_BYTES`, `REMOVED_ID_BYTES`) |
| 9 | client → server frames | intent **11 B**; hash ack **13 B**; control up-rate = (11 + 13) × 30 = **720 B/s** | GDD-NETCODE §5 ("v2 frame bytes: intent 11, hash ack 13"); prototype `measureControl` up-rate arithmetic (not a sampled measurement) |
| 10 | AoI selection cost model | O(n) squared-distance filter, bigint mm², cap by (distance, id) | prototype `selectAoi`; D147 (no floats, no sqrt) |
| 11 | keyframe interval default | **2 s = 60 ticks** at 30 Hz (`KEYFRAME_INTERVAL_TICKS = 60`, `MEASURE_TICKS = 600`) | prototype constants |
| 12 | empty-delta behavior (prototype) | a tick with 0 changed entities and 0 removed ids sends **no frame**; byte cost 0 | prototype `runClientStream` (`emptyDeltas` path) |
| 13 | maxima checked | 64 entities enforced at encode and decode | GDD-NETCODE §8(7); prototype `MAX_ENTITIES` from `binary.ts` |

Note on staleness (recorded, not fixed here): inputs 1–2 (A0010) supersede input 7. `NET_GATE.md`,
`scripts/validate-netgate.mjs` and `docs/state/metrics/2026-11-18-s02.json` still carry 46 530 B/s /
3.79×; this plan does not edit them. The wire prototype was branched before A0010 (its control
asserts 1 551 B / 46 530 B/s); on merge, the control re-bases to **1 555 B / 46 650 B/s** and every
figure derived from the control shifts accordingly.

## 2. Mechanism design (NET-GATE-scoped implementation)

1. **Grid cell = entity cell.** Uniform spatial hash over quantized integer (x, z) in millimetres.
   Cell edge = **32 000 mm** (one D90 radius, so the viewer's cell plus its 8 neighbours always covers
   the radius). Every entity belongs to exactly one cell — its *entity cell* — and each cell maps to
   the set of ids it holds. The AoI query reads the viewer's cell + 8 neighbours, then applies the
   exact filter: squared distance in `bigint` mm² ≤ `32 000²`, tie at the radius included, capped at
   **64 entities** by (distance, id), output sorted by id. No floats, no sqrt, no transcendentals
   (D147). At 64 entities the O(n) selection the prototype uses is byte-equivalent to the grid; the
   grid is the P4N-scale broad phase and may land behind a flag or in part (ii) if (i) does not need
   it. The budget is decided by bytes on the wire, not by the selection algorithm.
2. **Radius in integer mm** — 32 000 mm everywhere; never metres, never floats.
3. **Delta vs last acked snapshot.** Deltas are computed against the **last acknowledged keyframe**
   (`baseTick`), never against the previous tick: a lost delta self-heals at the next delta. A keyframe
   is retransmitted while unacknowledged (ack delay 1 tick in the prototype). Deltas are
   per-entity **relative** entries (id u16, dx/dz i16, vx/vz i8, seqDelta u8 = 10 B) when the deltas fit,
   else **absolute** entries (23 B). Contains both for new-to-AoI entities.
4. **Removed-ids set.** Ids present in the acknowledged baseline but absent from the current AoI view
   are sent as a sorted removed list, 2 B per id. This is the only departure signal; without it a
   departed entity would linger in every client's baseline forever.
5. **30 Hz keyframe every N seconds.** Keyframe at tick 1, every **N s = 30·N ticks** thereafter, and on
   any forced resync. Prototype default **N = 2 s (60 ticks)**; projections below cover
   N ∈ {1 s, 2 s, 5 s, 10 s} = {30, 60, 150, 300 ticks}. Between keyframes, in-AoI entities are delta frames;
   empty ticks send nothing.
6. **Hashing and resync.** Each frame carries the FNV-1a hash of the AoI view (u32). The client compares
   at the tick the frame names, never at "now". Mismatch → desync → resync request → the server chooses
   the snapshot (I1). AoI-view hashing means a remote entity outside the AoI can never false-positive an
   AoI client (the A0010 lesson, applied per-view).
7. **Bitpacking.** NET-101's title includes it. The prototype layout is *not* bitpacked (positions stay
   int mm). Bitpacking lands in (i) only if required to clear the criterion, and only as a sized,
   measured change; otherwise it stays in (ii) or a separate task. See §3, row 3.

## 3. Projected outputs (PROJECTIONS — not measurements)

All rows assume **64 entities, all inside the AoI** — the criterion's own worst case ("64 AoI entities",
D90). If fewer entities are in view, every term scales down linearly with the entity count.
Per-client figures. Formulas, for auditability:

- stationary down/s = (1/N) × 1 555
- all-moving down/s = (30 − 1/N) × (19 + 64 × 10) + (1/N) × 1 555 = (30 − 1/N) × 659 + (1/N) × 1 555
- dense-pattern down/s = (30 − 1/N) × (19 + 29.8667 × 10) + (1/N) × 1 555, where 29.8667 is the mean
  changed entities per tick of the PR-N1 dense script (x moves when (tick+id) ≡ 0 mod 3, z when ≡ 0 mod 5;
  expected fraction 7/15 of 64 ≈ 29.87) — an arithmetic expectation from the script, **not** a measured
  byte count
- up/s = 11 × 30 (intents) + 13 × (frames received per second): stationary = 330 + 13/N;
  dense and all-moving = 330 + 390 = **720 B/s** (one frame per tick), keyframe or delta
- keyframe tick: a keyframe replaces the delta for that tick; it costs 1 555 B

| scenario | K interval | down B/s (projection) | up B/s (projection) | ≤ 12 288 down? | ≤ 3 072 up? |
|---|---|---|---|---|---|
| 64 stationary | 1 s (30 t) | 1 555.0 | 343.0 | yes | yes |
| 64 stationary | 2 s (60 t) | 777.5 | 336.5 | yes | yes |
| 64 stationary | 5 s (150 t) | 311.0 | 332.6 | yes | yes |
| 64 stationary | 10 s (300 t) | 155.5 | 331.3 | yes | yes |
| 64 moving (all change every tick) | 1 s (30 t) | 20 666.0 | 720.0 | **no** | yes |
| 64 moving (all change every tick) | 2 s (60 t) | 20 218.0 | 720.0 | **no** | yes |
| 64 moving (all change every tick) | 5 s (150 t) | 19 949.2 | 720.0 | **no** | yes |
| 64 moving (all change every tick) | 10 s (300 t) | 19 859.6 | 720.0 | **no** | yes |
| dense PR-N1 pattern (~29.87 changed/tick) | 1 s (30 t) | 10 767.3 | 720.0 | yes | yes |
| dense PR-N1 pattern (~29.87 changed/tick) | 2 s (60 t) | 10 148.7 | 720.0 | yes | yes |
| dense PR-N1 pattern (~29.87 changed/tick) | 5 s (150 t) | 9 777.5 | 720.0 | yes | yes |
| dense PR-N1 pattern (~29.87 changed/tick) | 10 s (300 t) | 9 653.7 | 720.0 | yes | yes |

Projection findings, stated plainly:

1. The **all-64-moving** upper bound exceeds 12 288 B/s at every keyframe interval. Delta compression
   against an acked baseline cannot fix it, because 64 relative entries + header ≈ 659 B per tick is
   already 19 770 B/s before keyframes.
2. **Bitpacking is not obviously sufficient either** (projection, not measured): at ~6 B per relative
   entry, all-moving down ≈ (30 − 1/N) × 403 + (1/N) × 1 555 → 13 242 / 12 666 / 12 320 / 12 205 B/s
   for N = 1/2/5/10 s — at or slightly above the budget everywhere. The 6 B entry size itself is an
   unmeasured design target. Meeting the budget at the absolute movement upper bound would require
   interest management beyond a hard 64-entity AoI (priority, dormancy, relevance) or a smaller AoI —
   decisions outside (i), to be put to the Director if the measurement demands them.
3. The budget is met, with margin, for **stationary** views (empty deltas suppressed) and for the
   **PR-N1 dense movement pattern** at all projected keyframe intervals (~9.7–10.8 KB/s).
4. Up-link is never the binding constraint in any projection (max 720 B/s vs 3 072 B/s).
5. The honest NET-GATE question is therefore the measured dense/four-client bracket the prototype
   already runs — not the all-moving bound. If the measured dense-bound worst client is > 12 288 B/s,
   the criterion stays failing (A0006/A0011); bitpacking and interval tuning become (i) work in that
   order.

**Replacement protocol.** When `tools/netgate/wire` merges, replace every PROJECTION cell in the table
with the prototype's measured output (`runWireMeasurement` report: per-client `downBytesPerSecond`,
`upBytesPerSecond`, `maxFrameBytes`, for the `dense` and `four-client` scenarios at the chosen keyframe
interval), re-base the control to 1 555 B / 46 650 B/s, and record the command and exit code next to the
table. Projections may never be quoted as measurements afterwards (I13).

## 4. Acceptance commands

```bash
# The wire prototype's own test suite — meaningful only after the prototype merges
# (today the path exists on the unmerged branch; on main this command must exit 0, never 0-with-skips)
pnpm vitest run tools/netgate/wire/test/wire.test.ts

# Dossier integrity — must exit 0; does NOT mean NET-GATE passed
node scripts/validate-netgate.mjs

# Gate readiness — MUST exit 1 until the wire-budget criterion is met on measured evidence
node scripts/validate-netgate.mjs --assert-ready
```

Expected today: command 1 is not runnable on main (path absent — fails closed, which is correct);
commands 2 and 3 behave as documented (`validate-netgate.mjs` prints PASS for honesty and exit 0;
`--assert-ready` prints the unmet criteria and exits **1**). The blueprint acceptance for NET-101,
`pnpm sim prn1 --tier S2 --assert`, is **not** part of this plan: it is part (ii) and stays behind
GATE:P4 (it is also not implemented in `package.json` at this commit — recorded, not fixed here).

## 5. Non-authorization

This plan does not authorize any art, any dependency, any production wiring, or any gate weakening.
