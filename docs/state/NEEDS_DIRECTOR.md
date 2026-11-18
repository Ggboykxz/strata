# NEEDS DIRECTOR — batched questions

One document per session, per §0.5. Each item: Question / Context / Options / Recommendation / Risk.
Nothing here blocks the work already done; each item blocks a named future task.

**Status 2026-11-18T00:48Z**

| id | status | effect |
|---|---|---|
| ND-001 | **RESOLVED** — Option A applied | T1 EN 25/25, FR 30/35; FINDING-001 closed; T3 signed at GATE:P0 so concept `--check` exits 0 |
| ND-002 | **RESOLVED** — ADR A0002 Option A accepted | D-002 closed, WF-002 no longer `refused_ownership` |
| ND-003 | **RESOLVED** — repository made public 2026-11-18 | README + Apache-2.0 LICENSE + NOTICE landed before the flip |
| ND-004 | **OPEN — requires the Director's account** | revoke the exposed GitHub PAT, issue a fine-grained one |
| ND-005 | **OPEN — requires the Director's account** | revoke the exposed HF token, issue a fine-grained one |
| ND-006 | **RESOLVED** — rejected, fallbacks recorded | Tencent community licences exclude EU/UK/Korea |
| ND-007 | **RESOLVED** — rejected, FLUX.1-schnell fallback | SDXL `openrail++` attribution/distribution scope |
| ND-008 | **RESOLVED — REVERSED** — ActionForge approved with conditions | CC0 output rights verified from publisher notices |
| ND-009 | **RESOLVED — option A** | full-MMORPG vision amendment (ADR-A0003), P0 scope unchanged |
| ND-010 | **RESOLVED — SIGNED** | GATE:P1 signed ("Oui, signe S1"); authorized_tier S1; NET-001..006 selectable |
| ND-011 | **OPEN — information acknowledged, one decision** | Director declares TPU v5e-1 + T4 16 GB; T4 is already the sourced generation tier, TPU has no audited model |
| ND-012 | **OPEN — Director confirms T4 needed** | Director: "je dois donc passer au t4 pour continuer". T4 16 GB required for **art generation only** (AI-001/AI-002); netcode measurement stays CPU-only |
| ND-013 | **PARTIAL — fix-all instruction** | Director said "fix all problems n limits"; repo-side fixes landed (A0007), hardware/Director/net-measurement limits remain open |

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

## ND-003 — repository identity and visibility — RESOLVED

**Question.** Personal account (`Ggboykxz`) or an organisation? Private or public?

**Context.** The repo was created private on the personal account so that nothing is published before the
constitution exists. §10.5 commits the project to open source (Apache-2.0 code, CC0/CC-BY assets, CC-BY docs).
`package.json` declares Apache-2.0; a LICENSE/NOTICE pair still has to land before publication.

**Resolution (2026-11-18, Director instruction): public.** Before the flip, the repo gained a README that
states the honest P0 status, the canonical Apache-2.0 `LICENSE`, and a `NOTICE` with exact third-party
versions and licenses. A full scan of the tracked worktree and all git objects found **0** GitHub or HF
token values. Verified after the flip: unauthenticated `GET /repos/Ggboykxz/strata` → **HTTP 200** and the
README is readable from `raw.githubusercontent.com` without a token.

**Remaining caveat.** The default branch `main` still holds only the empty root commit `36bd9af`: the
Director must merge PR #1 before the public landing page shows the project. No self-merge was performed.

**Escalated risk.** The exposed GitHub PAT (ND-004) is still live and the repository is now public.
Rotation is more urgent than before; an agent still cannot revoke it without the Director's account.

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

---

## ND-006 — Tencent community licences and territory — RESOLVED

**Question.** May STRATA ship assets made with Hunyuan3D 2.0, HY-Motion 1.0 or HY-World 2.0, given that
their community licences expressly exclude the EU, the UK and South Korea?

