# AGENTS.md — operating contract for every agent in this repository

STRATA is an open-source, browser-based, **full MMORPG, delivered through a vertical slice**, built by an AI studio under a human
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

- Phase **P1 complete → P2NET**, `current_tier` **S0**, `authorized_tier` **S1** (GATE:P1 signed 2026-11-18). **NET-GATE unpassed**: no art.
- `docs/blueprint/BLUEPRINT.yaml` holds 63 tasks and 11 gates; `scripts/validate-blueprint.mjs` enforces
  B1–B8 (0 errors, 12 declared warnings after A0002 removed the WF-002 refusal).
- 32 agents and 51 skill stubs exist. One process wears every hat until the Director installs reviewers.
- **T3 signed at GATE:P0** per master §1.4 ("re-signed at each gate"); `concept --check` exit 0. The
  HC §5 signature records the N2 × N4 basis and the obligation to re-sign at later gates.
- TRACER-001 is green: `pnpm tracer --assert` proves equal server/client hashes, rejects a forced desync and
  renders the capsule with Babylon NullEngine. NET-GATE remains unpassed; the capsule is greybox.
- P0-004 shipped 27 SHA-pinned workflows and a real `validate-workflows.mjs`. Acceptance was static: no
  Actions job has run yet. 12 stub-calling workflows are manual-only.
- P0-005 added an idempotent bootstrap, a fail-closed watchdog and a read-only resume drill. P0-006 audited
  the AI stack: 9 approved, 0 blocked, 11 rejected with fallbacks; no model has been used (I4).
- P0-007 generated a read-only dashboard from repo state; 14 unmeasured fields display NOT COMPUTABLE.
  GATE:P0 evidence assembly is next — 3 kill-session drills and a real GitHub Actions run; the Director signs.
- GATE:P0 dossier assembled unsigned: 3 drills, 13 green Actions runs, 1 dependency-review exception
  (graph API 403). ADR-A0003 amends the long-term vision to a full MMORPG; P0 scope unchanged. No agent
  signs a gate.
- P1-001 added a concept-first VISION derived from HIGH_CONCEPT v1.3 and ADR-A0003, plus a real
  validate-docs gate. P1 work runs under the Director's recorded "go next"; GATE:P0 remains unsigned.
- GATE:P0 is signed by recorded Director decision. GDD-001 created 32 STUB modules and 14 computed
  critical modules; verify is 15/15. ND-004/005 rotation steps are in docs/state/SECURITY_HANDOFF.md.
- GDD-002 advanced six critical modules to DRAFT (19 fields, sourced numbers). All repro scripts live in
  tools/qa/; main and the session branch are protected on GitHub. Next: GDD-003.
- GDD-003 advanced five concept modules to DRAFT; T2's 900-tick budget and T4's three-resolution minimum
  are now validator failures. 11 of 32 GDD modules are DRAFT. Next: GDD-004 (economy closure).
- GDD-004 closed the 14 critical modules as DRAFT with sourced economy tables.
- P1-002 added 6 original FR/EN glossary entries and a real validate-lore gate; verify is 16/16.
  Next: P1-003 (ART_BIBLE + A0001 separated animation architecture).
- P1-003 fixed the separated art architecture and caught an unowned ADR path via B2; verify is 17/17.
  Next: P1-004 (UX/a11y/loc + SLICE_SPEC + TDDs/ADRs), then GATE:P1.
- P1-004 completed the P1 design set: slice/UX/localization specs and 3 TDDs; verify 17/17.
  GATE:P1 evidence is assembled; tier S1 promotion needs the Director signature.
