# AGENTS.md — operating contract for every agent in this repository

STRATA is an open-source, browser-based, MMORPG-shaped systemic RPG, built by an AI studio under a human
**Director**. This file is loaded by OpenCode at the start of every session. It is the short form; the binding text is
`docs/CONSTITUTION.md` (materialized verbatim from the sealed master prompt, see `docs/state/PROMPT.lock`).

## 1. Read order (lazy loading — never read a corpus)

1. `docs/CONSTITUTION.md` §0 (kernel: role, modes, the 15 invariants, stop conditions, defaults).
2. `docs/state/SESSION.md`, `docs/state/NEXT_SESSION.md`, the tail of `docs/state/JOURNAL.md`.
3. `docs/state/LOCKS.yaml`, the open thread for the task, `docs/state/NEEDS_DIRECTOR.md`.
4. `docs/design/HIGH_CONCEPT.md` and `docs/SCOPE.md` before any design or scope decision.
5. Open a GDD module, an ownership entry or a skill **only when the selected task touches it**.

Never read a file > 400 lines unless it is the exact module being edited. Journal tail = 40 lines.

## 2. Authority order (never invert)

`INVARIANTS (§0.3) > DIRECTOR > HIGH CONCEPT > SCOPE LEDGER > GDD > WORKFLOW OS > NETCODE CONTRACT >
ENGINE CONTRACT > PROTOTYPE EVIDENCE > ART PIPELINE > BLUEPRINT TASK > CODE`

Only an ADR signed by the Director can suspend an invariant. A repo doc outranks the archived master prompt (D131).

## 3. The invariants, in practice

- **I1** The server owns all truth; the client sends intent. Client-authoritative gameplay is a P0 bug.
- **I2** No hero 3D asset, texture bake, motion or scene generation before **NET-GATE** passes. Greybox until then.
- **I3** Mesh GLBs and animation GLBs are never merged. Only animation *state* crosses the wire; hit frames are
  server-authoritative.
- **I4** No model or tool before a license + transitive-dependency audit. Non-commercial and research-only are
  rejected. Mixamo assets are forbidden.
- **I5** Never fake verification, disable CI, skip a gate, merge your own PR, or use an unverified API. A missing
  validator must fail.
- **I6** Single writer per path. Lock before editing. Never steal a lock. Never edit out of domain.
- **I7** Secrets come from the environment. Never printed, never committed.
- **I8** The Scope Ledger is zero-sum: features are traded, never absorbed. Colab/Kaggle never host a game server.
- **I9** A behavior change updates the GDD in the same PR.
- **I10** Prototype -> tune -> content -> art.
- **I11** Original IP only; provenance for every asset.
- **I12** Commit and push after every logical unit. One task <= 30 minutes.
- **I13** Evidence only: a claim without a command, an exit code and a log does not exist.
- **I14** `packages/core` is deterministic: no clock, no `Math.random`, no DOM/Node, no transcendentals.
- **I15** One file per event (locks, threads, journal, evidence). No shared mutable file.

## 4. Working loop (one task at a time)

1. Verify the environment (`pwd`, `git status --short`, branch, `git log --oneline -15`). Not a repo -> stop.
2. Select **one** task from `docs/blueprint/BLUEPRINT.yaml` using the deterministic order in §11 of the master
   (invariants first, then phase rank, gate satisfied, sig > amp > sup, estimated cost, id).
3. Classify the ceremony: **L0** trivial, **L1** standard, **L2** critical (cross-domain, architecture, scope,
   concept, license, security, gate). When unsure, go up.
4. Acquire the locks for every output path **in one sorted commit** on `state/locks` (see `docs/WORKFLOW.md` §4.3).
5. Branch `session/<date>-<task-id>-<slug>`. Delegate through a **handoff contract** that names inputs, outputs,
   acceptance commands, constraints, deadline and rollback. No acceptance commands = invalid handoff.
6. Execute. Checkpoint: commit, push, journal entry, renew locks. Push failure -> keep the commit, write
   `PENDING_PUSH.md`, retry with backoff.
7. Run every acceptance command and log it to `docs/state/evidence/<utc>-<task>/` with its exit code.
8. Open or update the PR with the evidence, then assign a **different** reviewer. Never merge your own PR.
9. Healthy, quota fine, next task safe -> next task. Otherwise write `NEXT_SESSION.md` and stop.