**Context.** P0-006 read the licence metadata from GitHub/Hugging Face without downloading anything. All
three are `tencent-*-community` licences with a territory clause; STRATA is public and FR/EN, so the
exclusion is material. HY-Motion additionally needs a body-model dependency audit (SMPL/AMASS family),
and HY-World's full inference code was not released at audit time. Evidence:
`docs/legal/AI_MODEL_AUDIT.md`, `docs/state/evidence/20261118T012845Z-P0-006/`.

**Options.**
- **A (recommended)** reject for now; use the audited fallbacks (InstantMesh / TripoSR / Mesh2Motion /
  procedural heightmap). Revisit with legal counsel if needed.
- **B** approve with a written distribution-scope decision and the missing audits.
- **C** leave blocked; AI-001/AI-002 stay procedural. Cheapest but closes the AI path.

**Risk.** A territory-restricted licence can invalidate distribution in exactly the markets FR/EN targets.
An agent cannot make this call.

**Resolution (2026-11-18, Director instruction "fix all blocked and rejected"): option A.** All three are
REJECTED in the whitelist with recorded fallbacks (InstantMesh / Mesh2Motion / procedural heightmap).
ND-006 is closed; the models remain unusable, not silently approved.

---

## ND-007 — SDXL `openrail++` distribution scope — RESOLVED

**Question.** Is SDXL base 1.0 (`openrail++`) acceptable for a public, commercially distributed game?

**Context.** P0-006 classified it COMMUNITY-CAPPED / attribution-bound (§8.1 step 4). FLUX.1-schnell is
Apache-2.0 and already approved, so no capability is lost by declining SDXL.

**Recommendation.** **A**: reject SDXL and use FLUX.1-schnell. **Risk.** `openrail++` terms vary by
downstream use; a distribution-scope decision needs the Director, not the pipeline agent.

**Resolution (2026-11-18): option A.** SDXL is REJECTED with FLUX.1-schnell as the recorded fallback.

---

## ND-008 — ActionForge output rights — RESOLVED (reversed)

**Question.** May STRATA use clips made with the ActionForge browser tool?

**Context.** The tool is © CGstuff, all rights reserved; its animations library is CC0, but the licence
page does not state rights over **user-produced outputs**. Master §8.1 step 6 requires that check.
Blender IK + socket parenting is always available as a fallback.

**Recommendation.** **A**: reject ActionForge, use Blender. **Risk.** An unstated output licence is not a
grant; using the tool before clarification could taint animated assets.

**Resolution (2026-11-18): REVERSED — approved with conditions.** The earlier context was incomplete.
The publisher's own `THIRD-PARTY-NOTICES.txt` states that the tool's code is proprietary but the animations,
rig and props are CC0 1.0 — commercial use, no attribution, no permission needed. That is exactly the output
rights §8.1 step 6 asks about. Verified sha256 `8b56bdd7…`. ActionForge is APPROVED_WITH_CONDITIONS: use
CC0 outputs only; never copy or redistribute the tool's code. The recommendation to reject is withdrawn on
the record rather than silently overwritten.

---

## ND-009 — product vision: full MMORPG, not an RPG-shaped slice (new, Director statement)

**Statement (2026-11-18, French):** "pas de rpg mais un mmorpg total comme ashe of creation".

**Interpretation.** The Director wants STRATA to be a **full MMORPG** in the tradition of Ashes of
Creation — a persistent, player-driven world whose nodes and economy evolve through player action — not
merely an "MMORPG-shaped systemic RPG". This conflicts with the sealed master wording §0/§1, which
deliberately scopes P0 to a browser vertical slice.

**Original-IP constraint (I11).** Ashes of Creation is a commercial IP. Only generic mechanics may inspire
STRATA: dynamically changing world state, player-driven economy, consequence visibility. No names, lore,
maps, node names, art, skeletons or proprietary systems may be copied. STRATA's cross-stratum consequence
propagation and its Rouille economic regulator are already original equivalents.

**Options.**
- **A (recommended)** adopt this as the **long-term product vision** and amend the wording by a
  Director-signed ADR using the sealed-master escape hatch (`PROMPT.lock amended:` + `## AMENDMENTS`
  in `docs/archive/SESSION_MASTER_v8.1.md`). Keep the P0 vertical slice, the zero-sum Scope Ledger and all
  gates unchanged; the full MMORPG is the S3/S4 target with its own funding decision.
