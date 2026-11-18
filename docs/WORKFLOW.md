# WORKFLOW OS — STRATA

| field | value |
|---|---|
| version | 1.0 |
| owner | orchestrator |
| status | ACTIVE (binding from 2026-11-18) |
| validators | `scripts/validate-ownership.mjs`, `scripts/validate-locks.mjs` (WF-002) |

Conflicts are not avoided by good intentions. They are made **structurally impossible** by
single-writer ownership, git-backed locks, handoffs with contracts, author ≠ reviewer, and a
deterministic arbitration ladder.

---

## 1. OWNERSHIP

Map: `docs/state/OWNERSHIP.yaml`. Rules:

1. **Most specific glob wins.** Specificity = literal characters before the first wildcard. A tie
   between two owners on one path is a **map error**, not a judgement call.
2. **Catch-all stewards:** `docs/**` producer · `apps/**`, `packages/**` gameplay-engineer ·
   `tools/**`, `scripts/**`, root files tools-engineer · `tests/**` qa-engineer. When a new area
   appears, ADD A SPECIFIC ENTRY before editing it.
3. **Append-only zones** — any agent may create NEW files, never rewrite another's:
   `docs/state/threads/**`, `docs/adr/**`, `docs/tdd/**`, `docs/qa/prototypes/**`.
4. **Scaffold exemption** — `P0-002`, `P0-003`, `TRACER-001`, `GDD-001` may create stubs anywhere in
   scope; after creation every file is owned per the map.
5. **A task's `out` paths must lie inside owner(task.agent) ∪ owner(co[]).** Each `co` agent writes
   only its own paths.
6. **Validator ownership:** `scripts/validate-<domain>.mjs` belongs to the agent owning `<domain>`;
   all other `scripts/**` belong to tools-engineer.
7. **code-reviewer is read-only everywhere.** It writes comments, never files.

The orchestrator writes docs and state only. Anything else goes through a HANDOFF.

### Commit attribution (D-wf-001, amendment 1)

Every commit carries a trailer naming the acting agent:

```
Agent: <agent-name>
Task: <task-id>
```

Rationale: when one process wears every hat (P0, before `.opencode/agents/` exists), the commit
trailer is the only authorship record the next writer cannot edit. Threads corroborate it; they do
not constitute it.

### Ties fail

A glob owned by two agents is a **CI failure**, never resolved by seniority, seniority-adjacent
arguments, or the orchestrator's preference. If the map is ambiguous, the map is broken.

### Bootstrap note (2026-11-18)

Files created before this map existed are adopted by their matching owner rather than rewritten:
`.gitignore` → tools-engineer; everything under `docs/state/**` → orchestrator. No re-editing is
required, and no ownership claim is retroactively invalidated.

### Map inconsistency — RESOLVED by A0002 (2026-11-18)

§4.2 gives `scripts/validate-ownership.mjs` and `scripts/validate-locks.mjs` to **orchestrator**, while
WF-002 originally named **tools-engineer**. Under rule 1 the map won, so WF-002 was `refused_ownership`
until the Director resolved D-002.

**Resolution (ADR A0002, option A):** WF-002 runs as **orchestrator**; the two validators are explicit
entries in `OWNERSHIP.yaml` and are the only `scripts/**` paths the orchestrator may write. Rule 6 is
preserved — the validator belongs to the agent who owns the *domain* (`docs/WORKFLOW.md` → orchestrator).
The task line in `BLUEPRINT.yaml` carries a comment citing the amendment. No other task changes owner.

---

## 2. LOCKS — git is the mutex

Registry: `docs/state/LOCKS.yaml` on branch `state/locks` (mirror on `main` is generated, read-only).

**Acquire** = commit the entry on `state/locks` and push **without force**.

```
path_glob, owner_agent, task_id, branch, acquired_at, expires_at, status
```

- Acquire **every** glob of a task in **one** commit, sorted by path — half-locks cause deadlock.
- Push rejected (non-fast-forward) = someone moved first. Pull, re-check, retry, or request a HANDOFF.
- TTL **60 min**; renew by heartbeat every 10 min. The watchdog releases expired locks.
- **Never steal an active lock.** A lock held by a dead session is reclaimed with a JOURNAL entry.
- CI verifies the PR author held every touched lock.

