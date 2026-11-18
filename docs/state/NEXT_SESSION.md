# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T03:00Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| mode | RESUME |
| next task | **P1-003** — ART_BIBLE + A0001 + separated animation architecture |
| blocker | **ND-004 / ND-005 only** — token rotation needs the Director's account. |

---

## 1. State at hand-off

GATE:P0 signed; GATE:P1 not. P1-001, P1-002 and GDD-001..004 done. All 14 critical GDD modules are DRAFT.
`pnpm verify` 16/16, lore negatives 5/5, GDD negatives 13/13. All repro scripts in `tools/qa/`; branches protected.

```bash
pnpm verify
node scripts/validate-lore.mjs
node scripts/validate-gdd.mjs --critical
```

## 2. P1-003 — definition of done

Blueprint line 667. Agent **animation-director**, `sig`, deps `[GDD-003]`. Outputs:
`docs/design/ART_BIBLE.md`, `docs/adr/A0001_animation-scenes-textures.md`, `scripts/validate-art-bible.mjs`
(already explicitly owned by animation-director in `OWNERSHIP.yaml`). Acceptance: `node scripts/validate-art-bible.mjs`.

1. **A0001** resolves the art architecture: mesh GLBs and animation GLBs separate (I3), one skeleton pack per
   archetype, animation STATE only on the wire, server-validated transitions and hit frames. It must state
   the rejected alternative (merged GLB) and the consequence of the choice.
2. **ART_BIBLE** fixes the visual grammar of the three strata without generating art: kits on a 2 m grid,
   64 m cells, thin instances for repeated props, per-instance fact-variant ids, LOD0/1/2 + impostors beyond
   120 m, one IBL and three locked lighting presets. No hero asset, texture bake, motion generation or scene
   generation before NET-GATE (I2).
3. **Numbers with sources or tunable ranges** for draw calls ≤250, tris ≤1.5 M, GPU textures ≤350 MB,
   ≤20 full-rate skeletons, load ≤25 MB compressed. No adjective-only requirements (§3.5).
4. **Real `validate-art-bible.mjs`**: checks the bible sections, the A0001 sections, the separation rule,
   the absence of `art: true` tasks before NET-GATE, and the numeric budgets. Fails closed with file/line.
5. **Negative tests committed** under `tools/qa/`: merged GLB claim, missing A0001 section, hero asset before
   NET-GATE, missing budget — each exits 1.
6. Evidence under `docs/state/evidence/<utc>-P1-003/`.

## 3. Open decisions carried forward

1. **ND-004 / ND-005 — OPEN.** Rotate exposed tokens; steps in `docs/state/SECURITY_HANDOFF.md`.
2. Other recorded decisions RESOLVED; GATE:P1 still needs its Director signature.
3. `main` requires a PR, one review and 8 checks; force push disabled.

## 4. After P1-003

P1-004 (UX/a11y/loc, VERTICAL_SLICE_SPEC, TDD/ADRs), then GATE:P1 grants S1 and the NET-GATE phase starts.

## 5. Known red

- `scope-math --report` exit 2, `concept --score` exit 2 — unmeasured stays NOT COMPUTABLE.
- 13 validators still fail by design; `pnpm verify` prints them as DEFERRED.
- 17 GDD modules remain STUB — correct before their prototypes.

## 6. Environment

Node 22.23.4, pnpm 12.21.0, TypeScript 6.0.3, Vitest 5.1.0. Tesla T4 measured, no model used before the
P0-006 whitelist. Secrets from env only; scripts in `tools/qa/`.
