# SESSION RESUME — STRATA

Short, evidence-based prompt for a fresh session. It does not copy the sealed master; the authoritative
text is `docs/CONSTITUTION.md` and the sealed archive is under `docs/archive/`.

## Start (master §17)

```bash
pwd
git status --short
git branch --show-current
git log --oneline -15
node scripts/drill-resume.mjs --dry
pnpm install --frozen-lockfile && pnpm verify
pnpm tracer --assert
```

Not a repository → stop and print the bootstrap commands from `tools/colab/setup.sh`. Baseline red → fix
before selecting a new task. Recover valid WIP; a watchdog checkpoint is squashed before the PR.

## Read order

1. `docs/CONSTITUTION.md` §0 — invariants and stop conditions.
2. `docs/state/SESSION.md`, `docs/state/NEXT_SESSION.md`, `docs/state/NEEDS_DIRECTOR.md`.
3. `AGENTS.md` — short operating contract; the Constitution outranks it.
4. Only the GDD modules and ownership entries the selected task touches.

## One task

Select from `docs/blueprint/BLUEPRINT.yaml` by the §11 order; classify the ceremony; handoff with inputs,
outputs, acceptance commands, constraints, deadline and rollback. One commit per logical unit with
`Agent:` / `Task:` trailers; evidence under `docs/state/evidence/<utc>-<task>/`; a different reviewer;
the Director merges. Never force-push, never disable a validator, never merge your own PR.

## Environment

Node 22, pinned pnpm via corepack, no GPU here — `tools/colab/detect_tier.py` reports `NO_GPU` honestly.
Colab never hosts a server. Secrets come from the environment; never print them, never commit them.
