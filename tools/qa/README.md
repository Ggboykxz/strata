# tools/qa — reproduction scripts

Everything needed to reproduce the acceptance logs is committed here. Nothing depends on `/tmp` surviving
a session or an OpenCode restart. Older evidence logs still show `/tmp/opencode/…` command names because
those files were not committed when the logs were produced; the mapping below makes them reproducible now.

| old command in an evidence log | committed replacement |
|---|---|
| `node /tmp/opencode/own-check.mjs` | `node tools/qa/check-ownership-map.mjs` |
| `bash /tmp/opencode/drift-negative.sh` | `bash tools/qa/negative-prompt-drift.sh` |
| `bash /tmp/opencode/bp-negative.sh` | `bash tools/qa/negative-blueprint.sh` |
| `node /tmp/opencode/gen-stubs.mjs` | `node tools/qa/gen-stubs.mjs` |
| `node /tmp/opencode/gen-agents.mjs` | `node tools/qa/gen-agents.mjs` |
| `bash /tmp/opencode/wf2-negative.sh` | `bash tools/qa/negative-workflow-map.sh` |
| `bash /tmp/opencode/p004-negative.sh` | `bash tools/qa/negative-ci-workflows.sh` |
| `bash /tmp/opencode/p005-negative.sh` | `bash tools/qa/negative-resume.sh` |
| `bash /tmp/opencode/p006-negative.sh` | `bash tools/qa/negative-manifest.sh` |
| `bash /tmp/opencode/p007-negative.sh` | `bash tools/qa/negative-dashboard.sh` |
| `bash /tmp/opencode/p1001-negative.sh` | `bash tools/qa/negative-docs.sh` |
| `bash /tmp/opencode/gdd001-negative.sh` | `bash tools/qa/negative-gdd.sh` |
| `node /tmp/opencode/gen-workflows-v2.mjs` | `node tools/qa/gen-workflows.mjs` |
| `node /tmp/opencode/gen-gdd.mjs` | `node tools/qa/gen-gdd-stubs.mjs` |
| `node /tmp/opencode/gen-gdd002.mjs` | `node tools/qa/gen-gdd-draft.mjs` |

Rules for these scripts:

- Derive the repository root from the script location; never hardcode `/content/strata`.
- Use `mktemp -d` for sandboxes; clean up on exit. Negative tests temporarily modify real files only with
  a `trap` that restores them.
- They are **reproduction and generation aids**, not runtime code. `pnpm verify` remains the authoritative
  gate; these scripts prove its validators can fail and regenerate committed artifacts.
- A generator overwrites its target directory. Run it from the repository root and review `git status`
  before committing.

Add a mapping line here whenever a new one-off script is needed, and commit it in the same change as its
evidence.
