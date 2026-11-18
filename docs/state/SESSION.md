# SESSION STATE

| field | value |
|---|---|
| session | `2026-11-18-s02` (continuation of `s01`, resumed `20261118T072300Z` from a blank Colab runtime) |
| mode | RESUME (`docs/CONSTITUTION.md` exists) |
| branch | `session/20261118-hc-001-high-concept` |
| phase / tier | P1 complete → P2NET next / current `S0`, authorized **`S1`** (GATE:P1 signed 2026-11-18) |
| director | present for bootstrap; async from now |
| last task | NG-001 — NET-GATE dossier; Director signed with risk (A0006) |
| next task | **PR-S1** — combat TTK/windows/hit-stop prototype (greybox) |

## Done this session

| task | outputs | acceptance |
|---|---|---|
| HC-001 | `docs/design/HIGH_CONCEPT.md`, `scripts/concept-integrity.mjs` | `--init` exit 0 |
| SC-001 | `docs/SCOPE.md`, `SCOPE_LEDGER.yaml`, `CONTENT_MATH.yaml`, `scope-math.mjs`, `validate-scope.mjs` | `validate-scope` exit 0 |
| WF-001 | `docs/WORKFLOW.md`, `OWNERSHIP.yaml`, `LOCKS.yaml`, `DISPUTES.md` | ownership map 0 ties |
| P0-001.a | `docs/CONSTITUTION.md`, `docs/archive/SESSION_MASTER_v8.1.md`, `docs/state/PROMPT.lock`, `scripts/validate-prompt-drift.mjs` | `validate-prompt-drift` exit 0 + 8/8 negative tests |
| P0-001.b | `AGENTS.md`, `opencode.json`, `docs/blueprint/BLUEPRINT.yaml` | config validates against the published schema; blueprint parses |
| P0-002.a | `.opencode/agents/` (32), `.opencode/skills/` (51) | 32/32 owners covered, 51/51 skills resolve |
| P0-002.b | `scripts/lib/yaml.mjs`, `scripts/validate-blueprint.mjs`, `docs/blueprint/GATES.yaml`, 21 stubs | validator exit 0 + 6/6 negative tests; 21/21 stubs exit 1 |
| P0-003 | workspace (2 packages, 3 apps, 1 sim lib), `verify`, `STACK.lock.md` | frozen install exit 0; `pnpm verify` 7/7 + 4 negative tests |
| HC-001 (amend) | HIGH_CONCEPT v1.1 → v1.2, T3 signed at GATE:P0 | `concept --init` 0, `--check` 0 |
| WF-002 | `scripts/validate-ownership.mjs`, `scripts/validate-locks.mjs`, `verify` integration | both exit 0; 8/8 negative tests; `verify` 9/9 |
| TRACER-001 | core tracer, protocol, WS server, Babylon client, `pnpm tracer --assert` | assert exit 0; desync exit 1; lint negative 1 |
| P0-004 | 27 workflows, real `scripts/validate-workflows.mjs`, ownership map entry | validator exit 0; 8/8 negatives; `verify` 10/10 |
| P0-005 | `tools/colab/`, `scripts/drill-resume.mjs` | drill exit 0; 7/7 negatives; `verify` 11/11 |
| P0-006 | audit, whitelist, tier probe, `validate-manifest --audit` | validator exit 0; 8/8 negatives; `verify` 12/12 |
| P0-007 | `apps/dashboard/build.mjs`, generated views | build exit 0; 7/7 checks; byte-identical rebuild |
| GATE:P0 | `docs/state/gates/GATE_P0.md` — assembled dossier | 3 drills, 8 green CI runs at final head, all local gates 0 |
| P1-001 | `docs/VISION.md`, real `validate-docs.mjs` | validator 0; 5/5 negatives; `verify` 13/13 |
| GDD-001 | GDD index, 32 STUB modules, `validate-gdd`, `gdd-coverage` | 7/7 negatives; 14 critical modules; `verify` 15/15 |
| GDD-002 | six DRAFT modules with 19 fields + sourced numbers | 10/10 negatives; validator 0; `verify` 15/15 |
| GDD-003 | five concept modules to DRAFT, T2/T4 enforced | 12/12 negatives; validator 0; `verify` 15/15 |
| GDD-004 | four modules + economy tables, critical closure | 13/13 negatives; critical 0; `verify` 15/15 |
| P1-002 | `WORLD_BIBLE.md`, FR/EN glossary, real `validate-lore.mjs` | 5/5 negatives; 167 globs 0 ties; `verify` 16/16 |
| P1-003 | `ART_BIBLE.md`, A0001, real `validate-art-bible.mjs` | 6/6 negatives; 168 globs 0 ties; `verify` 17/17 |
| P1-004 | 3 specs + 3 TDDs, extended `validate-docs.mjs` | 8/8 negatives; `verify` 17/17 |
| P0-005.a | resume prompt sentinel + drift §7 + 4 new negatives; `state/locks` registry branch created | 12/12 negatives; drift 0; `verify` 17/17 |
| GATE:P1 | Director signature recorded; `authorized_tier: S1`, GATES.yaml regenerated | `validate-blueprint` 0; `verify` 17/17 |
| NET-001 | core tick, hash ring, headless `SimHost`; GDD-NETCODE 0.3; NET-001 acc repaired | core 19/19 · server 8/8 · `verify` 17/17 · tracer 0 |
| NET-002 | binary v2 frames, handshake, `ProtocolError`; GDD-NETCODE 0.4; NET-002 acc repaired | protocol 23/23 · full 51/51 · `verify` 17/17 · 1 551 B max frame |
| NET-005 | anim state machine in core, clip manifest + JSON schema; GDD-ANIM-ARCHITECTURE 0.3 | anim 22/22 · full 73/73 · `verify` 17/17 · 12 B anim_state |
| P0-002 (D146) | real `scripts/session-result.mjs`, structured `result` block in metrics | short 0 · full 0 · negative 1 · `verify` 17/17 |
| NET-003 | rooms, resume handles, `ws` adapter, GDD-SHARDING 0.3, A0004 | rooms 17/17 · server 25/25 · full 90/90 · `verify` 17/17 |
| NET-004 | client hash timeline, predictor, interpolation, GDD-NETCODE 0.5 | net 15/15 · full 105/105 · `verify` 17/17 |
| NET-006 | wire v3 anim/resync frames, server-owned hits, jitter, GDD 0.4/0.6, A0005 | anim 5/5 · combat 7/7 · jitter 5/5 · full 122/122 |
| PR-N1 | local load harness, PRN1 report, acc repaired | harness 3/3 · full 125/125 · local p95 0.2109 ms · 46 530 B/s |
| PR-N3 | bigint zero-sum ledger, idempotency, checksum restore, GDD 0.3/0.3 | fuzz 7/7 · full 132/132 · drift 0 · 10k tx |
| PR-N4 | rewind ring, integer LOS/range/cooldown, GDD-NETCODE 0.7 | lagcomp 10/10 · full 142/142 · 30 shots |
| SEC-001 | message gate, rate limit, GM audit, threat model, GDD-SECURITY 0.3 | security 10/10 · full 142/142 · 30/200 admitted |
| NG-001 | honest NET-GATE dossier + real validator; A0006 signature | integrity 0 · readiness 1 · tamper 1 · FULL 0 |

