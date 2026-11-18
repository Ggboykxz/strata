## 2026-11-18T07:41:00Z | tools-engineer -> all | EVIDENCE

**claim:** the repo now ships a resume prompt that validates itself, and the drift gate fails when it does
not. Two defects closed: the missing sentinel, and the missing check.

**evidence** (`docs/state/evidence/20261118T072941Z-P0-005.a/`)
- `01-negative-prompt-drift.log` — exit 0: **12/12**. The four new cases are a resume with the last line
  deleted, a byte appended after the sentinel, a second standalone sentinel line, and a missing file.
- `02-validate-prompt-drift.log` — exit 0, including the four new resume checks.
- `03-verify.log` — `pnpm verify` **17/17**, unchanged: the drift step grew, the step count did not.

**what changed.**
- `SESSION_RESUME.md` gains a 7-line header (usage, INTEGRITY rule, the "nothing after the sentinel" clause,
  the repo-outranks-the-prompt note) and ends on `<<<STRATA_RESUME_END v8.1>>>`. The body keeps the repo's
  shorter structure; the Director's pasted v8.1 text was **not** copied in, because its provenance cannot be
  verified and it arrived carrying a token.
- `validate-prompt-drift.mjs` §7 checks, in order: the file exists, its last line is the sentinel, the
  sentinel stands on exactly one line, it is under the 100 000-byte argument cap, and the file declares the
  rule it is checked against.
- `negative-prompt-drift.sh` counts its own cases now (`8` hard-coded was a lie waiting to happen).

**honest limits.**
- A sentinel proves integrity, not content. It cannot detect a plausible but wrong instruction.
- The resume prompt is not hash-pinned like the master: `PROMPT.lock` still covers the master only. Pinning
  a hash would make every legitimate edit a lock change; the sentinel + cap is the deliberate trade.
- `docs/state/JOURNAL.md` referenced by the master §7 and `AGENTS.md` §1 is a *generated* view that does not
  exist yet. The resume prompt points at `docs/state/journal/` instead; generating the view is a separate
  tooling task, recorded in `NEXT_SESSION.md`.

**locks.** `scripts/validate-prompt-drift.mjs`, `tools/colab/prompts/SESSION_RESUME.md`,
`tools/qa/negative-prompt-drift.sh` — acquired on `state/locks` in one sorted commit (`3343b59`, task id
corrected to `P0-005` in `fix(locks)` because `validate-locks.mjs` resolves ids against `BLUEPRINT.yaml`).

**review.** code-reviewer (same process, author != reviewer role): the diff touches no invariant, no locked
decision, no gate and no scope entry; the master and `PROMPT.lock` are byte-identical to their pre-task
state, which the drift hash check proves on every run. No secret was written to the repo.
