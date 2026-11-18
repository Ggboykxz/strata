## 2026-11-18T11:46:00Z | orchestrator -> level-designer | HANDOFF

**claim.** GB-001 is the next sig task (deps `GATE:NET` + `PR-S2` satisfied). Deliver greybox Oakhollow in three
strata using **capsules and boxes only**, with a physical variant swap driven by PR-S2 `variant_id`, and replace
the declared `validate-scene-budget.mjs` stub with a real fail-closed validator. No art, no mesh, no GPU/TPU.

**inputs.** PR-S2 `deriveConsequence` (variant ids 1..4, baseline 0), GDD-CONSEQUENCE §5/§7, GDD-STRATA §5
(3 strata, 64 m cells, 2 m kit grid), ART_BIBLE §2/§3, stub `scripts/validate-scene-budget.mjs`.

**expected outputs.** `apps/game/levels/greybox/oakhollow/manifest.json`, real `scripts/validate-scene-budget.mjs`,
GDD-CONSEQUENCE version bump, validator evidence with exit 0 on `--greybox` and exit 1 on tampering/`--parity`.

**acceptance.** `node scripts/validate-scene-budget.mjs --greybox` · `pnpm verify` · `pnpm tracer --assert`.

**constraints.** primitives only `capsule`/`box`; no mesh, texture, GLB, lightmap or motion; `--parity` stays
unimplemented and exits 1 (WG-001 owns it); no weakened assertion, no fake budget.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T11:46:00Z | orchestrator -> level-designer | PROPOSAL

**manifest.** A plain JSON file lists three strata (1..3), each with a bounded set of integer-millimetre
placements of `{kind: capsule|box, x, y, z, sx, sy, sz, variantId, factId?}`. Only two primitive kinds are legal;
any other field name for geometry is a validation error, not an ignored extra. The 64-primitive cap per stratum
is borrowed from the AoI entity cap (NET-002) and labelled a greybox budget, not a measured scene limit.

**variant swap.** At least one primitive must carry a `variantId` in 1..4 sourced from a PR-S2 fact id. The
baseline variant 0 is not a swap; a text-only change is not a swap (GDD §8.2).

**validator.** Fail closed on a missing manifest, wrong version, missing stratum, illegal primitive, overflow,
duplicate ids or no variant swap. Print a deterministic checksum of the accepted manifest. `--parity` exits 1
with an explicit "WG-001 owns parity" message; it must never pass by omission.

**honest limits.** No Babylon scene yet, no visual capture for a blind reviewer, no collision parity, no real
Oakhollow art — WG-001 and P3-001 own those. Greybox boxes/capsules only (I2/I4).

**ACK** — level-designer, same process.