**P0-001 and P0-002 were split** although only P0-001 triggered B8: the halves fail for different reasons and
deserve separate rollback points. Commits: `094f31f`, `bd6f550` (P0-001); `1ceaf20`, `7e9d382` (P0-002).
**P0-003 triggers B8 but landed as one commit**: a workspace without its packages cannot typecheck, and a
skeleton without `verify` cannot pass. The B8 warning stays; the reason is in the journal.

## The master prompt is sealed

- Transcribed verbatim under explicit Director authorization to `tools/colab/prompts/SESSION_MASTER.md`.
- 99 289 bytes (< 100 000), 953 lines, last line `<<<STRATA_END v8.1>>>`.
- `sha256 = 91dd8ab5d336589e97c8128c9175b1752a5842c961deb0b396428c6b3f58b615`, recorded in `PROMPT.lock`,
  copied byte-identically to `docs/archive/SESSION_MASTER_v8.1.md`.
- **Ownership exception, recorded not hidden:** `tools/**` belongs to tools-engineer. The transcription was a
  Director-authorized bootstrap act before P0-002 exists; it is logged in `docs/state/threads/P0-001/`.

## Blueprint facts (parsed, then validated)

63 tasks, 11 gates, 9 phases, 0 duplicate ids, 0 task missing a required field. `validate-blueprint.mjs`
enforces B1–B8 and passes with **0 errors, 12 declared warnings**: 3 scaffold exemptions (§4.2),
the B3 deferral, the B4/B5 deferral (32 non-P0 tasks), and 7 B8 splits. D-002 was closed by A0002 and no
longer produces a refusal warning. A warning is not a pass; each carries its reason. `docs/blueprint/GATES.yaml` is generated by `--emit-gates`, never hand-edited.

## Agents and skills

32 agent files, one per owner in `docs/state/OWNERSHIP.yaml`, each carrying its exact globs, boundary,
escalation path and primary skill. `code-reviewer` is denied edit. The 51 skills are **declared stubs** with
`opencode/autoinvoke: false` — the vocabulary exists so no task is blocked (§16), but no stub pretends to
know a procedure. The weekly retro replaces them (§18).

## Stubs that fail on purpose

21 validators referenced by a task `acc` exist as stubs that print `NOT IMPLEMENTED` and exit 1. Verified
21/21. Acceptance can therefore never pass by omission. B7 counts a stub as a warning and a missing script as
an error. The two disputed files (`validate-ownership.mjs`, `validate-locks.mjs`) no longer name a dispute:
their banners record the new owner (orchestrator) after A0002.

## Director blockers — 2026-11-18

- **ND-001 RESOLVED.** T1 EN is 25/25, FR 30/35; FINDING-001 and CD-001 closed. The already-published
  25-word candidate was adopted as HIGH_CONCEPT v1.1; the limit itself was not weakened.
- **ND-002 RESOLVED.** ADR A0002 option A was accepted; D-002 is RESOLVED, WF-002 runs as orchestrator,
  and `validate-blueprint.mjs` now reports 12 warnings instead of 13 (no refusal).
- **ND-003 DEFERRED.** Private on the personal account is the recommendation until GATE:P0; nothing in
  P0-004 or TRACER-001 is blocked by it.