- **B** change the P0 scope to a full MMORPG now: reopen `SCOPE_LEDGER.yaml`, raise `authorized_tier`,
  re-plan 63 tasks and 11 gates, and obtain Director funding. This invalidates the GATE:P0 dossier being
  assembled.
- **C** treat Ashes of Creation as inspiration only; keep the current sealed wording. No change.

**Status: RESOLVED (2026-11-18) — option A applied.** The action below records what changed and what did not.

**Resolution (2026-11-18): option A applied under the Director's "go next" instruction.** ADR-A0003 is
accepted and declared in `PROMPT.lock amended: [ADR-A0003]` and the Constitution's `## AMENDMENTS`
section. AGENTS, README and HIGH_CONCEPT §2 now read "full MMORPG, delivered through a vertical slice";
the locked sentence, T1, T3, scope ledger, tier, tasks and gates are unchanged. `validate-prompt-drift`
and `concept --check` both exit 0. The archived master stays byte-identical — the amendment is an
override on the materialization, not a rewrite of the seal.

---

## ND-010 — GATE:P1 signature — RESOLVED (SIGNED 2026-11-18)

**Question.** Do you sign GATE:P1 and grant tier **S1**?

**Context.** Every P1 task is done and pushed on `session/20261118-hc-001-high-concept`: the eight required
tasks, `pnpm verify` 17/17, concept check 0, critical GDD 0, 8/8 triggered Actions workflows green at
`fea7306`. The dossier is `docs/state/gates/GATE_P1.md`. **No agent signs a tier grant** (D136, §0.6).

**Effect of the answer.** Signed → `NET-001..006`, `PR-N1..N4`, `SEC-001`, `NG-001` become selectable and
the network layer starts, greybox only. Not signed → the studio can only do repair work (`session-result.mjs`,
the generated `JOURNAL.md`, the unpinned Playwright MCP), because every NET task declares `deps: [GATE:P1]`.

**Risk.** Signing promotes the tier on evidence that is structural, not measured: no server has run under
load yet, and the Actions proof is local-workflow based. That is what NET-GATE exists to replace. The real
risk is the opposite one — waiting keeps the most expensive unknown (netcode) unmeasured.

**Recommendation.** Sign S1 now; the tier only authorizes network work, not art (I2 still holds until NG-001).

## ND-011 — hardware declaration: TPU v5e-1 + T4 (Director statement, 2026-11-18)

**What the Director said.** Upcoming sessions run on a **TPU v5e-1** and a **T4 GPU**.

**What is already true in the repo.** The 16 GB tier is the T4: `tools/asset-pipeline/detect_tier.py` and
`tools/colab/detect_tier.py` special-case a Tesla T4 at its ECC-reserved 15 360 MiB, and `GDD-AI-ASSETS` §5
already carries "Tesla T4, 15360 MiB reported, nominal 16 GB | SOURCE: tools/colab/detect_tier.py". Nothing
needs to change for the T4.

**The gap.** No audited model (P0-006: 9 approved) targets TPU/XLA. The asset pipeline is CUDA-only:
`nvidia-smi`, FLUX/schnell, Blender bake, KTX2. On a TPU-only runtime `detect_tier.py` correctly prints
`NO_GPU` and the CPU-safe policy (CC0 kitbash + procedural geometry), because no TPU generation path exists
and inventing one would violate I4. A TPU is a training accelerator, not a drop-in generation device.

**Decision requested.** Is the TPU intended for **training-class** work only (then this is an FYI, no model is
added and art stays T4-only), or does the Director want a TPU generation path (then it needs its own audit
entry, licence review and a measured throughput number before any task references it)?

**Runtime update (Director, 2026-11-18).** The current runtime has **no TPU and no GPU**. The Director asks to be
signalled when an accelerator becomes necessary. This does not change ND-011 — the question is about the hardware
that will be available later, and no art or model task is scheduled now.

**Effect of no answer.** None on the current plan: NET work is CPU-deterministic, art is gated by NET-GATE, and
no model runs this session (I4). Nothing is blocked; the ambiguity is recorded instead of guessed.

