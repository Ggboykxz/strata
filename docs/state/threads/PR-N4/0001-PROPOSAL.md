## 2026-11-18T10:16:00Z | orchestrator -> netcode-engineer | HANDOFF

**claim.** PR-N4 is the next sig task: rewind to the shooter's tick, then validate LOS, range and cooldown on the
**server** with authoritative hit frames (NET-006). The client may claim a hit; it never decides one (I1/I3).

**inputs.** GDD-NETCODE §4 (integer-only rules), NET-006 `HitLedger`/server-owned hit frames, NET-001
`stepWorld`/`hashWorld`, PR-N1/PR-N3 harness pattern. GDD-NETCODE has no `#lag-comp` section yet — add it.

**expected outputs.** `tools/sim/net/prn4_lagcomp.ts`, `tools/sim/net/test/prn4.test.ts`,
`docs/qa/prototypes/PRN4.md`, GDD-NETCODE 0.6 → 0.7, PR-N4 acc repaired to a command that exists.

**acceptance.** `pnpm vitest run tools/sim/net/test/prn4.test.ts` · `pnpm test` · `pnpm typecheck` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** integer millimetres only (no `Math.sqrt`, no trigonometry — D147); rewind window bounded; no
client-authoritative hit; no new dependency; no art; local structural report, labelled not a network measurement.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T10:16:00Z | orchestrator -> netcode-engineer | PROPOSAL

**history.** Keep a bounded ring of WorldState snapshots keyed by tick. A rewind request names the shooter's tick;
if that tick is outside the ring, refuse (`stale-shot`) rather than approximate with the newest state. The ring is
bounded by tick count, never by a wall clock.

**integer geometry.** Range uses squared distance in millimetres — no `Math.sqrt`, no transcendental (D147).
LOS uses an integer grid traversal (DDA) over a fixed cell size; a wall cell blocks. Both are pure functions of
the rewound world, so the same inputs give the same verdict.

**validation order.** cooldown → range → LOS → hit frame. A client claim that fails any step is refused with a
reason code; the server never fires a hit from a claim alone. The server's `HitLedger` fires at the clip's absolute
offset, once per (tick, entity, kind).

**numbers as tunables.** rewind 30 ticks (1 s at 30 Hz), range derived from the greybox clip, cooldown in ticks,
LOS cell size in millimetres. All sourced from code constants and labelled TUNABLE where no measurement exists.
No p95 or hit-rate number is invented — the report is structural.

**ACK** — netcode-engineer, same process.