- **ND-004 / ND-005 OPEN.** Rotating the GitHub PAT and HF token requires the Director's account access.
- **ND-006 / ND-007 RESOLVED** as REJECTED with fallbacks (Director instruction to resolve every blocked
  item); **ND-008 RESOLVED — REVERSED** on new evidence: ActionForge's own notices grant CC0 output rights,
  so it is approved with conditions. No licence was waived by code.
- **ND-009 RESOLVED — option A applied.** ADR-A0003 declares the full-MMORPG long-term vision via the
  sealed-master amendment escape hatch (`PROMPT.lock amended: [ADR-A0003]` + `## AMENDMENTS`). The P0
  vertical slice, tier, ledger, tasks and gates are unchanged. Drift and concept gates exit 0.
- GATE:P0 is **SIGNED** by recorded Director decision ("prends toutes les bonnes decisions"), transcribed in
  `docs/state/gates/GATE_P0.md` with the dependency-review exception accepted. No agent claimed the
  signature as its own. P1 work flows from that decision.
  A prefix scan found 0 token strings in `.git` or the tracked worktree. The agent cannot close these.

Details, options and evidence: `docs/state/NEEDS_DIRECTOR.md` and
`docs/state/evidence/20261118T004835Z-DIRECTOR-RESOLUTIONS/`.

## Known red (intentional)

- `scope-math --report` exit 2 — throughput unmeasured by design.
- All implemented validators are real and enabled in `verify`; **14 declared stubs** remain, all failing by
  design. `pnpm verify` now runs **15 steps**.

## Config reality

`opencode.json` names the four MCP servers required by §16; all four endpoints were probed this session.
`playwright` runs through `npx -y @playwright/mcp` — **unpinned**, and §10.6 forbids unpinned tooling. No
blueprint task currently owns the pin: recorded as a gap for the Director/next release task, not guessed away.

## Carried state

- Repo `github.com/Ggboykxz/strata`, **public since 2026-11-18** (Director decision, ND-003), default branch
  `main` still empty (root commit `36bd9af`) — **the Director must merge PR #1** for the landing page to show
  the project. No self-merge was performed. README + Apache-2.0 LICENSE + NOTICE landed before the flip;
  unauthenticated API/raw reads return HTTP 200.
- PR #1 is draft and stacked; P0-002 is pushed on the same branch (`7e9d382`).
- `corepack enable` is done; pnpm is pinned to **12.21.0** and the lockfile is committed.
- `pnpm verify` (**12 steps**, fail-fast) is the only entry point. It prints DEFERRED for determinism replay,
  GDD coverage and the 17 stubs; none of those counts as green.
- AI models are gated by `docs/legal/AI_MODEL_AUDIT.md` + `tools/asset-pipeline/whitelist.yaml`: 9 approved,
  0 blocked, 11 rejected — each rejection has a recorded fallback. No model downloaded or run (I4).
- 27 GitHub Actions workflows exist under `.github/workflows/`; 80 `uses:` entries are SHA-pinned. **No job
  has run yet** — acceptance was static. The first real CI result after this push is new evidence, not an
  assumption. 12 workflows calling declared stubs are manual-only.
- `scripts/validate-workflows.mjs` is release-engineer-owned by WORKFLOW.md §6; the explicit map entry was
  added before the handoff (165 globs, 0 ties). The D-002 class of conflict is now caught before it starts.
- TRACER-001 is green: 1 capsule, fixed 30 Hz authoritative tick, two reconciled replicas with equal FNV-1a
  hashes, Babylon NullEngine render in CI. `pnpm tracer --assert` exists; forcing a desync makes it exit 1.
- Babylon **9.37.0 (Apache-2.0)** and `ws` **8.23.0 (MIT)** are pinned in `STACK.lock.md`. NullEngine is
  tooling/CI only and is never imported by the server tick (I3). NET-GATE is still unpassed — greybox only.
- The glob compiler is duplicated between `validate-blueprint.mjs` B2 and `validate-ownership.mjs`;
  consolidating it into `scripts/lib/ownership.mjs` is a tools-engineer handoff recorded in the thread.
- TypeScript is pinned to **6.0.3** because 7.x ships the native compiler without the JS AST API the
  core-math lint needs. Recorded in `docs/STACK.lock.md`.
- The Director's PAT is still the only push path and still needs rotation (ND-004) — now more urgent: the
  repo is public while the token remains live. ND-005 (HF token) is also open.
- `scripts/scope-math.mjs` carries an older duplicate YAML parser; unifying it with `scripts/lib/yaml.mjs`
  is a producer handoff, recorded in the P0-002 journal and thread.

## Session 2 (2026-11-18T07:23Z) — recovery, then one repair

- **Fresh runtime, no WIP to recover.** The machine came up blank: no repository, no `docs/CONSTITUTION.md`.
  Recovery was a plain `git clone` of the public repo plus `corepack prepare pnpm@12.21.0 --activate`; the
  baseline was green on the first try (`pnpm verify` 17/17) and no work was lost — the branch head was still
  `ff7ae92`.
- **The resume prompt was invalid by construction.** The Director's session-2 prompt ended on the sentinel
  followed by a URL and a live PAT on the same line; a strict session must reject it. The cause was in the
  repo: `SESSION_RESUME.md` had no sentinel and `validate-prompt-drift.mjs` did not check it. P0-005.a fixed
  both (12/12 negatives, drift 0, verify 17/17). The pasted text was **not** copied into the repo: its
  provenance is unverifiable and it carried a token.