## ND-012 — accelerator needed for art generation (Director: "gère l'art et go next")

**Director statement, verbatim (2026-11-18):** "gère l'art et go next".

**Request.** Provision a **T4 16 GB GPU** (or equivalent) in the runtime before AI-001. The tier is already
sourced in `tools/asset-pipeline/detect_tier.py` (15 360 MiB ECC → 16 GB) and nine models are already audited
(`AUDIT-2026-11-18-P0-006`). The declared future TPU v5e-1 is **not** a substitute: no audited model targets XLA
and ND-011 is still open.

**Why now.** The Director signed NET-GATE with risk (A0006), but art tasks are still blocked by `GATE:P2`
(needs P2-SYS, HC-003, GDD-005) and by the absence of hardware. No asset has been generated; the CPU-safe policy
applies. The full handoff is in `docs/state/ART_HANDOFF.md`.

**Effect of no answer.** None on the current plan: PR-S1 (P2-SYS greybox) proceeds on CPU. AI-001..AN-002 remain
blocked by deps and hardware. Nothing is faked and no model is downloaded.

**Director confirmation (2026-11-18, verbatim):** "je dois donc passer au t4 pour continuer".

**Scope of the need — precisely.** The T4 16 GB is required for **art generation only**: AI-001 (ComfyUI +
FLUX-schnell images + one InstantMesh hero mesh end-to-end and throughput) and AI-002 (rig/retopo/LOD,
separated mesh/animation GLBs). Nine models are already audited (`AUDIT-2026-11-18-P0-006`); HUNYUAN3D and
HY-MOTION are rejected. The TPU v5e-1 is **not** a generation device (ND-011).

**What does NOT need the T4:** PR-S7/PR-S8 (P2-SYS greybox), the 4-client RTT/loss/jitter harness, the 30-minute
soak, server tick p95, AoI/delta (NET-101), crash/RPO dataset and the NET-GATE re-measurement. Those are CPU and
time work. The remaining Director-only items (ND-004/ND-005 rotation, PR #1/#2 merges) are unrelated to hardware.

**On arrival.** Run `python3 tools/asset-pipeline/detect_tier.py` (expect tier `16GB`, 15 360 MiB ECC) and
`python3 tools/colab/detect_tier.py`, log both to a new evidence dir, then start AI-001 under its locks.
No binary enters git: meshes/textures go to Hugging Face with provenance. No model is run before the audit entry
is verified (already satisfied).


**Related:** ND-004/ND-005 (token rotation) and ND-011 (TPU scope) remain open; PR #1/#2 merges remain Director-only.

## ND-013 — "fix all problems n limits" — partial by construction

**Director statement, verbatim (2026-11-18):** "fix all problems n limits".

**Fixed** (A0007, TOOL-FIXALL): false-pass acceptance detection, verify coverage 17 → 19, generated journal view,
MCP pin, lock validator gate ids, stale STACK row, dashboard check port.

**Still open because an agent cannot fix them:** no GPU/TPU (ND-012); 4-client RTT/loss/jitter matrix, 30-minute
soak, server tick p95, RPO dataset and AoI/delta (NET-GATE 8 unmet criteria); PAT/HF rotation and PR #1/#2 merges
(Director-only); TPU scope (ND-011). The economy retune and SEC-002 gate wiring are fixable but require their own
measured checkpoints, not an assertion change. None of these were silently closed.

**Effect of no answer:** nothing new is blocked; the list above is the true residual limit set.

---

## ND-004 — update 2026-11-18T07:27Z

The PAT was pasted **again**, this time inside the resume prompt, on the sentinel line. It is still live and
was used for this session's `state/locks` pushes. The session ends with it unrevoked at the Director's
explicit request ("je le révoquerai plus tard"). Rotation is now overdue: the string is in two transcripts.

**Status: still OPEN.** NET-001 and NET-002 used the PAT again (pushing `state/locks` and the session branch),
so the exposure window keeps growing. `GATE:P1` being signed (ND-010) does not close this item: rotation is a
Director account action, not an agent one. Steps: `docs/state/SECURITY_HANDOFF.md`.
