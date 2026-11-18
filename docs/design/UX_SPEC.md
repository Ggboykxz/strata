# UX SPEC — STRATA

| field | value |
|---|---|
| id | UX_SPEC |
| version | 1.0 |
| owner | ux-designer |
| status | ACTIVE |
| authority | master §6 UI policy, master §18 a11y v1, GDD-ONBOARDING |
| validated by | `node scripts/validate-docs.mjs` |

## 1. Overlay policy

HUD, menus, chat, inventory and map render as an **HTML/CSS overlay above the Babylon canvas**. Babylon.GUI
is reserved for world-anchored labels, nameplates and healthbars. A whole MMO HUD in WebGL is a P0 defect.

## 2. Screen set

| screen | purpose | source of truth |
|---|---|---|
| game HUD | tick, fact count, current era, reconnect counter | metrics + tracer events |
| inventory | items with provenance fact ids | GDD-INVENTORY / CRAFT |
| map | 64 m cells, kit grid, variant markers | GDD-STRATA |
| chat | FR/EN locale rooms | LOCALIZATION.md |
| menu | settings, a11y controls, quit | UX_SPEC §3 |

## 3. Accessibility v1 items

| id | control | test id |
|---|---|---|
| A11Y-1 | full key remap | ux-a11y-remap |
| A11Y-2 | subtitles for all audio cues | ux-a11y-subs |
| A11Y-3 | UI scale 75..200 % | ux-a11y-scale |
| A11Y-4 | contrast mode, WCAG AA minimum | ux-a11y-contrast |
| A11Y-5 | motion reduction replaces camera shake | ux-a11y-motion |
| A11Y-6 | colourblind-safe variant cues | ux-a11y-colour |
| A11Y-7 | no flashing above 3 Hz | ux-a11y-flash |

Every essential state has a text form; colour and motion are never the only channel.

## 4. Feedback rules

Each state change emits one text line naming the fact id and the affected era. No adjective-only feedback;
numbers come from metrics or explicitly tunable ranges. Desync and reconnect are announced once through a
live region.

## 5. Onboarding

A new player sees a 30 s replay before controlling a capsule: burn → abbey → megacity → memory. The four
before/after captures are textual alt descriptions, not only images.

## 6. Change log

| version | date | change | by |
|---|---|---|---|
| 1.0 | 2026-11-18 | overlay policy, screens, 7 a11y controls with test ids | ux-designer |