- **`state/locks` did not exist**, so §4.3 was unimplementable and `validate-locks.mjs` could never see an
  acquisition. The branch was created from the empty `main` root; P0-005.a acquired its three globs in one
  sorted commit and released them after the evidence run. `task_id` had to be the blueprinted `P0-005`: the
  validator resolves ids against `BLUEPRINT.yaml`, so `.a` sub-labels cannot be lock keys.
- **Still Director-only:** GATE:P1 signature (tier S1), ND-004/ND-005 rotation, and the PR #1 merge.

## Session 2 — S1 opens (2026-11-18T08:05Z)

- **GATE:P1 signed → S1.** `authorized_tier: S1`, `GATES.yaml` regenerated. `current_tier` stays `S0` because
  `validate-blueprint` B6 computes a grant as `current + 1`; raising both reads as S1→S1 and fails.
- **NET-001 done.** `packages/core/src/tick.ts` is the world: integer millimetres, canonical `(entity, seq)`
  ordering, a bounded `(tick → hash)` ring compared **at the acked tick**, and a range contract that throws
  instead of truncating. `apps/server/src/sim/host.ts` is the headless host — no socket, no clock, no Babylon.
  GDD-NETCODE 0.2 → 0.3 in the same PR (I9). Core 19/19, server 8/8, full 29/29, verify 17/17, tracer green.
- **Defect logged, not hidden.** The blueprint's acceptance `pnpm test --filter @strata/core` is invalid:
  vitest has no `--filter`, exit 1. Repaired for NET-001; **11 other accs still carry it**. The inverse form
  `pnpm --filter <pkg> test` exits 0 with no tests when the package has no `test` script — a silent false pass.
  A follow-up task must convert all of them and add a B-series rule.
- **Still Director-only:** ND-004/ND-005 rotation, PR #1 merge.

## Session 2 — NET-002 (2026-11-18T08:34Z)

- **Wire v2.** Six frame classes, fixed little-endian, exact lengths. A trailing byte is a rejected frame,
  not padding; a version outside 2..2 is answered with `reject`, never coerced. `hash` crosses as u32 and
  `hashToU32` refuses anything that is not 8 lowercase hex chars.
- **Measured, then stated.** A 64-entity snapshot is **1 551 B** = **46 530 B/s** at 30 Hz, **3.9× over** the
  12 KB/s budget. The codec is correctness-only; NET-101 owns AoI + delta. No average is used to hide it.
- **Two doc/tooling defects fixed.** NET-002's own acc was the broken `pnpm test --filter` form; repaired.
  `NEEDS_DIRECTOR.md` had ND-010's SIGNED block under ND-004, making token rotation look resolved — ND-004 is
  OPEN again. Remaining broken accs: **11**, re-measured (the earlier "11" was one short).
- **Hardware.** The Director declared TPU v5e-1 + T4. T4 is already the sourced 16 GB tier; TPU has no audited
  generation path, so the CPU-safe policy is correct there. Recorded as ND-011, not guessed into the pipeline.
- **Still Director-only:** ND-004/ND-005 rotation, PR #1 merge.

## Session 2 — NET-005 and the dashboard question (2026-11-18T08:56Z)

- **NET-005 done.** `packages/core/src/anim-state/` is server-authoritative and tick-driven: 5 states,
  2-tick blend, 3-tick recovery, requests during ACTION refused `busy`, requests during RECOVERY queued to
  the last tick, ties by smallest `(sequence, clipId)`. The clip manifest is validated on load and the
  published JSON Schema is asserted to match the code. GDD-ANIM-ARCHITECTURE 0.2 → 0.3.
- **A "repair" that was a false pass.** `pnpm test --filter … -t animstate` fails; changing only the flag to
  `pnpm vitest run packages/core -t animstate` exits **0 while skipping all 41 tests**. The acc now names the
  test file. An acceptance command must name a path, or a `-t` pattern proven to match.
- **Dashboard (Director question).** The P0-007 generator built but lied: `gdd.modules = 0`, "GDD-001 not
  started", HC v1.2, manual "tracer green", and 12 real values hidden by stale metric keys. Repaired on a
  **separate branch, PR #2** (`session/20261118-dashboard-truth`, base = session branch), with its own locks
  and evidence: build 0, truth check 0, negative check **1**, verify 17/17, Actions 8/8. It is truthful but
  still static (no hydrator, no server).
- **Still Director-only:** ND-004/ND-005 rotation, PR #1 merge. ND-011 (TPU scope) awaiting one answer.

## Session 2 — D146 closed (2026-11-18T09:10Z)

- `scripts/session-result.mjs` is no longer a stub. It generates the §20 SHORT and FULL results entirely
  from `docs/state/metrics/2026-11-18-s02.json`, including a new structured `result` block for the fields
  that were not numeric sources. Missing required fields exit 1; two runs are byte-identical.
- The stale metrics note "this result was composed by hand" is replaced by a D146-satisfied note.
- `pnpm verify` remains **17/17**; the stub simply disappears from the deferred list.

## Session 2 — NET-003 (2026-11-18T09:24Z)

- **A0004 accepted.** The Director said "bypass pin colyseus". NET-003 runs on `ws` 8.23.0, already pinned and
  audited: **no dependency added, no lockfile change**. The stale `STACK.lock.md` line stays as a record.
- Rooms are transport-agnostic; `ws-adapter.ts` is the only `ws` boundary. Handles are FNV-1a tamper detectors,
  **not credentials** (SEC-001 owns auth). Resume sends a snapshot and never replays intents server-side.
