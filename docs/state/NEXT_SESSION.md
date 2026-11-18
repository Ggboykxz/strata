# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T03:04Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft) https://github.com/Ggboykxz/strata/pull/1 |
| mode | RESUME |
| next task | **P1-004** — UX/a11y/loc + SLICE_SPEC + risks + TDDs/ADRs |
| blocker | **ND-004 / ND-005 only** — token rotation needs the Director's account. |

---

## 1. State at hand-off

GATE:P0 signed; GATE:P1 not. P1-001..003 and GDD-001..004 done. All 14 critical modules DRAFT.
`pnpm verify` 17/17, 12 stubs, all repro scripts in `tools/qa/`, branches protected.

```bash
pnpm verify
node scripts/validate-docs.mjs
node scripts/validate-art-bible.mjs
```

## 2. P1-004 — definition of done

Blueprint line 668. Agent **producer**, co **ux-designer**, **localization-manager**, `split: true`, `amp`,
deps `[GDD-004, P1-002, P1-003]`. Outputs: `docs/design/VERTICAL_SLICE_SPEC.md`, `docs/design/UX_SPEC.md`,
`docs/design/LOCALIZATION.md`, `docs/tdd/`, `docs/adr/`. Acceptance: `node scripts/validate-docs.mjs`.

1. **VERTICAL_SLICE_SPEC**: one act → 30 s replay → ≥3 facts in ≥2 strata with a physical variant; six
   before/after captures; two equal-hash clients. Tie it to T2 and the tracer, with measured or explicitly
   tunable numbers. No content volume promise before throughput is measured.
2. **UX_SPEC**: HUD, menus, chat, inventory and map as an HTML/CSS overlay above the Babylon canvas;
   Babylon.GUI only for world-anchored labels, nameplates and healthbars. A11y v1 items: remap, subtitles,
   scale, contrast, motion reduction, colourblind, no flashing. Each item has a test id.
3. **LOCALIZATION.md**: FR/EN parity from the WORLD_BIBLE glossary, no concatenated sentences, locale-independent
   numeric formatting in core, and a 0-untranslated-keys gate.
4. **TDDs and ADRs**: docs/tdd/ entries for the P2 systems with GIVEN/WHEN/THEN acceptance; docs/adr/ entries
   for any architecture decision not already covered by A0001/A0002/A0003. Each file has title, status,
   context and decision so `validate-docs.mjs` passes.
5. **Risks register** in the slice spec: open concept debt, unmeasured throughput, blocked licences, and the
   dependency-review exception — each with owner and deadline, no hidden risk.
6. Extend `validate-docs.mjs` if needed to check the new sections; keep its structural-only scope and log
   negatives under `docs/state/evidence/<utc>-P1-004/`. Commit the negative script in `tools/qa/`.

Ownership: `docs/tdd/**` and `docs/adr/**` are append-only zones (any agent may create **new** files). The
ux-designer and localization-manager must write only their own spec paths through a recorded handoff.

## 3. Open decisions carried forward

1. **ND-004 / ND-005 — OPEN.** Rotate the exposed tokens; steps in `docs/state/SECURITY_HANDOFF.md`.
2. Other recorded decisions RESOLVED. GATE:P1 needs its Director signature after this task.
3. `main` requires a PR, one review and 8 checks; force push disabled.

## 4. After P1-004

**GATE:P1** (human, grants S1) requires `[P1-001, GDD-001..GDD-004, P1-002, P1-003, P1-004]`. After signature,
the NET-GATE phase starts: NET-001..006, PR-N1..N4, SEC-001, then NG-001 (human).

## 5. Known red

- `scope-math --report` exit 2, `concept --score` exit 2 — unmeasured stays NOT COMPUTABLE.
- 12 validators still fail by design; `pnpm verify` prints them as DEFERRED.
- 17 GDD modules remain STUB — correct before their prototypes.

## 6. Environment

Node 22.23.4, pnpm 12.21.0, TypeScript 6.0.3, Vitest 5.1.0. Tesla T4 measured, no model used before the
P0-006 whitelist. Secrets from env only; scripts in `tools/qa/`.