- **ND-001 resolved** (T1 EN 25/25, FR 30/35; FINDING-001 closed) and **ND-002 resolved** (A0002 option A,
  D-002 closed, WF-002 is orchestrator's). **ND-003 resolved**: the repo is public (the Director must merge
  PR #1; `main` is still empty). ND-004..ND-008 remain open.
- **GATE:P1 is SIGNED by the Director** (2026-11-18, quoted "Oui, signe S1"): `authorized_tier` **S1**,
  GATES.yaml regenerated, one-step grant (S0→S1). P0-005.a sealed `SESSION_RESUME.md` with
  `<<<STRATA_RESUME_END v8.1>>>` and made `validate-prompt-drift` enforce it (12/12 negatives). The
  `state/locks` registry branch now exists. Next: **NET-001**.
- **NET-002 landed**: binary v2 frames (intent 11 B, hash ack 13 B, snapshot 15 + 24/entity, max 1 551 B),
  exact lengths, handshake rejects any version outside 2..2, hash carried as u32. A 64-entity snapshot is
  46 530 B/s at 30 Hz — **3.9x over** the 12 KB/s budget, recorded as NET-101's task, not hidden. v1 JSON
  stays exported until the game client migrates. Next: NET-003 (needs a producer-owned Colyseus pin) or
  NET-005 (no new dependency).
- **NET-005 landed**: server-authoritative anim state machine in `packages/core/src/anim-state/` (5 states,
  2-tick blend, 3-tick recovery, queued requests tied by `(sequence, clipId)`) plus a validated clip manifest
  and a JSON Schema kept in sync by a test. gdd 0.3, anim 22/22, full 73/73, verify 17/17. Next: NET-003,
  blocked on a producer-owned Colyseus pin.
- **Acceptance trap**: `pnpm vitest run <dir> -t <pattern>` exits 0 while skipping every test if the pattern
  matches nothing (proven: `-t animstate`, 41 skipped). Acceptance commands must name the test file.
- **Dashboard**: PR #2 (`session/20261118-dashboard-truth`) replaces P0-007's hardcoded false values with
  sourced ones and adds `apps/dashboard/check.mjs`. The view is truthful but still static; the check is not
  yet a `pnpm verify` step.
- **NET-003 landed on the pinned `ws` transport** (A0004, Director: "bypass pin colyseus"): no dependency added.
  Rooms own lifecycle/reconnect/session handles; handles are resume hints, not credentials (SEC-001). Rooms
  17/17, server 25/25, full 90/90, verify 17/17. **D146 is closed**: `scripts/session-result.mjs` generates the
  §20 result from metrics, fail-closed and byte-identical. Next: NET-004 (prediction/reconciliation).
- **NET-004 landed**: client predictor, reconciliation at the acked tick, integer interpolation and a bounded
  client hash timeline. A mismatch is a **desync** — rejected, never silently reconciled. Net 15/15, full 105/105,
  verify 17/17. Next: NET-006 (anim state wire + server hit frames), deps now satisfied.
- **NET-006 landed with A0005**: wire v3 anim (17 B) + resync (10 B) frames, v2 peers refused, server-owned
  anim transitions and hit frames, 3..8-tick jitter buffer (tunable, not measured RTT). Full 122/122, verify
  17/17. Next: PR-N1 — local tick CPU p95 and framed byte-rate harness with a real logged command.
- **PR-N1 closed the last A0005 deferral**: local harness, 180 ticks/64 entities, CPU p50 0.1625 ms / p95
  0.2109 ms, full snapshot 46 530 B/s = 3.79x the 12 KB/s budget. Explicitly not RTT, not a soak; CPU timings
  are noisy, byte figures exact. Next: PR-N3 (ledger/persistence fuzz).
- **PR-N3 landed**: zero-sum bigint minor-unit ledger with idempotency and checksummed crash restore; 10k
  duplicate fuzz ends at **0 drift** with 0 reposts after restore. Full 132/132, verify 17/17. Next: PR-N4
  (lag compensation). No database or RPO promise is implied by the local fuzz.
- **PR-N4 landed**: 31-frame rewind, bigint squared range, integer Bresenham LOS and per-shooter cooldown;
  the client's `claimed` flag is ignored. Local fuzz 30 shots (4 hits / 16 cooldown / 5 blocked / 4 range / 1 stale),
  full 142/142, verify 17/17. Next: SEC-001 (threat model, validation, rate limits).
- **SEC-001 closed P2NET**: ingress gate with counted reason codes, 30-per-window rate limit and GM audit;
  200-message burst → 30 admitted. Threat model lists seven residual risks — no auth/TLS, gate not wired into
  `attachRooms` (SEC-002), in-memory counters, retention is OPS-001. Security 10/10, verify 17/17. Next: NG-001.
- **NG-001 / A0006**: NET-GATE dossier is honest (2 of 10 criteria met). Director said "je signe tout" — recorded
  verbatim as **`signed-with-risk`, NOT passed**; `--assert-ready` still exits 1 (8 unmet). No agent merged PR #1/#2
  and no art was produced. Next: PR-S1 (P2-SYS greybox). Re-measurement of the 8 criteria remains owed.
- **PR-S1 landed**: greybox combat math (4 hits, 11-tick cycle, 36-tick / 1200 ms TTK, 8-tick hit-stop), integer
  ticks, illegal windows refused. Full 146/146, verify 17/17. Not a playtest or FUN proof. Next: PR-S2. Art still
  blocked by GATE:P2 and no GPU/TPU (ND-012).
- **PR-S2 landed**: immutable facts, FNV propagation and a T2 verdict naming failed requirements; 5 facts / 2
  strata / 30 captures, two clients agreeing on `{factIds, variantIds, epoch}`. Full 154/154, verify 17/17.
  Not a T2 sign-off. Next: GB-001 greybox Oakhollow.
- **GB-001 landed**: Oakhollow greybox ×3 strata, capsules/boxes only, 3 PR-S2 variant swaps, checksum
  `06d8d93c`. `validate-scene-budget.mjs` is real and fail-closed (`--parity` still exits 1, WG-001). Verify
  17/17. No art, no GPU/TPU. Next: PR-S4 (crafting cycle detection).
- **PR-S4 landed**: bigint minor-unit crafting graph with named infinite-profit cycle detection (script ->
  bundle:replicate -> script). Full 161/161, verify 17/17. Not ECON-001. Next: PR-S5 (1000 bots x 30 days),
  still CPU-only and with no art.
- **PR-S5 landed**: 1000 bots × 720 epochs, exact minor-unit accounting, Gini 0.080768 recorded. **Inflation
  7 264,78 % FAILS the 5 % target** and is flagged TUNABLE, not retuned to pass. Full 166/166, verify 17/17.
  Next: PR-S7 (world tick + bounded Rouille cascade).
- **TOOL-FIXALL / A0007**: Director said "fix all problems n limits". B9 rejects new false-pass accs,
  `pnpm verify` is **19/19** (dashboard + journal steps), `docs/state/JOURNAL.md` is generated, Playwright is
  pinned to 0.0.85, lock validator accepts gate ids. Remaining limits need hardware, Director actions or
  measured checkpoints (SEC-002, economy retune), not an assertion change.
- **SEC-002 fixed**: every room socket frame goes through `MessageGate` before the room; malformed refused,
  valid admitted. Rooms 18/18, verify 19/19. Next: measured economy retune; hardware/Director limits remain.
- **ECON-RETUNE fixed**: named proportional stabilization sink took inflation from 7 264,78 % to 5,00 % with
  Gini 0,293701 in band; before/after and the rejected Gini-0,90 levy are recorded. Verify 19/19. Remaining
  limits need hardware, Director actions or NET-GATE measurements.
- **PR #1 merged by the Director** (`096fdfe`) with recorded admin review bypass. **PR-N2 landed**: 6 clients →
  3 rooms, 2 exact resumes, 3 teardowns; `GATE:P2NET` satisfied. Full 169/169, verify 19/19. Next: PR-S7.
- **PR-S7 landed**: bounded Rouille cascade (12 ticks, fan-out 2), 12 facts / 12 erases, no double erase,
  deterministic; GDD-WORLD-SIM STUB -> DRAFT. Full 173/173, verify 19/19. Next: PR-S8.
- **PR-S8 landed**: 10k anim fuzz, 0 mutations on refusal, 833 server hit frames, deterministic;
  GDD-ANIM-ARCHITECTURE 0.5; AN-002 unblocked. Full 175/175, verify 19/19. Next: PR-S3.
- **Long-term quality doctrine (A0008)**: Director named an Ashes-of-Creation-class quality bar **as a benchmark
  only** — I11 forbids copying that commercial IP. Quality over time: server truth before visuals, evidence over
  adjectives, audited stack, vertical slice before scale, no silent gate bypass. Failing numbers stay recorded.
- **PR-S3 landed**: fact-derived quests, 2 distinct player fact ids, delayed effects at fact_tick+9, 243 states,
  6 FR/EN keys with 0 untranslated; GDD-QUEST 0.3. Full 180/180, verify 19/19. Next: PR-S6.
- **PR-S6 landed**: faction standing derived from 1 000 immutable facts, replay-exact; GDD-FACTION 0.2 DRAFT.
  **GATE:P2SYS satisfied.** Full 185/185, verify 19/19. Next: HC-003, then GDD-005 for GATE:P2.
- **HC-003 landed**: two-client 900-tick replay with equal hashes, 6 captures, CIS **85/100** measured from
  `concept.json`; wow density 0 (no playtest). Full 188/188, verify 19/19. GATE:P2 now waits on GDD-005 only.
- **GDD-005 landed**: real GDD→test transpiler, 17 structural drift specs, coverage 100%; injected drift fails
  closed. GATE:P2 work-side complete — Director signatures for GATE:P2/GATE:NET remain. NET-GATE still
  signed-with-risk with 8 unmet criteria; no art.
- **Live room endpoint wired**: main.ts serves rooms on 8788 through `attachRooms`/MessageGate, 30 Hz tick,
  real loopback test proving welcome/reject. Full 302/302, verify 19/19. No agent-selectable task remains:
  GATE:P2 and GATE:NET need Director signatures; NET-GATE still signed-with-risk.
- **GATE:P2 SIGNED; GATE:NET SIGNED — RISK ACCEPTED** (A0009, Director "je signe tous"). CIS 85, coverage 100%;
  the 8 unmet NET-GATE criteria remain measured as unmet. No art before a real re-measurement. No agent-selectable
  task left: merges, tokens, T4 and hardware decisions are Director acts.
- **PRs handled by the Director**: PR #2 closed unmerged, PR #3 merged into `main` at `a84733e` (1 032 files).
  Default branch is still the session branch. Remaining: token rotation, T4, TPU scope and 8 NET-GATE measurements.
- **Protocol v5 / target-tick input contract landed**: intents carry `targetTick` (u32) between `seq` and `dx` — `INTENT_BYTES` 15, v4 peers refused (supported range exactly 5..5). Rooms drop past-arrival intents and count them (`late_intents`), refuse targets more than 64 ticks ahead, and buffer the rest; buffered intents are submitted before the host advances, in (targetTick, entity, seq) order. Client predictor gained `schedule(seq, dx, dz, targetTick)` and `advanceTo(tick)`; `reconcile()` replays unacked intents at their original `targetTick`. NET-GATE matrix measurement remains separate; do not read this as matrix-green. Next: the four-client RTT measurement reruns on this contract.
- **GPU handoff**: `docs/state/GPU_HANDOFF.md` is the memory bridge for the new runtime (probes, audited models,
  art contract, the 8 NET-GATE criteria, conventions). GPU arrival does not authorize art: readiness must pass.
- Known intentional red: `scope-math --report` exit 2 (throughput unmeasured) and `concept --score` exit 2
  until HC-003. `concept --check` is green: T3 was signed at GATE:P0.

## 9. Environment

- Node 22.23.4 with pnpm **12.21.0** pinned via corepack (`corepack enable` done); lockfile committed.
  TypeScript 6.0.3, Vitest 5.1.0 — `docs/STACK.lock.md` is authoritative.
- `python3` + PyYAML are available; Blender, ComfyUI and a GPU are **not** on this machine.
- Secrets are read from env only: `GITHUB_TOKEN`, `HF_TOKEN`, `OPENCODE_API_KEY`, `REPO_URL`, `DATABASE_URL`,
  `REDIS_URL`. Never echo them; never put them in a command line that lands in a log.

## 10. Language

Repository artifacts are in **English**. The Director speaks **French**; answer in French, keep the committed text
in English. Player-facing text is FR + EN, and the FR/EN pair is never cut.
