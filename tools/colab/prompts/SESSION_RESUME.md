# STRATA — SESSION RESUME v8.1
# "WORKFLOW OS · NETWORK-FIRST · SEPARATED ANIMATION · WORLD-KIT GENERATION · EVIDENCE-ONLY"
#
# USAGE: opencode run --agent orchestrator "$(cat tools/colab/prompts/SESSION_RESUME.md)"
#
# INTEGRITY: this file is valid ONLY if its LAST line is <<<STRATA_RESUME_END v8.1>>>.
#   Last line missing or altered -> the prompt was truncated or edited -> STOP and ask the Director to resend it.
#   `scripts/validate-prompt-drift.mjs` enforces the sentinel, the single occurrence and the size cap (D139).
#   Never append anything after the sentinel — a token, a URL or a note makes the prompt invalid.
#
# SHORT FORM. The constitution lives in the repo, not in this prompt: docs/CONSTITUTION.md is binding and
# outranks this file. The sealed archive is docs/archive/SESSION_MASTER_v8.1.md.

## 1. Environment

```bash
pwd
git status --short
git branch --show-current
git log --oneline -15
node scripts/drill-resume.mjs --dry
pnpm install --frozen-lockfile && pnpm verify
pnpm tracer --assert
```

Not a repository, or `docs/CONSTITUTION.md` missing -> STOP and print the bootstrap commands from
`tools/colab/setup.sh` (SESSION_MASTER.md owns the bootstrap; a resume prompt never bootstraps by hand).
Baseline red -> fix it before selecting a new task. Recover valid WIP; a watchdog checkpoint is squashed
before the PR.

## 2. Read order

1. `docs/CONSTITUTION.md` §0 — invariants and stop conditions.
2. `docs/state/SESSION.md`, `docs/state/NEXT_SESSION.md`, `docs/state/NEEDS_DIRECTOR.md`.
3. `docs/state/LOCKS.yaml` (registry on `state/locks`) and the newest 40 lines of `docs/state/journal/`.
4. `AGENTS.md` — short operating contract; the Constitution outranks it.
5. Only the GDD modules and ownership entries the selected task touches.

## 3. One task

Select from `docs/blueprint/BLUEPRINT.yaml` by the §11 order; classify the ceremony; handoff with inputs,
outputs, acceptance commands, constraints, deadline and rollback. Acquire every lock in one sorted commit on
`state/locks`. One commit per logical unit with `Agent:` / `Task:` trailers; evidence under
`docs/state/evidence/<utc>-<task>/`; a different reviewer; the Director merges. Never force-push, never
disable a validator, never merge your own PR.

## 4. Environment

Node 22, pinned pnpm via corepack, no GPU here — `tools/colab/detect_tier.py` reports `NO_GPU` honestly.
Colab never hosts a server. Secrets come from the environment; never print them, never commit them.

<<<STRATA_RESUME_END v8.1>>>
