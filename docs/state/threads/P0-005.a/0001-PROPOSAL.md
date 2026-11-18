## 2026-11-18T07:32:00Z | orchestrator -> tools-engineer | HANDOFF

**claim:** the resume prompt is invalid by construction, so every session after the first starts with a
prompt the protocol must reject. Fix the artifact, not the protocol.

**context.** `tools/colab/prompts/SESSION_MASTER.md` seals itself with an end-of-file sentinel and a hash
(D139). `SESSION_RESUME.md`, created by P0-005, has neither: its last line is prose about the environment.
The Director's session-2 prompt therefore carried the sentinel rule from outside the repo, and any exact
integrity check fails on a file the repo itself ships. `scripts/validate-prompt-drift.mjs` checks the master
but not the resume, so nothing catches the drift.

**inputs:** `tools/colab/prompts/SESSION_RESUME.md` (38 lines), `scripts/validate-prompt-drift.mjs`,
`tools/qa/negative-prompt-drift.sh`, `docs/state/PROMPT.lock`.

**expected outputs:** a resume prompt that declares and carries `<<<STRATA_RESUME_END v8.1>>>`; a drift
validator that fails when it does not; negative tests for truncation, appended bytes, a doubled sentinel and
a missing file.

**acceptance:** `node scripts/validate-prompt-drift.mjs` 0 · `bash tools/qa/negative-prompt-drift.sh` 0 with
12/12 · `pnpm verify` 17/17.

**constraints:** no change to the sealed master, `PROMPT.lock` or `CONSTITUTION.md`; no new verify step (the
drift check is already a step, so the 17/17 count and the GATE:P1 dossier stay true); the sentinel is the
LAST line with nothing after it; no secret in the prompt (I7).
**deadline:** ≤ 30 min · **rollback:** revert the commit.

## 2026-11-18T07:32:00Z | orchestrator -> tools-engineer | PROPOSAL

**why now.** GATE:P1 is unsigned, so NET-001..006 are not selectable (§19 step 8, deps `[GATE:P1]`). A
repair task is exactly what §19 step 5 allows while a gate is pending. This one also removes a recurring
risk: a Director prompt that a strict session must reject wastes a whole session.

**options.** (A) leave the resume unsigned and rely on the Director's paste — rejected: the repo would keep
shipping an artifact its own protocol calls invalid. (B) copy the Director's pasted v8.1 resume verbatim —
rejected: its provenance is unverifiable and it arrived with a live token appended (I7). (C) keep the repo's
shorter structure, add the sentinel and make the validator enforce it — chosen.

**risk.** A sentinel is not a content check: it proves the prompt was not truncated, not that it is wise.
The 100 KB cap and the drift check bound the rest. A future v8.2 must bump both sentinels together; the
negative suite pins the current one.

**ACK** — tools-engineer, same process (one process wears every hat until reviewers are installed).
**REVIEW** — code-reviewer: author != reviewer, the review is recorded in `0002-EVIDENCE.md`.