- **Defect fixed:** a replayed seq was silently dropped at tick time by `SimHost`; `Room` now refuses it at
  ingress with a reason event. GDD-SHARDING 0.2 → 0.3; NET-003 acc repaired to a file path (9 remain broken).
- Rooms 17/17, server 25/25, full 90/90, verify 17/17, tracer green. No `main.ts` wiring: the adapter is
  exported for a later task.
- D146 remains satisfied: the generator was re-run against the new metrics (60 commands, 8 evidence dirs).

## Session 2 — NET-004 (2026-11-18T09:17Z)

- The client predicts with the same `stepWorld`, compares hashes **at the snapshot tick**, adopts the server
  state exactly and replays only intents with seq above the entity's `appliedSeq`. A mismatch is a `desync`:
  rejected, pending cleared, resync requested — never silently reconciled (I1/GDD §4.3).
- `packages/core/src/hash.ts` is the client mirror of the server `HashRing`; interpolation is integer-only and
  presentation-only. GDD-NETCODE 0.4 → 0.5, including its corrupted open-questions table.
- NET 15/15, full 105/105, verify 17/17, tracer green. NET-004 acc repaired to a file path; 8 remain broken.
- Generator re-ran against the new metrics. No GPU/TPU needed; current runtime has neither.

## Session 2 — NET-006 (2026-11-18T09:44Z)

- **A0005 accepted.** Director: "bypass les limites et go next". The three NET-004 deferrals are folded in:
  wire v3 `anim`/`resync` frames (v2 peers refused), 3..8-tick jitter buffer, and a local measurement harness
  checkpointed as PR-N1. Invariants, NET-GATE, Director-only actions and evidence-only were **not** bypassed.
- Anim state on the wire is 17 bytes (12 + 5 overhead); a resync request is 10 bytes. The server validates every
  transition and owns hit frames; a client hit claim is ignored. Jitter is presentation-only and tracks the
  observed snapshot gap.
- Three defects fixed: room handshake hardcoded v2 bounds; jitter test expectations contradicted the buffer's
  real behaviour; A0005 lacked the D2 headings. Verify is green again.
- Full suite **122/122**, verify 17/17, tracer green. NET-006 acc repaired to three test paths; 7 remain broken.
- Jitter bounds are tunables, **not** measured RTT. Tick CPU p95 and byte rates belong to PR-N1.

## Session 2 — PR-N1 closes A0005 (2026-11-18T10:00Z)

- The local harness measures the server's real tick path: 180 ticks, 64 entities, local CPU p50 **0.1625 ms** /
  p95 **0.2109 ms**, full snapshot 1 551 B → 46 530 B/s = **3.79x** the 12 KB/s budget.
- Explicitly **not network RTT**, **not a 30-minute soak**. A second run gave p95 0.761 ms — CPU timing is noisy,
  byte figures are exact. `server_tick_p95_ms` in metrics stays `NOT COMPUTABLE` on purpose.
- `pnpm sim prn1 --assert` could never run (no `sim` script); acc repaired to the vitest command (eighth broken
  form). Full 125/125, verify 17/17. Generator re-run against the new metrics.
- All three NET-004 deferrals are now closed: resync frame, jitter buffer, measured local numbers.

## Session 2 — PR-N3 (2026-11-18T10:05Z)

- `packages/core/src/ledger/` is a zero-sum bigint minor-unit ledger (D150): one entry moves an amount from
  debit to credit. Idempotency keys map to payload hashes; identical replay is `duplicate`, changed payload
  is `conflict` with no overwrite. Checkpoint restore replays the log and hard-fails on mismatch.
- Fuzz: **10 000** transactions, 0 refused, 1 000 duplicates deduped, 1 conflict, drift **0** minor units,
  0 reposts after restore. Full suite 132/132, verify 17/17, tracer green.
- `pnpm sim prn3 --assert` could never run (no `sim` script); acc repaired (ninth broken form). GDD-PERSISTENCE
  0.3 and GDD-TRADE 0.3, both corrupted open-questions tables repaired. 7 `pnpm test --filter` accs remain.
- Local structural fuzz only: no database, no multi-process concurrency, no RPO promise. No GPU/TPU needed.

## Session 2 — PR-N4 (2026-11-18T10:10Z)

- A 31-frame tick→world ring rewinds to the shooter's tick; outside the ring a shot is `stale-shot`, not an
  approximation. Range is bigint squared distance (no `Math.sqrt`), LOS an integer Bresenham walk over 1 000 mm
  cells, cooldown per shooter in ticks. The client's `claimed` flag is ignored (I1/I3).
- Local fuzz: 30 shots → 4 hits, 16 cooldown, 5 blocked, 4 out-of-range, 1 stale; verdict sequence deterministic.
  Test 10/10, full 142/142, verify 17/17.
- `pnpm sim prn4 --assert` could never run (no `sim` script); acc repaired (tenth broken form). GDD-NETCODE 0.7.
  7 `pnpm test --filter` accs remain.
- Not a loss matrix, not RTT, not a soak; range and cooldown stay tunables until PR-S1.

## Session 2 — SEC-001 closes P2NET (2026-11-18T10:18Z)

- Ingress gate rejects malformed bytes, client snapshots, wrong versions, unknown kinds and non-monotonic seq
  with **counted reason codes**. 200-message burst → exactly 30 admitted, 170 `RATE_LIMIT`. GM actions require a
  reason; accepted entries are frozen and FNV-1a hashed.
