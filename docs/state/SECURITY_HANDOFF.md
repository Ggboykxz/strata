# Security handoff — ND-004 / ND-005

| field | value |
|---|---|
| status | **OPEN — Director action only** |
| reason | two tokens were pasted into the session transcript and must be treated as compromised |
| repo | **public** since 2026-11-18, so exposure is urgent |
| agent limit | no token value exists on disk, in git or in an evidence log; revocation needs the Director's login/2FA |

## 1. GitHub PAT — ND-004

1. Open `https://github.com/settings/tokens` and **Revoke** the classic token pasted in the session.
2. Create a **fine-grained** token scoped to `Ggboykxz/strata` only:
   - Contents: **Read & write**
   - Pull requests: **Read & write**
   - Workflows: **Read & write** (only if release work is delegated to CI)
   - Actions: **Read**
   - Metadata: **Read**
   - Expiry: **90 days**, regenerate in a calendar reminder.
3. Export it in the shell only: `export GITHUB_TOKEN=…`. Never paste it into a chat, issue, PR or log.
4. After rotation, run one push to confirm the new credential works, then delete the old credential from
   any password manager history entry that shared it.
5. Record the rotation date in `docs/state/NEEDS_DIRECTOR.md` ND-004 with **no token value**.

**Why it was not revoked by the agent.** Revoking it first would break every push with no replacement —
the same failure mode the Workflow OS is designed to avoid. The known risk is carried, not hidden.

## 2. Hugging Face token — ND-005

1. Open `https://huggingface.co/settings/tokens` and revoke the pasted token.
2. Create a **fine-grained** token with write access limited to the STRATA datasets/models repositories.
3. Export it only in the local shell (`export HF_TOKEN=…`) or Colab's secret store. `opencode.json` reads
   `{env:HF_TOKEN}` and contains no secret.
4. No HF call is scheduled before P0-006's license audit, and the audit itself used only unauthenticated
   public APIs. Nothing in the repository depends on this token today.
5. Record the rotation date in ND-005 with **no token value**.

## 3. Verification scan (already done, repeat after rotation)

```bash
git grep -IlE 'ghp_[A-Za-z0-9]{20,}|hf_[A-Za-z0-9]{20,}'         # must print nothing
git rev-list --objects --all | awk '{print $1}' | git cat-file --batch | grep -c 'ghp_[A-Za-z0-9]\{20,\}'
```

Both scans returned 0 before the public flip; the evidence is in
`docs/state/evidence/20261118T004835Z-DIRECTOR-RESOLUTIONS/01-secret-scan.log`.

## 4. Branch protection — DONE 2026-11-18

The Director's observation that the branch was unprotected was applied immediately via the GitHub API:

| branch | protection |
|---|---|
| `main` | required PR, 1 approving review, conversation resolution, strict required checks (`ci`, `netcode`, `high-concept`, `workflow`, `scope`, `model-audit`, `opencode`, `security`), force push disabled, deletion disabled |
| `session/20261118-hc-001-high-concept` | force push and deletion disabled; no PR requirement so the orchestrator can keep pushing checkpoints |

Evidence: `docs/state/evidence/20261118T022611Z-GDD-001/06-branch-protection.log`. This closes the "self-merge
and unprotected default branch" risk: PR #1 cannot be merged without a different reviewer, and required
checks must be green at the merged head.

## 5. Decision carried by the agent

Do not revoke before a replacement exists. Once the Director confirms both rotations, the orchestrator
updates ND-004/ND-005 to RESOLVED and re-runs the scan. Until then, the gate result is unaffected — but the
exposure is real and the tokens must be considered public.
