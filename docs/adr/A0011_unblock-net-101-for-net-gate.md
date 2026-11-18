# A0011 — Unblock NET-101 for the NET-GATE wire budget (scope split, not gate progress)

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18, as a Director-pre-authorized plan; NOT a passed gate** |
| accepted_by | Director, blanket instruction (2026-11-18, transcribed verbatim in §Authority) |
| date | 2026-11-18 |
| task | NET-101 (NET-GATE-scoped part only) |
| parties | NET-101 (P4N band) vs the NET-GATE wire-budget criterion |
| supersedes | nothing — narrows NET-101's landing order; suspends no invariant, weakens no validator, passes no gate |

## Context — the circular dependency (verbatim)

The spawning brief states it verbatim:

> NET-101 sits in P4N and depends on GATE:P4, which depends on GATE:P3, which requires art, which is
> blocked by NET-GATE readiness (I2).

Blueprint evidence, `docs/blueprint/BLUEPRINT.yaml` (line anchors at commit `340d67b`):

- NET-101: `ph: P4N, tier: S2, t: "AoI grid + delta snapshots + bitpacking + wire budget at 64 entities",
  deps: [GATE:P4], out: [apps/server/src/aoi/, packages/protocol/src/codec.ts]` (line 99).
- `GATE:P4: {human: true, ..., grants_tier: S2, ..., requires: [P4-ENTRY]}` (line 28).
- `P4-ENTRY` ... `deps: [GATE:P3]` (line 98).
- `GATE:P3: {human: true, cis_min: 80, gdd_coverage: 1.0, playtesters: 5,
  requires: [AI-001, AI-002, WG-001, AN-001, AN-002, P3-001..P3-006, HC-004, GDD-006]}` (line 27) —
  `P3-001..P3-006` are all `art: true` (lines 89–94).
- I2 (`docs/CONSTITUTION.md` §0.3): "No hero 3D asset, texture bake, motion generation or scene
  generation before NET-GATE passes."
- `docs/qa/prototypes/NET_GATE.md` §2, wire-budget row: **failing**, 46 530 B/s = 3.79× the
  12 288 B/s budget, "NET-101 owns AoI/delta"; §5 lists "AoI + delta snapshots (NET-101) bringing the
  down wire under 12 KB/s at 64 entities" as a precondition for READY.
- `docs/adr/A0010_client-scoped-prediction-hash.md`: a 64-entity v4 snapshot is 1 555 B = **46 650 B/s =
  3.80×** the budget, "NET-101 (AoI + delta) remains the owner of the budget".
- `scripts/validate-netgate.mjs --assert-ready` exits **1**; the Director accepted that risk (A0006) —
  it did not dissolve it.

So: wire budget → owned by NET-101 → gated behind GATE:P4 → gated behind GATE:P3 → gated behind art →
gated behind NET-GATE (I2) → gated behind the wire-budget criterion. The loop closes on itself.

## Decision — NET-101 is split into two parts

**(i) NET-GATE-scoped implementation — authorized to land before GATE:P4, solely to satisfy the
NET-GATE wire-budget criterion.** Scope: the AoI grid (entity cell = grid cell, integer-mm radius) and
AoI-filtered **delta snapshots** — including any bitpacking strictly required to clear the criterion —
plus the deterministic framed-bytes measurement proving the down link at 64 AoI entities. Output paths
stay the ones the blueprint names for NET-101 (`apps/server/src/aoi/`, the protocol codec) plus the
measurement harness; the implementation agent is `netcode-engineer`. It may be implemented, PR'd and
merged by the Director **without waiting for GATE:P4**, and its only sanctioned purpose is to move the
wire-budget row from `failing` to a measured pass (or to an honest, re-measured fail). Implementation is
authorized; merge remains the Director's act (D115 — agents never self-merge).

**(ii) The P4N remainder stays behind its gate.** Everything NET-101's completion would otherwise pull
in — the S2 load assertion (`pnpm sim prn1 --tier S2 --assert`), load tests beyond the single
wire-budget criterion, and the P4N band behind it (Postgres/Redis persistence, NET-102; shard-wide
consequence commits, NET-103) — stays behind `GATE:P4` / `GATE:P4N` exactly as the blueprint orders.
This ADR authorizes no part of (ii).

Consequences of the split:

- The blueprint is unchanged by this ADR. NET-101 remains one task with `deps: [GATE:P4]`; landing (i)
  early is a recorded, Director-pre-authorized exception to the *order* of execution, not an edit to the
  dependency graph. If the Director wants the graph itself amended, that is a separate blueprint change
  under the normal L2 ceremony.