- `docs/legal/THREAT_MODEL.md` names seven residual risks verbatim: no auth, no TLS, **gate not wired into
  `attachRooms`**, in-memory counters only, no socket flood test, retention is OPS-001, no statistical anti-cheat.
  GDD-SECURITY therefore does **not** claim "0 unvalidated message paths".
- `pnpm test --filter @strata/security` could never run (`CACError`); acc repaired to a dedicated vitest config
  under `tests/security/`. Eleventh broken form; 7 `pnpm test --filter` accs remain.
- Security 10/10, main suite 142/142, verify 17/17. GATE:P2NET is now satisfied; NG-001 is selectable.

## Session 2 — NG-001 and the blanket Director signature (2026-11-18T10:44Z)

- The NET-GATE dossier carries all 10 master §5.2 criteria honestly: **2 met, 8 not-measured/partial/failing**.
  `validate-netgate.mjs` checks dossier integrity (exit 0) while `--assert-ready` exits **1** — a validator pass
  is not a gate pass. Injecting `wire-budget: met` makes the validator fail closed.
- **The Director said "je signe tout"**, transcribed verbatim in A0006, `NET_GATE.md` §6 and `GATE_NET.md`.
  Recorded as **`signed-with-risk`, not passed**: no criterion, measurement or unmeasured field was changed.
- PR #1 and PR #2 were **not merged** — an agent must not self-merge; the Director must do it from their account.
  No art was produced. Art is allowed only by risk acceptance, with the seven residual risks still attached.
- FULL §20 result emitted. Next: PR-S1 (P2-SYS greybox), with re-measurement of the 8 criteria still owed.

## Session 2 — art handoff / hardware request (2026-11-18T11:00Z)

- Director: "gère l'art et go next" — recorded verbatim in `docs/state/ART_HANDOFF.md` and ND-012.
- **No asset generated.** No GPU and no TPU in this runtime; a T4 16 GB is requested for AI-001. TPU v5e-1 is
  not a generation device (ND-011). Nine models are audited; none was downloaded or run (I4).
- AI-001..AN-002 remain blocked by `GATE:P2` (P2-SYS + HC-003 + GDD-005), not just by hardware. A risk-accepted
  NET-GATE signature does not satisfy blueprint deps or create measurements.
- Next task stays PR-S1 (P2-SYS greybox). CPU-safe policy applies.

## Session 2 — PR-S1 greybox combat (2026-11-18T11:14Z)

- PR-S1 delivered integer combat math: 100 HP / 25 damage → 4 hits, 11-tick cycle, **36 ticks = 1 200 ms** TTK,
  8-tick hit-stop. Illegal windows refused, never clamped. Report explicitly says not a playtest or FUN proof.
- GDD-COMBAT 0.3; acc repaired to a real vitest command (twelfth broken form). Full 146/146, verify 17/17.
- The art handoff stands: no asset generated, T4 16 GB requested (ND-012), AI-001..AN-002 still blocked by
  `GATE:P2`. Next: PR-S2 (consequence propagation).

## Session 2 — PR-S2 propagation (2026-11-18T11:34Z)

- `packages/world-state/` holds an immutable fact log, FNV-1a derivation and a T2 verdict that names failed
  requirements. Script: 5 facts in window, 1 late excluded, 2 strata, 5 swaps, 30 captures, two clients agreeing
  on `{factIds, variantIds, epoch}`. Deterministic pass.
- Two test defects fixed: client id excluded from agreement comparison; test script spans 2+ strata. Acc repaired
  (thirteenth broken form), GDD-CONSEQUENCE 0.3. Full 154/154, verify 17/17.
- Not a T2 sign-off: GB-001 and PR-S3 own geometry, captures and replay. No art, no GPU/TPU (ND-012).

## Session 2 — GB-001 greybox Oakhollow (2026-11-18T12:02Z)

- `apps/game/levels/greybox/oakhollow/manifest.json`: 3 strata, 12 capsule/box primitives, 3 physical variant
  swaps from PR-S2 `variant_id`. `scripts/validate-scene-budget.mjs` is no longer a stub: `--greybox` exits 0 with
  checksum `06d8d93c`; `--parity` (WG-001), no flag and an injected `mesh` field each exit 1.
- GDD-CONSEQUENCE 0.4. Verify 17/17, tracer green. No Babylon scene, blind-reviewer capture or art.
- Art tasks remain blocked by GATE:P2 and no GPU/TPU (ND-012). Next: PR-S4 (crafting cycle detection).

## Session 2 — PR-S4 economy prototype (2026-11-18T12:32Z)

- Minor-unit crafting graph with deterministic FNV kind values. Bellman-Ford detection names the positive cycle
  `script -> bundle:replicate -> script` and its gain instead of hiding it. 3 recipes, 6 crafts, exact bigint
  inventory 17 172 minor units.
- GDD-CRAFT 0.3; acc repaired (fourteenth broken form). Full 161/161, verify 17/17.
- Not ECON-001: no bots, no 30 days, no inflation/Gini, no art, no GPU/TPU (ND-012). Next: PR-S5.

## Session 2 — PR-S5 economy run (2026-11-18T12:54Z)

