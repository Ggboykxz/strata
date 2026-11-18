# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T00:50Z |
| branch | `session/20261118-hc-001-high-concept` (PR pending) |
| next task | **P0-001** — Constitution + AGENTS.md + opencode.json + BLUEPRINT.yaml + PROMPT.lock |
| blocker | **hard**: P0-001 hashes the master prompt and archives it. The file must exist in the repo. |

---

## 1. The one blocker

P0-001's outputs include `docs/archive/SESSION_MASTER_v8.1.md` and `docs/state/PROMPT.lock`
(`sha256` of the master). The master was delivered in chat, not as a file. I will not transcribe
~40 KB of doctrine from context: a single character drift would lock in a corrupted constitution and
every future `validate-prompt-drift` run would defend it.

**Action required (Director):**

```bash
mkdir -p tools/colab/prompts
# save the master verbatim as tools/colab/prompts/SESSION_MASTER.md
tail -n1 tools/colab/prompts/SESSION_MASTER.md   # MUST print: <<<STRATA_END v8.1>>>
wc -c  tools/colab/prompts/SESSION_MASTER.md     # MUST be < 100000
sha256sum tools/colab/prompts/SESSION_MASTER.md
git add tools/colab/prompts/SESSION_MASTER.md && git commit -m "docs(p0-000): vendor master prompt v8.1"
```

Once that lands, P0-001 can run and the repo becomes self-describing (RESUME mode).

## 2. What is done

| task | status | evidence |
|---|---|---|
| HC-001 | done | `docs/state/evidence/20261118T001004Z-HC-001/` |
| SC-001 | done | `docs/state/evidence/20261118T001004Z-SC-001/` |
| WF-001 | done | `docs/state/evidence/20261118T001004Z-WF-001/` |

## 3. Known red (intentional, not regressions)

- `concept-integrity.mjs --check` exit 1: FINDING-001 (T1 EN 29 > 25 words) + unsigned T3.
- `scope-math.mjs --report` exit 2: throughput unmeasured by design.
- WF-002 as written is `refused_ownership` — needs an ADR (see NEEDS_DIRECTOR ND-002).

## 4. Order for next session

1. Director vendors the master file (§1) → **P0-001**.
2. **P0-002** agents + skills + `validate-blueprint.mjs` + **failing** validator stubs.
   - includes the ADR resolving ND-002 before WF-002 can run
   - creates `.opencode/` (currently absent, which is why this session ran as one process)
3. **P0-003** monorepo + `pnpm verify` (pnpm is not installed here yet — `corepack enable`).
4. **WF-002** ownership + lock validators, then **TRACER-001** (the walking skeleton, D137).
5. Only then P0-004..007.

## 5. Environment notes

- Node **v22.23.4** ✓ (matches the pinned major).
- pnpm **absent** — P0-003's acceptance needs `corepack enable && corepack prepare pnpm@<pinned> --activate`.
- git 2.43, python 3.13.
- Repo is **private**; the Director may flip visibility when the constitution exists.

## 6. Security

The PAT used to create this repo was pasted in chat and carried **full account scopes**
(`admin:org`, `delete_repo`, `ssh_signing_key`, `user`). Rotate it before the next session and
replace it with a fine-grained token scoped to `Ggboykxz/strata` (Contents RW, Pull requests RW,
Workflows RW, Actions R, Metadata R). Nothing secret was written to disk or committed:
`grep -rl 'ghp_' .git/` returned clean.