- The wire prototype at `/tmp/strata-wire/tools/netgate/wire/` (read-only, unmerged, author: the
  AoI+delta prototyper) is the evidence vehicle for (i). It is not merged by this ADR and not edited
  here; when it merges, its measured numbers replace the projections in
  `docs/qa/prototypes/NET_GATE_WIRE_PLAN.md`.
- Bitpacking that is not required to clear the criterion stays in (ii) or lands as a separate task.

## What this ADR does NOT do

- **It supersedes nothing.** The gate chain is untouched: `GATE:NET` requires `GATE:P2NET` + `NG-001`;
  `GATE:P3` still requires `P3-001..P3-006` (art) and is unreachable until NET-GATE evidence improves;
  `GATE:P4` still requires `P4-ENTRY`; `GATE:P4N` still requires `NET-101..NET-103, OPS-001, MOD-001`.
  Tiers are unchanged; `authorized_tier` stays **S1**.
- **It does not weaken `scripts/validate-netgate.mjs` or any assert.** The validator is not edited
  here; `--assert-ready` still exits **1** while criteria are unmet; no dossier row is rewritten; no
  number is invented (I5/I13). `docs/qa/prototypes/NET_GATE.md` is untouched.
- **It does not make the wire budget "pass".** If the NET-GATE-scoped implementation misses
  12 288 B/s down at 64 AoI entities, the criterion **stays `failing`**, the Director's A0006 risk
  acceptance stands as the record, and no signature is fabricated, re-read or re-dated (I5).
- **It authorizes no art** (I2), no new dependency, no production wiring beyond what measuring and
  satisfying the wire-budget criterion requires, and no change to any invariant. Only a
  Director-signed ADR can suspend an invariant; this one suspends none.
- **It does not close the other 7 unmet NET-GATE criteria** (matrix, soak, correction p95, tick p95,
  reconnect/RPO, threat wiring residue). NET-GATE remains `signed-with-risk` until a real
  re-measurement passes and the Director re-signs (A0008/A0009).

## Rollback

The AoI/delta path is additive and behind a selectable codec/frame path. It can be disabled and the
full-snapshot path (`encodeFrame` / `snapshotFromWorld`, the v4 snapshot in `packages/protocol`)
restored **without a migration** and without touching persisted data — no persistence depends on the
snapshot frame layout (the same property A0010 records for its own rollback). The full-snapshot path
stays exported and tested throughout (i); if the AoI/delta measurement disappoints, the rollback is:
revert the selection to the full snapshot, keep the evidence, keep the criterion `failing`, and leave
A0006 as the standing risk record.

## Authority

The authority is the Director's standing blanket instruction, recorded in the NET-101 task brief and
repeated at every signature checkpoint since 2026-11-18:

> lances tous les agents ... ajoute ce qui manque, je signe tout d'avance

— transcribed verbatim, 2026-11-18. It is the same instruction class as, and consistent with:

- **A0006** (2026-11-18): "je signe tout" — blanket signature of NG-001 with 8/10 criteria unmet,
  recorded as `signed-with-risk`, **not** passed; `--assert-ready` still exits 1.
- **A0007** (2026-11-18): "fix all problems n limits" — fix everything fixable in-repo now, with
  checkpoints, locks, evidence and CI; unmeasured criteria stay recorded as unmet.
- **A0009** (2026-11-18): "je signe tous" — GATE:P2 and GATE:NET signed — risk accepted; the 8 unmet
  criteria remain listed verbatim.

A0010 is the direct precedent of a protocol change accepted under this same blanket instruction. Like
A0010, this ADR is accepted **as a pre-authorized plan, not as a passed gate**, and no agent claims a
Director act it did not see.

## Consequences

- NET-101 part (i) may proceed immediately as the only NET-GATE-relevant landing; the evidence plan is
  `docs/qa/prototypes/NET_GATE_WIRE_PLAN.md` (this session).
- `docs/qa/prototypes/NET_GATE.md` and `scripts/validate-netgate.mjs` still carry the pre-A0010
  wire-budget figure (46 530 B/s / 3.79×, hard-coded `3.79` in the validator's honesty check). A0010
  moved the truth to 1 555 B / 46 650 B/s / 3.80×. Updating the dossier row and the validator constant
  requires measured evidence from (i) and a Director-merged PR; it is not done here and not pre-approved
  here. Until then, the dossier and validator stay exactly as they are, and `--assert-ready` exits 1.
- `docs/state/metrics/2026-11-18-s02.json` likewise records the pre-A0010 figures; metrics are not
  rewritten by this ADR.
- If (i) lands and the measured wire rate is ≤ 12 288 B/s at 64 AoI entities, the wire-budget row may be
  updated with that evidence (owner: netcode-engineer/producer) and the Director may re-sign the gate on
  a real re-measurement. If it misses, nothing is claimed: the criterion stays `failing`, A0006 stands,
  and art stays blocked (I2).