**Current enforcement status:** WF-001 records the registry; `validate-locks.mjs` (WF-002) enforces
it. Until then, every acquisition is still journalled — an unenforced record beats no record.

---

## 3. CEREMONY LEVELS (D133)

Rigor proportional to risk. The orchestrator classifies; **when unsure, go up.**

| level | when | required |
|---|---|---|
| **L0** | one owner, no behavior/scope/concept change (typo, regenerated report) | lock, commit, PR. No thread. |
| **L1** | one owner (+co on own paths) | one PROPOSAL message, code-reviewer, PR |
| **L2** | cross-domain, architecture, scope, concept, license, security, gate | full ACP thread, ≤ 3 rounds, arbitration ladder, ADR if architecture/design changes |

---

## 4. ACP — structured written argument

Directory: `docs/state/threads/<task-id>/` — **one file per message**, plus a generated `THREAD.md`
index. Append-only, so a rebase cannot conflict.

```
## <UTC> | <from> -> <to|all> | <PROPOSAL|CRITIQUE|COUNTER|EVIDENCE|QUESTION|DECISION|HANDOFF|ACK|VETO>

claim:     one sentence
evidence:  paths, metrics, prototype ids, CI runs, GDD refs
impact:    concept_role, scope cost, GDD modules, tier, risk
ask:       the decision or action requested
deadline:  phase/task boundary
```

Rules:
- Every **CRITIQUE** cites evidence or a GDD / Scope / Concept rule. No taste-only objections.
- Every **PROPOSAL** states ledger cost and concept impact.
- **Silence is not agreement.** An ACK is required before a HANDOFF executes.
- Maximum **3** PROPOSAL/CRITIQUE/COUNTER rounds, then arbitration.
- A rejected proposal is never restated without new evidence.
- **DECISION** entries are written only by the orchestrator and mirrored to the JOURNAL.

---

## 5. ARBITRATION LADDER

| level | arbiter | basis |
|---|---|---|
| 1 | domain owner | decides inside their own map |
| 2 | orchestrator | the authority order |
| 3 | evidence | better prototype evidence wins; none → cheaper ≤30 min spike, decide by data |
| 4 | high-concept-guardian | VETO stands unless the Director overrides by ADR |
| 5 | **Director only** | scope, money, licensing, art direction, lore |

Every arbitration → DECISION entry + a line in `docs/production/DISPUTES.md` (+ ADR if
architectural/design). Agents never argue in code comments, commit messages or PR titles.

---

## 6. HANDOFF CONTRACT

```
from, to, task_id,
inputs            paths + versions
expected outputs  paths
acceptance        commands with exit criteria — NO acceptance commands = INVALID, refuse it
constraints       budgets, licenses, tier
deadline, rollback
```

The receiver runs acceptance on delivery. Failure returns the handoff **with evidence**, never with
an opinion.

---

## 7. CEREMONIES

| ceremony | cadence | output |
|---|---|---|
| SESSION STANDUP | start of every session | read JOURNAL tail + open threads + locks; post intent |
| TASK REVIEW | per task | code-reviewer (read-only) + domain owner + guardian concept check |
| GATE REVIEW | per gate | producer dossier, Director signs — never self-approved |
| WEEKLY RETRO | weekly | `retro-improve` mines the JOURNAL, proposes evidence-backed PRs |

---

## 8. MERGE QUEUE

- One PR per task. Branch `session/<date>-<task-id>-<slug>`.
- **Author ≠ reviewer.** The author never merges; the Director merges, in queue order.
- CI must pass: ownership, locks, blueprint/gdd/scope validators, domain tests, determinism replay.
- **Stacked PRs** are allowed (`depends_on: A`); the author rebases after A merges.
- Two PRs touching one path are serialized by the lock registry, not by politeness.

---

## 9. CONDUCT

Stay in your lane; request, never seize. Cheapest experiment beats loudest opinion. Report bad news
immediately — a red number delivered early is an asset. Never hide scope cost. Write for the next
session: your successor is a stranger with amnesia.
