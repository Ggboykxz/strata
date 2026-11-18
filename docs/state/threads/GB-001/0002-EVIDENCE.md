## 2026-11-18T11:58:00Z | level-designer -> all | EVIDENCE

**claim.** GB-001 delivered Oakhollow greybox in three strata, capsules/boxes only, with a physical variant swap
driven by PR-S2 fact ids, and a real fail-closed `validate-scene-budget.mjs` replacing the P0-002 stub.

**evidence** (`docs/state/evidence/` GB-001 dir)

| log | command | exit | result |
|---|---|---|---|
| `01-greybox.log` | `node scripts/validate-scene-budget.mjs --greybox` | 0 | 3 strata, 12 primitives, 3 swaps, checksum `06d8d93c` |
| `02-parity-fail.log` | `--parity` | **1** | WG-001 owns parity, fail closed |
| `03-no-flag.log` | no flag | **1** | usage error, fail closed |
| `04-negative-mesh.log` | `--greybox` after injecting `"mesh": "hero.glb"` | **1** | names the forbidden field |
| `05-verify.log` / `08-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `06-tracer.log` / `07-gdd.log` | tracer + GDD validator | 0 | green · 32 modules |

**what the validator checks.** Version/mode/level; exactly three strata with ids 1,2,3; a 1..64 primitive count
per stratum; only `capsule`/`box` kinds; only the ten allowed keys (a `mesh`, `texture`, `material` or GLB field
is a hard error, not an ignored extra); integer millimetres inside the wire bound; positive scale; unique ids;
variant ids in 0..4 with at least one physical swap; PR-S2 fact-id format. It prints a deterministic FNV-1a
checksum of the accepted manifest. `--parity` exits 1 — WG-001 owns collision/visual parity.

**docs.** GDD-CONSEQUENCE 0.3 → 0.4 (I9): three sourced numbers, greybox manifest contract, two acceptance
lines. No new corrupted table (§18 was repaired in PR-S2).

**honest limits.** No Babylon scene, no visual capture for a blind reviewer, no collision parity, no real Oakhollow
art — WG-001 and P3-001 own those. No GPU/TPU (ND-012), no model downloaded (I4), no asset generated.

**locks.** 4 globs, one sorted commit: level-designer (manifest + validator), game-designer (GDD), orchestrator
(metrics).