## 5. Commit and branch rules

- Subject: `type(task-id): description` (`type` in feat, fix, docs, chore, test, refactor, ci, perf, build).
- Every commit ends with the trailers:
  `Agent: <agent-name>` and `Task: <task-id>`.
- One PR per task. Author != reviewer. The Director merges, in queue order. Stacked PRs are allowed with
  `depends_on`.
- Never force-push `main` or a shared branch. A feature branch may be rebased, with the old head recorded in the PR.
- No secrets, no binaries (`*.glb`, textures, weights), no generated corpora in git. Binaries belong on HF.

## 6. Evidence and reporting

- Every acceptance command writes `docs/state/evidence/<utc>-<task>/NN-<name>.log`; the exit code is in the log.
- Every number in a report comes from `docs/state/metrics/<session>.json`, never from memory.
- Report bad news immediately. A failed prototype that invalidates a design assumption is a success for the
  project; hiding it is a P1 defect.
- End of session: SHORT result format (master §20). Gates and Director requests use FULL.

## 7. Ownership and conflicts

`docs/state/OWNERSHIP.yaml` is the machine-readable map; the most specific glob wins and a tie is a map error.
Append-only zones (`docs/state/threads/**`, `docs/adr/**`, `docs/tdd/**`, `docs/qa/prototypes/**`) accept new files
from any agent, never rewrites. The orchestrator writes docs and state only; the two workflow validators
`scripts/validate-ownership.mjs` and `scripts/validate-locks.mjs` are its only code exceptions (A0002).
Anything else goes through a handoff. A conflict is resolved by a handoff or the arbitration ladder in
`docs/WORKFLOW.md` §4.6 — never by editing anyway.

## 8. Current state (update this section at every session close)

- Phase **P0**, `current_tier` **S0**, `authorized_tier` **S0**. `GATE:P0` unsigned. **NET-GATE unpassed**: no art.
- `docs/blueprint/BLUEPRINT.yaml` holds 63 tasks and 11 gates; `scripts/validate-blueprint.mjs` enforces
  B1–B8 (0 errors, 12 declared warnings after A0002 removed the WF-002 refusal).
- 32 agents and 51 skill stubs exist. One process wears every hat until the Director installs reviewers.
- **T3 signed at GATE:P0** per master §1.4 ("re-signed at each gate"); `concept --check` exit 0. The
  HC §5 signature records the N2 × N4 basis and the obligation to re-sign at later gates.
- TRACER-001 is green: `pnpm tracer --assert` proves equal server/client hashes, rejects a forced desync and
  renders the capsule with Babylon NullEngine. NET-GATE remains unpassed; the capsule is greybox.
- P0-004 shipped 27 SHA-pinned workflows and a real `validate-workflows.mjs`. Acceptance was static: no
  Actions job has run yet. 12 stub-calling workflows are manual-only.
- **ND-001 resolved** (T1 EN 25/25, FR 30/35; FINDING-001 closed) and **ND-002 resolved** (A0002 option A,
  D-002 closed, WF-002 is orchestrator's). See `docs/state/NEEDS_DIRECTOR.md`.
- Known intentional red: `concept-integrity --check` (T3 novelty unsigned until GATE:P1),
  `scope-math --report` (throughput unmeasured). ND-004/ND-005 token rotations remain Director actions.

## 9. Environment

- Node 22.23.4 with pnpm **12.21.0** pinned via corepack (`corepack enable` done); lockfile committed.
  TypeScript 6.0.3, Vitest 5.1.0 — `docs/STACK.lock.md` is authoritative.
- `python3` + PyYAML are available; Blender, ComfyUI and a GPU are **not** on this machine.
- Secrets are read from env only: `GITHUB_TOKEN`, `HF_TOKEN`, `OPENCODE_API_KEY`, `REPO_URL`, `DATABASE_URL`,
  `REDIS_URL`. Never echo them; never put them in a command line that lands in a log.

## 10. Language

Repository artifacts are in **English**. The Director speaks **French**; answer in French, keep the committed text
in English. Player-facing text is FR + EN, and the FR/EN pair is never cut.
