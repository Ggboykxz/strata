# A0002 — ownership of the workflow validators

| field | value |
|---|---|
| status | **PROPOSED** — awaits the Director; not binding until accepted |
| date | 2026-11-18 |
| task | P0-002 (proposal), WF-002 (consume) |
| parties | orchestrator vs tools-engineer |
| dispute | D-002 (`docs/production/DISPUTES.md`) |
| supersedes | — |

## Context

§4.2 lists `scripts/validate-ownership.mjs` and `scripts/validate-locks.mjs` as **orchestrator** tools.
Task **WF-002** declares `agent: tools-engineer`, and `docs/state/OWNERSHIP.yaml` routes `scripts/**` to
`tools-engineer` by catch-all. Under the most-specific-glob rule, WF-002 is refused ownership of two of its
own output paths:

```
scripts/validate-ownership.mjs   map: orchestrator   task: tools-engineer
scripts/validate-locks.mjs       map: orchestrator   task: tools-engineer
```

The validator must not be silently special-cased. Whichever answer the Director gives, one of the two
documents changes in the same PR, and the map stays the single source of truth.

§16 also says the orchestrator edits "only `docs/**`, `AGENTS.md`, `opencode.json`". If that list is
exhaustive, the orchestrator may not write `scripts/**` at all, and §4.2 is internally inconsistent.
This ADR is the place to settle it.

## Options

### A — WF-002 runs as `orchestrator` (recommended)

Keep §4.2. Amend the blueprint's WF-002 `agent:` to `orchestrator`, and record `scripts/validate-ownership.mjs`
and `scripts/validate-locks.mjs` as the **only** two `scripts/**` exceptions to the orchestrator's docs-only
boundary, by explicit globs in the map.

- **Pro:** self-enforcement tooling is not writable by the roles it polices. A tools-engineer can change the
  lock rules that constrain tools-engineer.
- **Pro:** §4.2 already says this; the smallest edit is to the task, not the map.
- **Con:** breaks the clean "orchestrator writes docs only" line; needs the §16 carve-out written down.

### B — move both map entries to `tools-engineer`

Rewriting §4.2 to match WF-002.

- **Pro:** one boundary for all code, including CI helpers. No §16 exception.
- **Pro:** `scripts/**` stays a single-owner subtree.
- **Con:** the referee's rulebook becomes editable by a player. Acceptable only with a code-reviewer
  approval rule on those two paths, which is weaker because the reviewer is advisory.

### C — split the pair

`validate-ownership.mjs` → orchestrator; `validate-locks.mjs` → tools-engineer.

- **Pro:** matches the intuition that the map is constitutional and locks are infrastructure.
- **Con:** two answers for two files that share a parser and a release cadence; the next validator
  (`validate-workflows.mjs`) has no obvious home and the dispute repeats in P0-004.

## Decision

**A**, if the Director accepts this ADR. It preserves §4.2, keeps the enforcement tooling outside the
influence of the agents it constrains, and costs one line in `BLUEPRINT.yaml` plus a recorded exception in
`OWNERSHIP.yaml`.

Until accepted: **D-002 stays OPEN**, WF-002 stays `refused_ownership`, and `validate-blueprint.mjs`
downgrades exactly that task's B2 failure to a warning. The stubs for the two disputed files exist and fail;
they name the dispute in their banner.

## Consequences

- `BLUEPRINT.yaml`: WF-002 `agent: orchestrator` — the task's other outputs are unchanged.
- `OWNERSHIP.yaml`: add explicit `scripts/validate-ownership.mjs` and `scripts/validate-locks.mjs` entries
  under `orchestrator` (they already resolve there by §4.2, but the map must say it, not imply it).
- §16's docs-only sentence gains a parenthetical: "plus the two workflow validators named in A0002".
- WF-002 unblocks; no other task changes owner.

## Alternatives rejected

- **Leave it red indefinitely.** A permanently refused task at P0 means GATE:P0 cannot be assembled; the
  refusal was useful as a signal, not as a resting state.
- **Special-case in the validator.** Hiding the conflict in code is exactly what I6 forbids.

## References

- `docs/production/DISPUTES.md` D-002
- `docs/WORKFLOW.md` §4.2, §4.6
- `docs/CONSTITUTION.md` §16
- `docs/state/threads/WF-001/0003-DECISION.md`