- 1000 bots × 30 days as 720 hourly epochs, exact bigint accounting: minted 396 540 940 − burned 322 893 108 =
  73 647 832, zero negative balances. Deterministic checksum `080bf7af`.
- **Inflation 7 264,78 % FAILS the 5 % target** — flagged TUNABLE per GDD §8.4, not silently retuned. Gini
  0,080768 recorded only. A value-printing cycle was detected and named.
- GDD-ECONOMY 0.3; acc repaired (fifteenth broken form); qa-engineer co-owner declared up front. Full 166/166,
  verify 17/17. No real market/players/network; no art or GPU/TPU (ND-012). Next: PR-S7.

## Session 2 — TOOL-FIXALL / A0007 (2026-11-18T13:24Z)

- Director: "fix all problems n limits" (A0007, verbatim). Fixed repo-side issues: B9 false-pass rejection with
  12 declared legacy offenses, `pnpm verify` **17 → 19** steps (dashboard truth + journal freshness), generated
  `docs/state/JOURNAL.md`, Playwright MCP pinned to `@playwright/mcp@0.0.85`, `validate-locks` accepts gate ids,
  stale Colyseus row corrected, dashboard truth check ported from PR #2.
- Negative tests: injecting a false-pass acc → B9 error; stale journal view → exit 1. Verify 19/19, docs 0 errors.
- **Not fixable by an agent** remains recorded: no GPU/TPU (ND-012), 8 unmeasured NET-GATE criteria, PAT/HF
  rotation and PR merges (Director-only), ND-011, economy retune and SEC-002 wiring (separate checkpoints).

## Session 2 — SEC-002 gate wiring (2026-11-18T13:40Z)

- Director "fix all problems n limits" → residual risk 3 fixed: `attachRooms` routes every frame through
  `MessageGate` before the room. Malformed → `reject`, room hash unchanged; valid v3 hello → `welcome`.
- GDD-SECURITY 0.4, THREAT_MODEL risk 3 rewritten. Rooms 18/18, security 10/10, full 167/167, verify 19/19.
- Still open because an agent cannot fix them: no GPU/TPU, 8 unmeasured NET-GATE criteria, Director-only rotations
  and merges, ND-011. Economy retune is next.

## Session 2 — ECON-RETUNE (2026-11-18T14:00Z)

- Director "fix all problems n limits" → measured economy retune. Named proportional stabilization sink burns
  93 073 815 minor units: inflation **7 264,78 % → 5,00 %**, Gini 0,080768 → 0,293701 (in band). Before/after,
  checksums and a rejected sequential-levy attempt (Gini 0,90) are all recorded.
- GDD-ECONOMY 0.4, ECONOMY_REPORT updated. Test 5/5, full 167/167, verify 19/19.
- Remaining true limits: no GPU/TPU, 8 unmeasured NET-GATE criteria, Director-only rotations/merges, ND-011.

## Session 2 — PR #1 merged + PR-N2 (2026-11-18T15:10Z)

- Director merged PR #1 into `main` (`096fdfe`) with a recorded admin review bypass (self-approval cannot count).
  PR #2 remains open/conflicting; its evidence is already in PR #1.
- PR-N2: deterministic matchmaking 6 → 3 rooms, 2 exact resumes, 1 late refusal, 3 teardowns; id-collision defect
  fixed. GDD-SHARDING 0.4. Full 169/169, verify 19/19. `GATE:P2NET` satisfied.
- Next: PR-S7 (P2-SYS). `GATE:NET` still awaits a formal Director signature; NET-GATE dossier remains
  signed-with-risk with 8 unmet measurement criteria.

## Session 2 — PR-S7 bounded world cascade (2026-11-18T15:55Z)

- 12-node greybox graph, Rouille cascade bounded at 12 ticks with fan-out 2: 12 facts / 12 erases, last active
  tick 10, 9 duplicate-erase refusals, deterministic. No node erased twice.
- GDD-WORLD-SIM promoted STUB -> DRAFT (19 fields, sourced numbers). Test 4/4, full 173/173, verify 19/19.
- No terrain, renderer, art or browser tick measure. Next: PR-S8.

## Session 2 — PR-S8 anim fuzz (2026-11-18T16:35Z)

- 10 000 deterministic requests: 2 500 legal accepted, 7 500 illegal refused with 0 state mutations; 833 server
  hit frames; deterministic. GDD-ANIM-ARCHITECTURE 0.5; AN-002 dependency satisfied.
- Harness defect fixed: event objects were compared to tick numbers, hiding hits. No implementation weakened.
- Full 175/175, verify 19/19. No GLB/motion/art/retarget measure. Next: PR-S3.

## Session 2 — PR-S3 quest prototype (2026-11-18T17:25Z)

- Fact-derived quests: 2 players keep 2 distinct fact ids; 2 delayed effects at fact_tick+9 in another stratum;
  1 text-only refusal; 243 reachable states; 6 FR/EN keys, 0 untranslated; deterministic. GDD-QUEST 0.3.
- Full 180/180, verify 19/19. No renderer, player, browser or art.
- Next: PR-S6, the last P2-SYS task before GATE:P2SYS.

## Session 2 — PR-S6 and GATE:P2SYS (2026-11-18T17:58Z)

- 1 000 immutable faction facts, reputation derived and replay-exact; 4 standing changes, 4 switches, 4 refusals;
  GDD-FACTION promoted STUB -> DRAFT with 19 fields. Full 185/185, verify 19/19.
