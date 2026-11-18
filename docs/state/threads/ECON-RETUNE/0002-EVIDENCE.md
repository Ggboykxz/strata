## 2026-11-18T14:00:00Z | economy-designer -> all | EVIDENCE

**claim.** The measured inflation failure from PR-S5 was fixed with a **named proportional stabilization sink**.
Both the failing before-value and the corrected after-value are recorded; no constant was silently changed.

**evidence** (`docs/state/evidence/` ECON-RETUNE dir)

| log | command | exit | result |
|---|---|---|---|
| `01-acc-prs5.log` | `pnpm vitest run tools/sim/economy/test/prs5.test.ts --reporter=verbose` | 0 | **5/5**, after report |
| `02-typecheck.log` | `pnpm typecheck` | 0 | strict |
| `03-full.log` | `pnpm test` | 0 | **167/167** |
| `04-verify.log` | `pnpm verify` | 0 | **19/19** |
| `05-gdd.log` | `node scripts/validate-gdd.mjs` | 0 | GDD-ECONOMY 0.4 |

**before / after (exact bigint).** Inflation **726 478 bps → 500 bps** (5,00 % target). Gini 0,080768 →
0,293701 (inside the 0,20..0,60 band). Supply final 73 647 832 → 1 050 000. Checksum `080bf7af` → `0e9d284d`.
The stabilization sink burned **93 073 815** minor units via a proportional levy toward a linear target.

**defect found during the fix.** A first sequential levy produced Gini 0,90 — a pathological inequality created
by the fix itself. It was rejected and replaced by a proportional levy. Recorded in GDD and the report.

**honest limits.** Still a compressed local simulation (720 hourly epochs), no real market or network. The sink is
a designed economic policy, not a fudge factor; its before/after and checksums are public in the evidence.

**locks.** 4 globs on `state/locks`, acquired under task id PR-S5; release after this commit.
