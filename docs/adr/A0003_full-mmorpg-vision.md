# A0003 — full MMORPG vision, P0 vertical slice unchanged

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18** |
| authority | Director statement: "pas de rpg mais un mmorpg total comme ashe of creation" (ND-009, option A) |
| scope | VISION ONLY — no scope, tier, ledger, task or gate change |
| amendment id | `ADR-A0003` in `docs/state/PROMPT.lock` and `docs/CONSTITUTION.md` § AMENDMENTS |

## Decision

STRATA's long-term product target is a **full MMORPG** — a persistent, player-driven world whose state
changes through player action, in the tradition of dynamic-node MMORPGs — **not** an "MMORPG-shaped
systemic RPG". The P0 vertical slice remains the evidence path to that target; it is not the final product.

This ADR does **not** reopen the sealed scope ledger, the authorized tier (`S0`), the 63 tasks, the 11 gates
or the GATE:P0 dossier. The full MMORPG remains an S3/S4 target requiring its own Director funding decision.

## Exact amendment

Wherever the sealed master materialization says "MMORPG-shaped systemic RPG", the operating documents read:

> **a full MMORPG, delivered through a browser-based vertical slice**

This applies to `docs/CONSTITUTION.md` narrative (via the declared `## AMENDMENTS` escape hatch), `AGENTS.md`,
`README.md` and `docs/design/HIGH_CONCEPT.md` §2. The locked one-sentence concept (HIGH_CONCEPT §1) is
**not** changed: its claims (burn → abbey → megacity → memory) are unaffected by the product-shape wording.

## Original-IP constraint (I11)

Ashes of Creation is a commercial IP. Only generic mechanics may inspire STRATA: dynamic world state,
player-driven economy, visible and attributed consequences. No name, lore, map, node taxonomy, art,
skeleton or proprietary system may be copied. STRATA's cross-stratum consequence propagation and its
Rouille economic regulator are original equivalents already in the sealed concept.

## Consequences

- `PROMPT.lock amended: [ADR-A0003]` and a matching entry in the Constitution's `## AMENDMENTS` section.
  `validate-prompt-drift.mjs` remains green; the archived master stays byte-identical.
- HIGH_CONCEPT v1.3 changelog records the vision wording change; T1 and the GATE:P0 signature are untouched.
- `NEEDS_DIRECTOR.md` ND-009 is RESOLVED option A. No P0 task, gate or scope number changes.
- If the Director instead wants a full MMORPG at P0 (option B), this ADR is void and scope/funding reopen.

## Rejected

- **Option B** (full MMORPG at P0): would invalidate GATE:P0, the zero-sum ledger and the whole blueprint;
  needs a budget and tier decision the project has not made.
- **Option C** (inspiration only): contradicts the Director's explicit statement.