- **GATE:P2SYS is satisfied.** `GATE:P2` still needs HC-003 and GDD-005; `GATE:NET` still needs a human signature.
- No player, UI, art or balance sign-off; no GPU/TPU. Next: HC-003.

## Session 2 — HC-003 and measured CIS (2026-11-18T18:18Z)

- 900-tick two-client replay: 3 facts / 3 strata, 6 captures, identical fact ids, variant ids, epoch and state hash.
- `concept --score` now exits 0 with **CIS 85/100** from `docs/state/metrics/concept.json`; wow density is **0**
  because no playtest exists (I13). Full 188/188, verify 19/19.
- Fixed a real defect: `concept.json` was selected as the latest session metrics by the dashboard; the builder now
  filters `YYYY-MM-DD-sN.json`. GATE:P2 waits only on GDD-005 and the formal GATE:NET signature.

## Session 2 — GDD-005 transpiler (2026-11-18T18:50Z)

- Declared stub replaced: 17 structural drift specs generated from DRAFT/SIGNED GDD §15; injected acceptance drift
  fails `--check` and names GDD-CORE. Coverage 100% (63/63), verify 19/19.
- Corrected an earlier handoff mislabel: GDD-005 is a transpiler/coverage task, not a GDD signature.
- GATE:P2 work-side complete (P2SYS + HC-003 CIS 85 + GDD-005 100%). Director signatures remain for GATE:P2 and
  GATE:NET; NET-GATE stays signed-with-risk with 8 unmet criteria. No art.

## Session 2 — live room endpoint (2026-11-18T19:24Z)

- Last non-gated backlog item closed: `main.ts` serves rooms on 8788 through `attachRooms` (MessageGate inside),
  ticks them at 30 Hz and leaves the tracer on 8787. Real loopback socket test: valid hello → welcome, malformed
  frame → reject with unchanged hash. Rooms 19/19, full 302/302, verify 19/19.
- No blueprint task is selectable now: GATE:P2 and GATE:NET need human Director signatures; NET-GATE stays
  signed-with-risk with 8 unmet criteria. No art.

## Session 2 — Director signed all gates (2026-11-18T19:45Z)

- Director: "je signe tous" (A0009). `GATE:P2` is SIGNED with measured thresholds (CIS 85 ≥ 50, coverage 100% ≥
  80%, ledger balanced); `GATE:NET` is SIGNED — RISK ACCEPTED with the 8 unmet §5.2 criteria still listed and
  `--assert-ready` still exit 1. No CI disabled, no assertion weakened, no metric changed.
- No agent-selectable blueprint task remains. Next acts are Director merges (PR #2 close, PR #3 merge), ND-004/005
  rotation, ND-011, ND-012 (T4), then a real re-measurement before art. NET-GATE is still not READY.

## Session 2 — Director closed and merged the PRs (2026-11-18T20:07Z)

- Verified through the GitHub API: **PR #2 closed without merging**; **PR #3 merged into `main`** at `a84733e`
  (1 032 files). `main` is no longer the bare root commit.
- Repo default branch is still `session/20261118-hc-001-high-concept`; switching it to `main` remains a Director
  settings action.
- Remaining Director items: ND-004/ND-005 token rotation, ND-011 TPU scope, ND-012 T4 16 GB and the 8 unmeasured
  NET-GATE criteria. No art before a real readiness result (A0008).

## Session 2 — GPU handoff documented (2026-11-18T20:34Z)

- Director: "Documentes tous car je passe sur GPU". Wrote `docs/state/GPU_HANDOFF.md`: state snapshot, T4 probe
  commands and evidence rules, authorized vs blocked on arrival, the 9-model P0-006 whitelist, I11/A0001 art
  contract, the 8 unmet NET-GATE criteria with their closing commands, conventions and a first-session checklist.
- GPU arrival does not authorize generation: NET-GATE readiness still exits 1; art needs a real measurement or a
  Director-signed ADR suspending I2. ND-004/005 rotation still precedes HF use.

## Session 3 — PR-N1 four-client matrix and soak rerun (2026-11-18T16:02Z)

- Branch `session/20261118-prn1-matrix`. Locks acquired in one sorted commit on `state/locks`.
- 24 requested cells (RTT 0/50/150/300 ms × loss 0/2/5 % × jitter 0/30 ms), 4 clients, 64 entities, 360 ticks/cell:
  28,694 verified snapshots, 0 desyncs, 0 integrity failures, correction p95 50 mm / max 450 mm / 0 over 2 m,
  server tick p95 max 0.4411 ms in-process; wire still fails at 3.79× (NET-101).
- Predictor corrected: only the own entity is predictable; snapshot hash is verified; in-flight input is `unknown`,
  never a desync. `apps/game/test/net.test.ts` 22/22. GDD-NETCODE 0.8.
- First 30-minute soak kept 0 desyncs for the full wall clock but died building its report (`Math.max` spread
  overflow, `EXIT=1`); fixed with a reducer and 300k-sample regression test (7/7). Fresh run exited 0 at
  16:31:25Z: 1,800.03 s, 54,001 ticks, 162,586 verified snapshots, 0 desyncs, correction p95 50 mm / max 250 mm,
  server tick p95 0.1632 ms. Four criteria remain unmet; `--assert-ready` still exits 1.
- No art, no model, no GPU/TPU. PR opened but never merged; merge and ND-004/005 rotation are Director acts.
