# NEEDS DIRECTOR — batched questions

One document per session, per §0.5. Each item: Question / Context / Options / Recommendation / Risk.
Nothing here blocks the work already done; each item blocks a named future task.

---

## ND-001 — T1 sentence overflow (blocks GATE:P0 sign-off, not the build)

**Question.** Trim the locked EN High Concept to 25 words, or raise the T1 limit by ADR?

**Context.** `concept-integrity.mjs` measures the locked v1.0 EN sentence at **29 words** against a
**25-word** limit (§1.4 T1). The FR translation is 31 against 35 — within budget. The sentence was
written first; the test was added around it. The guardian found this on the first run, which is the
test doing its job.

**Options.**
- **A (recommended)** adopt the 25-word rewrite in `docs/design/HIGH_CONCEPT.md` §7 and re-review the FR.
- **B** raise the T1 EN limit to 30 by ADR. Cheaper, but weakens the one test that keeps the pitch a sentence.
- **C** leave it red. Not viable: `--check` gates CI from P2.

**Recommendation.** A. It preserves every claim (burn → abbey → megacity → memory) and costs one edit.

**Risk.** A concept sentence is canon; changing it after marketing exists is expensive. Changing it
on day 2 is free. This is the cheapest it will ever be.

---

## ND-002 — ownership map vs WF-002 (blocks WF-002)

**Question.** Who owns `scripts/validate-ownership.mjs` and `scripts/validate-locks.mjs`?

**Context.** §4.2 assigns them to **orchestrator**. Task **WF-002** names **tools-engineer** as its
agent. Under "most specific glob wins", WF-002 as written is `refused_ownership` — the validator
would reject its own task. This is the first live test of the map, and it failed closed, correctly.

**Options.**
- **A** WF-002 runs as `orchestrator` (the orchestrator owns its own enforcement tooling).
- **B** move the two map entries to `tools-engineer` (tooling is tooling).
- **C** split: ownership validator → orchestrator, lock validator → tools-engineer.

**Recommendation.** **A**. The orchestrator is the only role whose job is the process itself, and
self-enforcement tooling should not be writable by the roles it polices.

**Risk.** A conflicts with §16's "orchestrator edits only docs/**, AGENTS.md, opencode.json". If the
Director reads §16 as exhaustive, B becomes correct. Either answer is fine; an unrecorded answer is not.

---

## ND-003 — repository identity and visibility

**Question.** Personal account (`Ggboykxz`) or an organisation? Private or public?

**Context.** The repo was created private on the personal account so that nothing is published
before the constitution exists. §10.5 commits the project to open source (Apache-2.0 / CC0 / CC-BY).

**Recommendation.** Stay private until GATE:P0, then flip public with a README and NOTICE in place.
Move to an org before P0-004 if CI will ever use self-hosted runners (fork-PR rules differ).

**Risk.** Public-by-accident is irreversible in practice (forks, caches, archives).

---

## ND-004 — token rotation (security, do this first)

**Question.** Rotate the PAT now?

**Context.** The token used this session was pasted in chat and carries **full account scopes**
(`admin:enterprise`, `admin:org`, `delete_repo`, `ssh_signing_key`, `user`, `workflow`, …). The
string is in the conversation transcript. No copy reached disk or git: a token-prefix scan of `.git/` and of the worktree returned clean.

**Recommendation.** Revoke immediately, issue a **fine-grained** token limited to `Ggboykxz/strata`:
Contents RW · Pull requests RW · Workflows RW · Actions R · Metadata R · 90-day expiry.

**Risk.** A classic PAT with `delete_repo` + `admin:org` is account takeover if it leaks anywhere
else — CI logs, a shell history, a pasted stack trace. Rotation costs two minutes; the alternative
costs the repository.

---

## ND-005 — HF token exposed in chat (security, do this first)

**Question.** Revoke the Hugging Face token that was pasted into the session?

**Context.** A `hf_…` token was pasted directly into the conversation on 2026-11-18. It is therefore in
the transcript and must be treated as compromised, exactly like the GitHub PAT (ND-004). It was **not**
written to disk, not committed, and not passed to any command: every shell command is logged under
`docs/state/evidence/`, so using it there would have spread it further. `opencode.json` reads
`{env:HF_TOKEN}` and contains no secret.

**Recommendation.** Revoke it at `huggingface.co/settings/tokens`, create a **fine-grained** token with
write access limited to the STRATA datasets/models repositories, and export it only in the local shell
(`export HF_TOKEN=…`) or in Colab's secret store. Never paste it into a chat, an issue or a PR.

**Risk.** A live HF token can read and overwrite the account's models and datasets, and can create
repositories under the account. Rotation is free; a poisoned asset revision is not.
