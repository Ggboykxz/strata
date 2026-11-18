# NEEDS DIRECTOR — batched questions

One document per session, per §0.5. Each item: Question / Context / Options / Recommendation / Risk.
Nothing here blocks the work already done; each item blocks a named future task.

**Status 2026-11-18T00:48Z**

| id | status | effect |
|---|---|---|
| ND-001 | **RESOLVED** — Option A applied | T1 EN 25/25, FR 30/35; FINDING-001 closed; T3 signed at GATE:P0 so concept `--check` exits 0 |
| ND-002 | **RESOLVED** — ADR A0002 Option A accepted | D-002 closed, WF-002 no longer `refused_ownership` |
| ND-003 | DEFERRED — current state matches the recommendation | revisit before GATE:P0; no action blocks P0-004 |
| ND-004 | **OPEN — requires the Director's account** | revoke the exposed GitHub PAT, issue a fine-grained one |
| ND-005 | **OPEN — requires the Director's account** | revoke the exposed HF token, issue a fine-grained one |

ND-004 and ND-005 cannot be closed by an agent: GitHub and Hugging Face rotations require account access
and, on GitHub, a UI flow. This is stated rather than simulated. Evidence that no secret reached the repo:
`docs/state/evidence/20261118T004835Z-DIRECTOR-RESOLUTIONS/01-secret-scan.log` (0 hits in `.git`, 0 in the
tracked worktree, no credential helper).

---

## ND-001 — T1 sentence overflow — RESOLVED

**Question.** Trim the locked EN High Concept to 25 words, or raise the T1 limit by ADR?

**Context.** `concept-integrity.mjs` measured the locked v1.0 EN sentence at **29 words** against a
**25-word** limit (§1.4 T1). FR was 31 against 35 — the source, not the translation, was over budget.

**Resolution (2026-11-18, Director instruction).** **Option A**: the already-published 25-word candidate
was adopted as v1.1; FR re-reviewed and re-locked at 30 words; FINDING-001 and CD-001 closed. The T1 limit
was **not** changed. `concept-integrity --check` now reports `T1 EN 25`, `T1 FR 30`, no finding; T3 remains
a deliberately unsigned gate-P1 debt. History and word-by-word count are in `docs/design/HIGH_CONCEPT.md` §7.

**Risk that was weighed.** A concept sentence is canon; changing it after marketing exists is expensive.
Changing it on day 2 is free. No new lore claim was introduced — the rewrite only removed the cadence that
made the sentence too long.

---

## ND-002 — ownership map vs WF-002 — RESOLVED

**Question.** Who owns `scripts/validate-ownership.mjs` and `scripts/validate-locks.mjs`?

**Context.** §4.2 assigns them to **orchestrator**. WF-002 originally named **tools-engineer**. Under
"most specific glob wins", WF-002 was `refused_ownership` — the validator rejected its own task. The OS
failed closed, correctly, on its first live test.

**Resolution (2026-11-18, Director instruction).** **Option A** as recommended and recorded in
`docs/adr/A0002_workflow-validator-ownership.md` (status ACCEPTED):

- WF-002 `agent: orchestrator` in `BLUEPRINT.yaml`, with a comment citing the §12 governance amendment;
- two explicit `scripts/**` exceptions in `OWNERSHIP.yaml` under `orchestrator`;
- `WORKFLOW.md` §1 and `AGENTS.md` §7 record the boundary change;
- D-002 in `docs/production/DISPUTES.md` is RESOLVED, so `validate-blueprint.mjs` no longer applies the
  refusal exemption. Verified: B2 now lists only the 3 scaffold exemptions, exit 0.

**Risk.** Option A narrows the "orchestrator writes docs only" rule to two named validators. The stubs'
banners were updated to name the new owner. PR #1 is still a draft, so the Director can reverse to B or C
before merge without rewriting history.

---

## ND-003 — repository identity and visibility — DEFERRED

**Question.** Personal account (`Ggboykxz`) or an organisation? Private or public?

**Context.** The repo was created private on the personal account so that nothing is published before the
constitution exists. §10.5 commits the project to open source (Apache-2.0 code, CC0/CC-BY assets, CC-BY docs).
`package.json` declares Apache-2.0; a LICENSE/NOTICE pair still has to land before publication.

**Status.** The current state — private, personal — **is** the published recommendation until `GATE:P0`.
Nothing in P0-004 or TRACER-001 is blocked by it. The decision becomes urgent only when the gate dossier is
assembled: flip public with README + LICENSE + NOTICE in place, and move to an organisation before any
self-hosted runner is used (fork-PR rules differ).

**Risk.** Public-by-accident is irreversible in practice (forks, caches, archives). Keep the visibility as
it is until the decision is explicit.

---

## ND-004 — token rotation — OPEN (Director action)

**Question.** Rotate the PAT now?

**Context.** The token used this session was pasted in chat and carries **full account scopes**
(`admin:enterprise`, `admin:org`, `delete_repo`, `ssh_signing_key`, `user`, `workflow`, …). The string is
in the conversation transcript. A prefix scan of `.git/` and of the tracked worktree returns 0 hits, and no
credential helper or credentials file exists. That limits the blast radius; it does **not** undo the exposure.

**Recommendation.** Revoke immediately at GitHub → Settings → Developer settings → Personal access tokens,
then issue a **fine-grained** token limited to `Ggboykxz/strata`:
Contents RW · Pull requests RW · Workflows RW · Actions R · Metadata R · 90-day expiry.
Export it as `GITHUB_TOKEN` in the local shell; never paste it into a chat, issue, PR or command log.

**Why this agent cannot close it.** Token revocation/creation is an account action behind the Director's
login and 2FA. Until it is done, pushes keep using the compromised string — a known, recorded risk.

**Risk.** A classic PAT with `delete_repo` + `admin:org` is account takeover if it leaks anywhere else —
CI logs, a shell history, a pasted stack trace. Rotation costs two minutes; the alternative costs the repository.

---

## ND-005 — HF token exposed in chat — OPEN (Director action)

**Question.** Revoke the Hugging Face token that was pasted into the session?

**Context.** A `hf_…` token was pasted directly into the conversation on 2026-11-18. It is in the transcript
and must be treated as compromised, exactly like the GitHub PAT. It was **not** written to disk, not committed,
and not passed to any tool call; `opencode.json` reads `{env:HF_TOKEN}` and contains no secret.

**Recommendation.** Revoke at `huggingface.co/settings/tokens`, create a **fine-grained** token with write
access limited to the STRATA datasets/models repositories, and export it only in the local shell
(`export HF_TOKEN=…`) or Colab's secret store. Never paste it into a chat, an issue or a PR.

**Why this agent cannot close it.** Hugging Face revocation requires the account UI (or an authenticated
call using a token that is deliberately not stored anywhere). No HF work is scheduled before the P0-006
license audit, so the exposure cannot be exploited by this repo yet.

**Risk.** A live HF token can read and overwrite the account's models and datasets, and can create
repositories under the account. Rotation is free; a poisoned asset revision is not.
