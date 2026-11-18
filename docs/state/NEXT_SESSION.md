# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T02:45Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| mode | RESUME |
| next task | **GDD-003** — CORE / STRATA / CONSEQUENCE / COMBAT / QUEST modules |
| blocker | **ND-004 / ND-005 only** — token rotation needs the Director's account (`docs/state/SECURITY_HANDOFF.md`). |

---

## 1. State at hand-off

GATE:P0 is signed; GATE:P1 is not. P1-001, GDD-001 and GDD-002 are done. Six of 14 critical modules are
DRAFT; 26 remain STUB. All reproduction scripts are committed under `tools/qa/` — nothing depends on
`/tmp` surviving a restart. `main` and the session branch are protected on GitHub.

```bash
pnpm verify                                   # 15/15
bash tools/qa/negative-gdd.sh                 # 10/10
node scripts/validate-gdd.mjs --critical      # 14 modules
```

## 2. GDD-003 — definition of done

Blueprint line 661. Agent **game-designer**, co **narrative**, `sig`, deps `[GDD-002]`. Outputs:
`GDD-CORE.md`, `GDD-STRATA.md`, `GDD-CONSEQUENCE.md`, `GDD-COMBAT.md`, `GDD-QUEST.md`.
Acceptance: `node scripts/validate-gdd.mjs`.

1. Advance **only these five** from STUB to **DRAFT** with all 19 fields from `docs/design/GDD.md`.
   26 other modules stay STUB (GDD-004 advances four more later).
2. **T2 is the hard constraint**: one act lands ≥3 facts in ≥2 strata within **900 ticks** (30 s at 30 Hz),
   with ≥1 physical variant swap per affected stratum, and six before/after captures. Put the numbers in
   field 5 with `SOURCE` or `TUNABLE + range + plan` — never adjectives (§3.5).
3. **CONSEQUENCE** module specifies the fact graph: immutable `fact_id`, actor id, tick, payload hash, and
   the replay path from fact to visible variant. **STRATA** specifies derived epochs — no hand-authored
   transitions (D5). **CORE** specifies the fixed 30 Hz state machine.
4. **COMBAT** must express D4: a strategy with no cross-stratum cost fails the concept. **QUEST**, with the
   narrative co-agent, must provide ≥3 resolutions per major quest, each with a cross-stratum and a
   delayed effect (T4).
5. Keep I11: original IP only. No named nodes, zones or lore from commercial MMORPGs.
6. Evidence under `docs/state/evidence/<utc>-GDD-003/`: validator log, 10+ negative cases (reuse
   `tools/qa/negative-gdd.sh`), per-module source of each number, and the tick-budget arithmetic.

## 3. Open decisions carried forward

1. **ND-004 / ND-005 — OPEN.** Rotate the exposed GitHub PAT and HF token; steps in
   `docs/state/SECURITY_HANDOFF.md`. Agent cannot revoke credentials behind the Director's login.
2. **ND-001 / ND-002 / ND-003 / ND-006 / ND-007 / ND-008 / ND-009 — RESOLVED.**
3. GATE:P1 needs its own Director signature after P1-001..P1-004 and GDD-001..004.

## 4. After GDD-003

GDD-004 (ECONOMY/TRADE/CRAFT/AI-ASSETS + critical closure), P1-002 FR/EN, P1-003 ART_BIBLE + A0001,
P1-004 UX/a11y/loc + TDD/ADRs, then GATE:P1 (grants S1) and the NET-GATE phase.

## 5. Known red

- `scope-math --report` exit 2, `concept --score` exit 2 — unmeasured values stay NOT COMPUTABLE.
- 14 validators still fail by design; `pnpm verify` lists them as DEFERRED.
- 26 modules remain STUB — correct before their prototypes exist.

## 6. Environment

Node 22.23.4, pnpm 12.21.0, TypeScript 6.0.3, Vitest 5.1.0. Tesla T4 measured but no model used before the
P0-006 whitelist. Secrets from env only; reproduction scripts in `tools/qa/`.
